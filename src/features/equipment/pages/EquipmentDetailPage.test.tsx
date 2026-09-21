import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { dayRangeToIso } from '@/lib/format/date-range'
import {
  accessory,
  componentRow,
  counter,
  detail,
  page,
  software,
  transfer,
  validationError,
} from './fixtures'
import { Component } from './EquipmentDetailPage'

const equipmentApi = '/v1/equipment/e1'
const equipmentPath = '/equipment/e1'

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get(equipmentApi, () => HttpResponse.json(detail)),
    http.get('/v1/departments', () => HttpResponse.json([])),
    http.get('/v1/users', () =>
      HttpResponse.json({
        items: [{ id: 'u1', username: 'admin', fullName: 'Quản trị viên' }],
        total: 1,
        page: 1,
        limit: 200,
      }),
    ),
    http.get(`${equipmentApi}/accessories`, () => HttpResponse.json([accessory])),
    http.get(`${equipmentApi}/software`, () => HttpResponse.json([software])),
    http.get(`${equipmentApi}/components`, () => HttpResponse.json([componentRow])),
    http.get(`${equipmentApi}/supplies`, () => HttpResponse.json([])),
    http.get(`${equipmentApi}/supplies/runway`, () =>
      HttpResponse.json({ equipmentId: 'e1', items: [], scope: 'hospital', warehouseIds: [] }),
    ),
    http.get(`${equipmentApi}/counters`, () => HttpResponse.json(page([counter]))),
    http.get(`${equipmentApi}/events`, () => HttpResponse.json(page([]))),
    http.get(`${equipmentApi}/status-history`, () => HttpResponse.json(page([]))),
    http.get(`${equipmentApi}/transfers`, () => HttpResponse.json(page([transfer]))),
    http.get('/v1/repairs', () => HttpResponse.json(page([]))),
    http.get('/v1/maintenance/tasks', () => HttpResponse.json(page([]))),
    http.get('/v1/calibrations/equipment/e1/history', () => HttpResponse.json([])),
    http.get('/v1/audit-logs/entity/equipment/e1', () => HttpResponse.json(page([]))),
    http.get('/v1/attachments', () => HttpResponse.json([])),
  )
})

const render = (tab = '') =>
  renderWithProviders(<Component />, {
    path: '/equipment/:id',
    route: `${equipmentPath}${tab ? `?tab=${tab}` : ''}`,
  })

it('shows component usedPct progress', async () => {
  render('components')
  expect(await screen.findByText('Bơm')).toBeVisible()
  const bar = await screen.findByTestId('usedpct-c1')
  expect(bar).toHaveStyle({ width: '90%' })
})

it('hiện gợi ý trạng thái hợp lệ từ details.allowed', async () => {
  server.use(
    http.post(`${equipmentApi}/status`, async ({ request }) => {
      const body = (await request.json()) as { status?: string; reason?: string }
      if (!body.status || !body.reason) return validationError('status/reason bắt buộc')
      return HttpResponse.json(
        {
          code: 'EQUIPMENT_INVALID_STATUS_TRANSITION',
          message: 'invalid',
          details: { allowed: ['broken'] },
        },
        { status: 400 },
      )
    }),
  )
  render()
  await userEvent.click(await screen.findByRole('button', { name: 'Đổi trạng thái' }))
  await userEvent.type(await screen.findByLabelText('Lý do'), 'Hỏng bơm')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  expect(await screen.findByText(/Trạng thái hợp lệ:/)).toHaveTextContent('Hỏng')
})

it('lưu kết nối gửi PUT rồi làm mới chi tiết', async () => {
  let puts = 0
  let detailGets = 0
  let body: Record<string, unknown> = {}
  server.use(
    http.get(equipmentApi, () => {
      detailGets += 1
      return HttpResponse.json(detail)
    }),
    http.put(`${equipmentApi}/network`, async ({ request }) => {
      const parsed = (await request.json()) as Record<string, unknown>
      if (typeof parsed.lisConnected !== 'boolean')
        return validationError('lisConnected phải là boolean')
      if (typeof parsed.ip === 'string' && !/^\d+\.\d+\.\d+\.\d+$/.test(parsed.ip))
        return validationError('ip không hợp lệ')
      puts += 1
      body = parsed
      return HttpResponse.json({ equipmentId: 'e1', ...parsed })
    }),
  )
  render('network')
  await userEvent.type(await screen.findByLabelText('IP'), '10.0.0.5')
  await userEvent.type(screen.getByLabelText('Ghi chú LIS'), 'Cổng LIS')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu mạng' }))
  await waitFor(() => expect(puts).toBe(1))
  expect(body).toMatchObject({
    ip: '10.0.0.5',
    lisConnected: false,
    lisNote: 'Cổng LIS',
    hostPcSpec: null,
  })
  await waitFor(() => expect(detailGets).toBeGreaterThan(1))
})

