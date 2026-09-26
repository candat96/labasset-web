import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { detail, validationError } from './fixtures'
import { Component } from './EquipmentFormPage'

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/departments', () =>
      HttpResponse.json({
        items: [
          { id: 'd1', code: 'HH', name: 'Huyết học' },
          { id: 'd2', code: 'SH', name: 'Sinh hoá' },
        ],
      }),
    ),
    http.get('/v1/catalogs/rooms', ({ request }) => {
      roomUrls.push(request.url)
      const departmentId = new URL(request.url).searchParams.get('departmentId')
      return HttpResponse.json({
        items: [
          ...(departmentId === 'd1'
            ? [{ id: 'r1', code: 'HH-P101', name: 'Phòng Huyết học', departmentId: 'd1' }]
            : departmentId === 'd2'
              ? [{ id: 'r2', code: 'SH-P201', name: 'Phòng Sinh hoá', departmentId: 'd2' }]
              : []),
          { id: 'r0', code: 'HT', name: 'Hội trường', departmentId: null },
        ],
        total: 2,
      })
    }),
    http.get('/v1/catalogs/:name', () => HttpResponse.json([])),
    http.get('/v1/users', () => HttpResponse.json({ items: [], total: 0, page: 1, limit: 50 })),
    http.get('/v1/attachments', () => HttpResponse.json([])),
  )
})

let roomUrls: string[] = []
beforeEach(() => {
  roomUrls = []
})

const formRoutes = [{ path: '/equipment/:id', element: <div>DETAIL</div> }]

async function pickRoom(name: string) {
  await userEvent.click(screen.getByRole('combobox', { name: 'Phòng' }))
  await userEvent.click(await screen.findByRole('option', { name: new RegExp(name) }))
}