it('lưu vật tư gửi chuỗi định mức và hiện nhãn vật tư đã chọn', async () => {
  let body: { supplyId: string; normQtyPerDay: string | null }[] = []
  server.use(
    http.get(`${equipmentApi}/supplies`, () =>
      HttpResponse.json([
        {
          supplyId: 's1',
          normQtyPerDay: null,
          normQtyPerTest: null,
          isPrimary: false,
          notes: null,
        },
      ]),
    ),
    http.get('/v1/supplies', () =>
      HttpResponse.json([{ id: 's2', code: 'VT-2', name: 'Hoá chất' }]),
    ),
    http.put(`${equipmentApi}/supplies`, async ({ request }) => {
      const parsed = (await request.json()) as { supplyId: string; normQtyPerDay: string | null }[]
      if (!Array.isArray(parsed)) return validationError('cần mảng vật tư')
      for (const row of parsed) {
        if (!row.supplyId) return validationError('supplyId bắt buộc')
        if (row.normQtyPerDay != null && !/^\d{1,8}(\.\d{1,4})?$/.test(row.normQtyPerDay))
          return validationError('normQtyPerDay sai định dạng')
      }
      body = parsed
      return HttpResponse.json(parsed)
    }),
  )
  render('supplies')
  await userEvent.type((await screen.findAllByLabelText('Định mức/ngày'))[0]!, '1.5')
  await userEvent.click(screen.getByRole('combobox', { name: 'Thêm vật tư' }))
  await userEvent.click(await screen.findByText('VT-2 — Hoá chất'))
  expect(await screen.findByText('VT-2 — Hoá chất')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Lưu vật tư' }))
  await waitFor(() => expect(body).toHaveLength(2))
  expect(body[0]).toMatchObject({ supplyId: 's1', normQtyPerDay: '1.5' })
  expect(body[1]).toMatchObject({ supplyId: 's2', normQtyPerDay: null })
})

it('sửa và xoá phụ kiện', async () => {
  const patches: unknown[] = []
  const deletes: string[] = []
  server.use(
    http.patch(`${equipmentApi}/accessories/a1`, async ({ request }) => {
      const body = (await request.json()) as { name?: string }
      if ('name' in body && !body.name) return validationError('name bắt buộc')
      patches.push(body)
      return HttpResponse.json({ ...accessory, ...body })
    }),
    http.delete(`${equipmentApi}/accessories/a1`, () => {
      deletes.push('a1')
      return new HttpResponse(null, { status: 204 })
    }),
  )
  render('accessories')
  const section = within(await screen.findByTestId('section-accessories'))
  await userEvent.click(await section.findByRole('button', { name: 'Sửa' }))
  const name = await screen.findByLabelText('Tên')
  await userEvent.clear(name)
  await userEvent.type(name, 'Cáp nguồn mới')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(patches).toHaveLength(1))
  expect(patches[0]).toMatchObject({ name: 'Cáp nguồn mới' })
  await userEvent.click(section.getByRole('button', { name: 'Xoá' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Xác nhận' }))
  await waitFor(() => expect(deletes).toEqual(['a1']))
})

it('sửa, nâng cấp phần mềm và xem lịch sử', async () => {
  const patches: unknown[] = []
  const upgrades: unknown[] = []
  server.use(
    http.patch(`${equipmentApi}/software/s1`, async ({ request }) => {
      patches.push(await request.json())
      return HttpResponse.json({ ...software, version: '1.1' })
    }),
    http.post(`${equipmentApi}/software/s1/upgrade`, async ({ request }) => {
      const body = (await request.json()) as { toVersion?: string }
      if (!body.toVersion) return validationError('toVersion bắt buộc')
      upgrades.push(body)
      return HttpResponse.json({ id: 'h1', toVersion: body.toVersion })
    }),
    http.get(`${equipmentApi}/software/s1/history`, () =>
      HttpResponse.json([
        {
          id: 'h1',
          equipmentId: 'e1',
          softwareId: 's1',
          fromVersion: '1.0',
          toVersion: '1.1',
          changedAt: '2026-09-19T00:00:00Z',
          changedBy: 'u1',
          note: 'Nâng cấp',
        },
      ]),
    ),
  )
  render('software')
  const section = within(await screen.findByTestId('section-software'))
  await userEvent.click(await section.findByRole('button', { name: 'Sửa' }))
  const version = await screen.findByLabelText('Phiên bản')
  await userEvent.clear(version)
  await userEvent.type(version, '1.1')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(patches).toHaveLength(1))
  expect(patches[0]).toMatchObject({ version: '1.1' })

  await userEvent.click(section.getByRole('button', { name: 'Nâng cấp' }))
  const toVersion = await screen.findByLabelText('Phiên bản mới')
  await userEvent.clear(toVersion)
  await userEvent.type(toVersion, '2.0')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(upgrades).toHaveLength(1))
  expect(upgrades[0]).toMatchObject({ toVersion: '2.0' })

  await userEvent.click(section.getByRole('button', { name: 'Lịch sử' }))
  expect(await screen.findByText('Lịch sử nâng cấp · LabOS')).toBeVisible()
  expect(await screen.findByText(/1\.0 →/)).toBeVisible()
})

it('thay linh kiện gửi newSerial/cost/phiếu sửa chữa và xem lịch sử thay', async () => {
  const replacements: unknown[] = []
  server.use(
    http.get('/v1/repairs', () =>
      HttpResponse.json(
        page([{ id: 'r1', code: 'SC-1', description: 'Hỏng bơm', status: 'in_progress' }]),
      ),
    ),
    http.post(`${equipmentApi}/components/c1/replace`, async ({ request }) => {
      const body = (await request.json()) as {
        reason?: string
        cost?: string | null
        repairTicketId?: string | null
      }
      if (!body.reason) return validationError('reason bắt buộc')
      if (body.cost != null && !/^\d{1,18}$/.test(body.cost))
        return validationError('cost sai định dạng')
      replacements.push(body)
      return HttpResponse.json({ id: 'rp1', ...body })
    }),
    http.get(`${equipmentApi}/components/c1/replacements`, () =>
      HttpResponse.json([
        {
          id: 'rp1',
          equipmentId: 'e1',
          componentId: 'c1',
          replacedAt: '2026-09-19T00:00:00Z',
          reason: 'Mòn',
          oldSerial: 'P1',
          newSerial: 'P2',
          repairTicketId: 'r1',
          byUserId: 'u1',
          cost: '150000',
        },
      ]),
    ),
  )
  render('components')
  const section = within(await screen.findByTestId('section-components'))
  await userEvent.click(await section.findByRole('button', { name: 'Thay thế' }))
  await userEvent.type(await screen.findByLabelText('Lý do'), 'Mòn')
  await userEvent.type(screen.getByLabelText('Serial mới'), 'P2')
  await userEvent.type(screen.getByLabelText('Chi phí'), '150000')
  await userEvent.click(screen.getByRole('combobox', { name: 'Phiếu sửa chữa' }))
  await userEvent.click(await screen.findByText('SC-1 — Hỏng bơm'))
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(replacements).toHaveLength(1))
  expect(replacements[0]).toMatchObject({
    reason: 'Mòn',
    newSerial: 'P2',
    cost: '150000',
    repairTicketId: 'r1',
  })

  await userEvent.click(section.getByRole('button', { name: 'Lịch sử' }))
  expect(await screen.findByText('Lịch sử thay linh kiện · Bơm')).toBeVisible()
  expect(await screen.findByText(/150\.000/)).toBeVisible()
})