it('tạo máy: bắt buộc tên + khoa + phòng, gửi body hợp lệ có roomId', async () => {
  const saved: Record<string, unknown>[] = []
  server.use(
    http.post('/v1/equipment', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>
      if (typeof body.name !== 'string' || !body.name)
        return validationError('name must not be empty')
      if (typeof body.departmentId !== 'string' || !body.departmentId)
        return validationError('departmentId must be a UUID')
      saved.push(body)
      return HttpResponse.json(
        { id: 'e2', code: 'TB-2026-00002', name: body.name },
        { status: 201 },
      )
    }),
  )
  renderWithProviders(<Component />, {
    path: '/equipment/new',
    route: '/equipment/new',
    routes: formRoutes,
  })
  // chưa chọn khoa → ô Phòng và nút thêm phòng bị khoá
  expect(screen.getByRole('combobox', { name: 'Phòng' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Thêm phòng mới' })).toBeDisabled()
  // Mã không bắt buộc — placeholder gợi ý tự sinh (handoff 16)
  expect(screen.getByLabelText('Mã máy')).toHaveAttribute(
    'placeholder',
    'Để trống sẽ tự sinh (vd TB-2026-00001)',
  )
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  expect((await screen.findAllByText('Bắt buộc')).length).toBeGreaterThanOrEqual(3)
  await userEvent.type(screen.getByLabelText('Tên'), 'Máy mới')
  await userEvent.click(screen.getByRole('combobox', { name: 'Khoa' }))
  await userEvent.click(await screen.findByText('HH — Huyết học'))
  // chọn khoa → phòng mở, còn thiếu phòng vẫn báo lỗi, không gửi
  expect(screen.getByRole('combobox', { name: 'Phòng' })).toBeEnabled()
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  expect(await screen.findByText('Bắt buộc')).toBeVisible()
  await waitFor(() => expect(saved.length).toBe(0))
  // danh sách phòng lọc theo khoa đã chọn (+ dùng chung)
  await userEvent.click(screen.getByRole('combobox', { name: 'Phòng' }))
  expect(await screen.findByRole('option', { name: /Phòng Huyết học/ })).toBeVisible()
  expect(screen.getByRole('option', { name: /Hội trường/ })).toBeVisible()
  expect(screen.queryByRole('option', { name: /Phòng Sinh hoá/ })).not.toBeInTheDocument()
  expect(roomUrls.some((url) => url.includes('departmentId=d1'))).toBe(true)
  await userEvent.click(screen.getByRole('option', { name: /Phòng Huyết học/ }))
  await userEvent.type(screen.getByLabelText('Vị trí trong phòng'), 'Bàn 2')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(saved.length).toBe(1))
  expect(saved[0]).toMatchObject({
    name: 'Máy mới',
    departmentId: 'd1',
    roomId: 'r1',
    location: 'Bàn 2',
  })
  expect(saved[0]).not.toHaveProperty('code')
  // toast hiển thị mã server đã sinh
  expect(await screen.findByText('Đã tạo máy — mã TB-2026-00002')).toBeVisible()
})

it('đổi khoa → xoá phòng đã chọn và nạp phòng của khoa mới', async () => {
  renderWithProviders(<Component />, {
    path: '/equipment/new',
    route: '/equipment/new',
    routes: formRoutes,
  })
  await userEvent.click(screen.getByRole('combobox', { name: 'Khoa' }))
  await userEvent.click(await screen.findByText('HH — Huyết học'))
  await pickRoom('Phòng Huyết học')
  expect(screen.getByRole('combobox', { name: 'Phòng' })).toHaveTextContent('Phòng Huyết học')
  await userEvent.click(screen.getByRole('combobox', { name: 'Khoa' }))
  await userEvent.click(await screen.findByText('SH — Sinh hoá'))
  await waitFor(() =>
    expect(screen.getByRole('combobox', { name: 'Phòng' })).not.toHaveTextContent(
      'Phòng Huyết học',
    ),
  )
  await userEvent.click(screen.getByRole('combobox', { name: 'Phòng' }))
  expect(await screen.findByRole('option', { name: /Phòng Sinh hoá/ })).toBeVisible()
  expect(screen.queryByRole('option', { name: /Phòng Huyết học/ })).not.toBeInTheDocument()
})

it('nút "+" tạo phòng nhanh cho khoa đang chọn rồi tự chọn phòng đó', async () => {
  const bodies: Record<string, unknown>[] = []
  server.use(
    http.post('/v1/catalogs/rooms', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>
      bodies.push(body)
      return HttpResponse.json(
        { id: 'r9', code: 'HH-P109', name: body.name, departmentId: body.departmentId },
        { status: 201 },
      )
    }),
    http.get('/v1/departments/d1', () =>
      HttpResponse.json({ id: 'd1', code: 'HH', name: 'Huyết học' }),
    ),
    http.get('/v1/catalogs/rooms/r9', () =>
      HttpResponse.json({ id: 'r9', code: 'HH-P109', name: 'Phòng mới', departmentId: 'd1' }),
    ),
  )
  renderWithProviders(<Component />, {
    path: '/equipment/new',
    route: '/equipment/new',
    routes: formRoutes,
  })
  await userEvent.click(screen.getByRole('combobox', { name: 'Khoa' }))
  await userEvent.click(await screen.findByText('HH — Huyết học'))
  await userEvent.click(screen.getByRole('button', { name: 'Thêm phòng mới' }))
  const dialog = await screen.findByRole('dialog')
  await userEvent.type(within(dialog).getByLabelText('Tên'), 'Phòng mới')
  await userEvent.type(within(dialog).getByLabelText('Tầng'), 'Tầng 2')
  await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
  await waitFor(() =>
    expect(bodies[0]).toMatchObject({
      name: 'Phòng mới',
      departmentId: 'd1',
      floor: 'Tầng 2',
      roomType: 'other',
    }),
  )
  // mã để trống → bỏ khỏi body, server tự sinh (handoff 16)
  expect(bodies[0]).not.toHaveProperty('code')
  await waitFor(() =>
    expect(screen.getByRole('combobox', { name: 'Phòng' })).toHaveTextContent('Phòng mới'),
  )
})

it('gắn lỗi trùng serial vào field', async () => {
  server.use(
    http.post('/v1/equipment', async ({ request }) => {
      const body = (await request.json()) as { name?: string; serial?: string }
      if (typeof body.name !== 'string' || !body.name)
        return validationError('name must not be empty')
      if (body.serial === 'DUP')
        return HttpResponse.json(
          { code: 'EQUIPMENT_SERIAL_TAKEN', message: 'taken' },
          { status: 409 },
        )
      return HttpResponse.json(
        { id: 'e2', code: 'TB-2026-00002', name: body.name },
        { status: 201 },
      )
    }),
  )
  renderWithProviders(<Component />, {
    path: '/equipment/new',
    route: '/equipment/new',
    routes: formRoutes,
  })
  await userEvent.type(screen.getByLabelText('Tên'), 'Máy mới')
  await userEvent.click(screen.getByRole('combobox', { name: 'Khoa' }))
  await userEvent.click(await screen.findByText('HH — Huyết học'))
  await pickRoom('Phòng Huyết học')
  await userEvent.type(screen.getByLabelText('Serial'), 'DUP')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  expect(await screen.findByText('Số serial đã tồn tại')).toBeVisible()
})