it('ghi bộ đếm kèm thời điểm và ghi chú', async () => {
  let body: Record<string, unknown> = {}
  server.use(
    http.post(`${equipmentApi}/counters`, async ({ request }) => {
      const parsed = (await request.json()) as Record<string, unknown>
      if (parsed.runHours != null && !/^\d{1,10}(\.\d{1,2})?$/.test(String(parsed.runHours)))
        return validationError('runHours sai định dạng')
      if (parsed.testCount != null && !Number.isInteger(parsed.testCount))
        return validationError('testCount phải là số nguyên')
      body = parsed
      return HttpResponse.json(counter)
    }),
  )
  render('counters')
  await userEvent.click(await screen.findByRole('button', { name: 'Ghi bộ đếm' }))
  fireEvent.change(await screen.findByLabelText('Ghi lúc'), {
    target: { value: '2026-09-20T10:00' },
  })
  await userEvent.type(screen.getByLabelText('Giờ chạy'), '120.5')
  await userEvent.type(screen.getByLabelText('Số test'), '10')
  await userEvent.type(screen.getByLabelText('Ghi chú'), 'Đầu ngày')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(body.runHours).toBe('120.5'))
  expect(body).toMatchObject({ testCount: 10, source: 'manual', note: 'Đầu ngày' })
  expect(typeof body.recordedAt).toBe('string')
})

it('timeline lọc theo loại, khoảng ngày, phân trang và hiện tên người', async () => {
  const urls: string[] = []
  server.use(
    http.get(`${equipmentApi}/events`, ({ request }) => {
      urls.push(request.url)
      return HttpResponse.json(
        page(
          [
            {
              id: 'ev1',
              equipmentId: 'e1',
              type: 'repair.created',
              title: 'Tiếp nhận sửa chữa',
              summary: 'Hỏng bơm',
              refType: 'repair',
              refId: 'r1',
              byUserId: 'u1',
              at: '2026-09-19T00:00:00Z',
            },
          ],
          45,
        ),
      )
    }),
  )
  render('timeline')
  expect(await screen.findByText('Tiếp nhận sửa chữa')).toBeVisible()
  expect(await screen.findByText(/Quản trị viên/)).toBeVisible()

  await userEvent.click(screen.getByRole('combobox', { name: 'Loại sự kiện' }))
  await userEvent.click(await screen.findByRole('option', { name: 'Sửa chữa' }))
  await waitFor(() => {
    const url = new URL(urls.at(-1) ?? '', 'http://x')
    expect(url.searchParams.get('type')).toBe('repair.*')
  })

  const now = new Date()
  const day = (n: number) =>
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`
  await userEvent.click(screen.getByRole('button', { name: 'Từ ngày' }))
  await userEvent.click(await screen.findByRole('button', { name: /ngày 15 tháng/ }))
  await waitFor(() => {
    const url = new URL(urls.at(-1) ?? '', 'http://x')
    expect(url.searchParams.get('from')).toBe(dayRangeToIso(day(15), undefined).from)
  })
  await userEvent.click(screen.getByRole('button', { name: 'Đến ngày' }))
  await userEvent.click(await screen.findByRole('button', { name: /ngày 20 tháng/ }))
  await waitFor(() => {
    const url = new URL(urls.at(-1) ?? '', 'http://x')
    expect(url.searchParams.get('to')).toBe(dayRangeToIso(undefined, day(20)).to)
  })

  await userEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
  await waitFor(() => {
    const url = new URL(urls.at(-1) ?? '', 'http://x')
    expect(url.searchParams.get('page')).toBe('2')
  })
})

it('duyệt điều chuyển trong tab chi tiết', async () => {
  const called: string[] = []
  server.use(
    http.post(`${equipmentApi}/transfers/t1/approve`, () => {
      called.push('ok')
      return HttpResponse.json({ id: 't1', status: 'approved' })
    }),
  )
  render('transfers')
  await userEvent.click(await screen.findByRole('button', { name: 'Duyệt' }))
  await waitFor(() => expect(called).toEqual(['ok']))
})

it('từ chối điều chuyển cần lý do', async () => {
  const reasons: string[] = []
  server.use(
    http.post(`${equipmentApi}/transfers/t1/reject`, async ({ request }) => {
      const body = (await request.json()) as { reason?: string }
      if (!body.reason) return validationError('reason bắt buộc')
      reasons.push(body.reason)
      return HttpResponse.json({ id: 't1', status: 'rejected' })
    }),
  )
  render('transfers')
  await userEvent.click(await screen.findByRole('button', { name: 'Từ chối' }))
  const dialog = await screen.findByRole('alertdialog')
  await userEvent.type(within(dialog).getByLabelText('Lý do (bắt buộc)'), 'Sai khoa')
  await userEvent.click(within(dialog).getByRole('button', { name: 'Xác nhận' }))
  await waitFor(() => expect(reasons).toEqual(['Sai khoa']))
})

it('người tạo huỷ được điều chuyển đang chờ', async () => {
  let cancelled = 0
  server.use(
    http.get(`${equipmentApi}/transfers`, () =>
      HttpResponse.json(page([{ ...transfer, requestedBy: 'u1' }])),
    ),
    http.post(`${equipmentApi}/transfers/t1/cancel`, () => {
      cancelled += 1
      return HttpResponse.json({ id: 't1', status: 'cancelled' })
    }),
  )
  render('transfers')
  await userEvent.click(await screen.findByRole('button', { name: 'Huỷ' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Xác nhận' }))
  await waitFor(() => expect(cancelled).toBe(1))
})

it('tổng quan hiện đủ trường thông tin chung', async () => {
  render()
  expect(await screen.findByText('Nguyên giá')).toBeVisible()
  expect(await screen.findByText('Mã tài sản')).toBeVisible()
  expect(await screen.findByText('Nguồn vốn')).toBeVisible()
  expect((await screen.findAllByText('Giờ chạy'))[0]).toBeVisible()
  expect(await screen.findByText('1.000 ₫')).toBeVisible()
})

it('tạo điều chuyển: Phòng đích khoá tới khi chọn khoa đích, nạp theo khoa đích và gửi toRoomId', async () => {
  const bodies: Record<string, unknown>[] = []
  const roomUrls: string[] = []
  server.use(
    http.get('/v1/departments', () =>
      HttpResponse.json({ items: [{ id: 'd2', code: 'SH', name: 'Sinh hoá' }] }),
    ),
    http.get('/v1/catalogs/rooms', ({ request }) => {
      roomUrls.push(request.url)
      return HttpResponse.json({
        items: [{ id: 'r2', code: 'SH-P201', name: 'Phòng Sinh hoá', departmentId: 'd2' }],
        total: 1,
      })
    }),
    http.post(`${equipmentApi}/transfers`, async ({ request }) => {
      bodies.push((await request.json()) as Record<string, unknown>)
      return HttpResponse.json({ ...transfer, id: 't9' }, { status: 201 })
    }),
  )
  render('transfers')
  await userEvent.click((await screen.findAllByRole('button', { name: 'Điều chuyển' }))[0]!)
  const dialog = within(await screen.findByRole('dialog'))
  expect(dialog.getByRole('combobox', { name: 'Phòng đích' })).toBeDisabled()
  await userEvent.click(dialog.getByRole('combobox', { name: 'Khoa đích' }))
  await userEvent.click(await screen.findByRole('option', { name: /Sinh hoá/ }))
  expect(dialog.getByRole('combobox', { name: 'Phòng đích' })).toBeEnabled()
  await userEvent.click(dialog.getByRole('combobox', { name: 'Phòng đích' }))
  await userEvent.click(await screen.findByRole('option', { name: /Phòng Sinh hoá/ }))
  expect(roomUrls.some((url) => url.includes('departmentId=d2'))).toBe(true)
  await userEvent.type(dialog.getByLabelText('Lý do'), 'Sắp xếp lại')
  await userEvent.click(dialog.getByRole('button', { name: 'Tạo' }))
  await waitFor(() =>
    expect(bodies[0]).toMatchObject({
      toDepartmentId: 'd2',
      toRoomId: 'r2',
      reason: 'Sắp xếp lại',
    }),
  )
})

it('chi tiết hiện chip và dòng Phòng', async () => {
  render()
  expect((await screen.findAllByText('Phòng Huyết học')).length).toBeGreaterThanOrEqual(1)
  expect(screen.getAllByText('Phòng')[0]).toBeVisible()
})