it('sửa máy: khoá mã máy và không gửi code/departmentId', async () => {
  const bodies: Record<string, unknown>[] = []
  server.use(
    http.get('/v1/equipment/e1', () => HttpResponse.json(detail)),
    http.patch('/v1/equipment/e1', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>
      bodies.push(body)
      if ('code' in body || 'departmentId' in body)
        return validationError('code/departmentId không được sửa')
      if ('name' in body && (typeof body.name !== 'string' || !body.name))
        return validationError('name must not be empty')
      return HttpResponse.json(detail)
    }),
  )
  renderWithProviders(<Component />, {
    path: '/equipment/:id/edit',
    route: '/equipment/e1/edit',
    routes: formRoutes,
  })
  const codeInput = await screen.findByLabelText('Mã máy')
  expect(codeInput).toBeDisabled()
  expect(screen.queryByRole('combobox', { name: 'Khoa' })).not.toBeInTheDocument()
  // sửa: phòng hiện tại giữ nguyên (không bị xoá bởi reset), chọn được theo khoa của máy
  expect(screen.getByRole('combobox', { name: 'Phòng' })).toHaveTextContent('Phòng Huyết học')
  await userEvent.clear(screen.getByLabelText('Nguyên giá'))
  await userEvent.type(screen.getByLabelText('Nguyên giá'), '2500000')
  expect(screen.getByLabelText('Nguyên giá')).toHaveValue('2500000')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(bodies.length).toBe(1))
  expect(bodies[0]).toMatchObject({ originalValue: '2500000' })
  expect(bodies[0]).not.toHaveProperty('code')
  expect(bodies[0]).not.toHaveProperty('departmentId')
  expect(await screen.findByText('Đã lưu máy')).toBeVisible()
  expect(await screen.findByText('DETAIL')).toBeVisible()
})

it('render đủ nhóm trường trong SectionCard, lưới 3 cột và nút quay lại tròn', async () => {
  renderWithProviders(<Component />, {
    path: '/equipment/new',
    route: '/equipment/new',
    routes: formRoutes,
  })
  // mỗi nhóm trường nằm trong một SectionCard (tiêu đề h2)
  const general = await screen.findByRole('heading', { name: 'Thông tin chung' })
  const specs = screen.getByRole('heading', { name: 'Thông số kỹ thuật' })
  expect(general).toBeVisible()
  expect(specs).toBeVisible()
  // lưới ô nhập 3 cột, khoảng cách 20px
  const grid = general.closest('section')!.querySelector('div.grid')
  expect(grid).toHaveClass('gap-5')
  expect(grid).toHaveClass('lg:grid-cols-3')
  // trường đại diện của từng nhóm đều render
  for (const label of ['Mã máy', 'Tên', 'Model', 'Serial', 'Hãng', 'Nguyên giá'])
    expect(screen.getByLabelText(label)).toBeInTheDocument()
  for (const label of ['Điện áp', 'Công suất', 'Kích thước', 'Khối lượng', 'Nhiệt độ môi trường'])
    expect(screen.getByLabelText(label)).toBeInTheDocument()
  // nút quay lại dạng tròn ở dải tiêu đề
  expect(screen.getByRole('button', { name: 'Quay lại' })).toHaveClass('rounded-full')
})

it('nguyên giá phải là chuỗi số nguyên', async () => {
  const patches: unknown[] = []
  server.use(
    http.get('/v1/equipment/e1', () => HttpResponse.json(detail)),
    http.patch('/v1/equipment/e1', async ({ request }) => {
      patches.push(await request.json())
      return HttpResponse.json(detail)
    }),
  )
  renderWithProviders(<Component />, {
    path: '/equipment/:id/edit',
    route: '/equipment/e1/edit',
    routes: formRoutes,
  })
  await userEvent.clear(await screen.findByLabelText('Nguyên giá'))
  await userEvent.type(screen.getByLabelText('Nguyên giá'), '12.5')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  expect(await screen.findByText('Số không hợp lệ')).toBeVisible()
  expect(patches.length).toBe(0)
})
