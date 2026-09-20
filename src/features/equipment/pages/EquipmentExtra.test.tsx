import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { detail, page, transfer } from './fixtures'
import { Component as Transfers } from './TransfersPage'
import { Component as Compare } from './ComparePage'
import { Component as ByQr } from './ByQrPage'

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/equipment/transfers', () => HttpResponse.json(page([transfer]))),
    http.get('/v1/equipment', () =>
      HttpResponse.json(page([{ id: 'e1', code: 'TB-1', name: 'Máy A' }])),
    ),
    http.get('/v1/departments', ({ request }) => {
      const items = [
        { id: 'd1', code: 'HH', name: 'Huyết học' },
        { id: 'd2', code: 'SH', name: 'Sinh hoá' },
      ]
      return new URL(request.url).searchParams.get('all')
        ? HttpResponse.json(items)
        : HttpResponse.json({ items, total: 2, page: 1, limit: 50 })
    }),
    http.get('/v1/users', () =>
      HttpResponse.json({
        items: [
          { id: 'u1', username: 'admin', fullName: 'Quản trị viên' },
          { id: 'u2', username: 'vt', fullName: 'Nhân viên VT' },
        ],
        total: 2,
        page: 1,
        limit: 200,
      }),
    ),
    http.get('/v1/attachments', () => HttpResponse.json([])),
  )
})

it('hiện tên máy/khoa/người và duyệt trong drawer', async () => {
  const called: string[] = []
  server.use(
    http.post('/v1/equipment/e1/transfers/t1/approve', () => {
      called.push('ok')
      return HttpResponse.json({ id: 't1', status: 'approved' })
    }),
  )
  renderWithProviders(<Transfers />)
  expect(await screen.findByText('TB-1 — Máy A')).toBeVisible()
  expect(screen.getByText(/Huyết học → Sinh hoá/)).toBeVisible()
  expect(screen.getByText(/Nhân viên VT/)).toBeVisible()
  await userEvent.click(screen.getByText('Chuyển khoa'))
  const drawer = await screen.findByRole('dialog')
  await userEvent.click(within(drawer).getByRole('button', { name: 'Duyệt' }))
  await waitFor(() => expect(called).toEqual(['ok']))
})

it('từ chối điều chuyển cần lý do', async () => {
  const reasons: string[] = []
  server.use(
    http.post('/v1/equipment/e1/transfers/t1/reject', async ({ request }) => {
      const body = (await request.json()) as { reason?: string }
      if (!body.reason) return HttpResponse.json({ code: 'VALIDATION_ERROR' }, { status: 400 })
      reasons.push(body.reason)
      return HttpResponse.json({ id: 't1', status: 'rejected' })
    }),
  )
  renderWithProviders(<Transfers />)
  await userEvent.click(await screen.findByText('Chuyển khoa'))
  const drawer = await screen.findByRole('dialog')
  await userEvent.click(within(drawer).getByRole('button', { name: 'Từ chối' }))
  const alert = await screen.findByRole('alertdialog')
  await userEvent.type(within(alert).getByLabelText('Lý do (bắt buộc)'), 'Sai khoa')
  await userEvent.click(within(alert).getByRole('button', { name: 'Xác nhận' }))
  await waitFor(() => expect(reasons).toEqual(['Sai khoa']))
})

it('người tạo huỷ được điều chuyển của mình', async () => {
  let cancelled = 0
  server.use(
    http.get('/v1/equipment/transfers', () =>
      HttpResponse.json(page([{ ...transfer, requestedBy: 'u1' }])),
    ),
    http.post('/v1/equipment/e1/transfers/t1/cancel', () => {
      cancelled += 1
      return HttpResponse.json({ id: 't1', status: 'cancelled' })
    }),
  )
  useAuthStore.getState().setSession(fakeSession(['EQUIPMENT_STAFF']))
  renderWithProviders(<Transfers />)
  await userEvent.click(await screen.findByText('Chuyển khoa'))
  const drawer = await screen.findByRole('dialog')
  await userEvent.click(within(drawer).getByRole('button', { name: 'Huỷ' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Xác nhận' }))
  await waitFor(() => expect(cancelled).toBe(1))
})

it('lọc điều chuyển theo khoa', async () => {
  server.use(
    http.get('/v1/equipment/transfers', () =>
      HttpResponse.json(
        page([
          transfer,
          {
            ...transfer,
            id: 't2',
            equipmentId: 'e2',
            fromDepartmentId: 'd3',
            toDepartmentId: 'd4',
            reason: 'Điều chuyển khác',
          },
        ]),
      ),
    ),
  )
  renderWithProviders(<Transfers />)
  expect(await screen.findByText('Chuyển khoa')).toBeVisible()
  expect(screen.getByText('Điều chuyển khác')).toBeVisible()
  await userEvent.click(screen.getByRole('combobox', { name: 'Khoa' }))
  await userEvent.click(await screen.findByText('HH — Huyết học'))
  await waitFor(() => expect(screen.queryByText('Điều chuyển khác')).not.toBeInTheDocument())
  expect(screen.getByText('Chuyển khoa')).toBeVisible()
})

it('highlights differing compare fields and extra diff paths', async () => {
  server.use(
    http.get('/v1/equipment/compare', () =>
      HttpResponse.json({
        items: [
          { ...detail, id: 'e1', code: 'A', name: 'Máy A', model: 'M1', serial: 'S1' },
          { ...detail, id: 'e2', code: 'B', name: 'Máy B', model: 'M2', serial: 'S2' },
        ],
        diff: ['model', 'specs.voltage'],
      }),
    ),
    http.get('/v1/equipment', () => HttpResponse.json(page([]))),
    http.get('/v1/equipment/:id', ({ params }) =>
      HttpResponse.json({ ...detail, id: String(params.id) }),
    ),
  )
  renderWithProviders(<Compare />, {
    route: '/equipment/compare?ids=e1,e2',
    path: '/equipment/compare',
  })
  expect(await screen.findByText(/model: M1/)).toBeVisible()
  expect(screen.getByText(/model: M1/).className).toMatch(/bg-warning/)
  const voltage = screen.getAllByText(/specs\.voltage: 220V/)
  expect(voltage).toHaveLength(2)
  expect(voltage[0]!.className).toMatch(/bg-warning/)
})

it('QR không tồn tại chỉ hiện một thông báo', async () => {
  server.use(
    http.get('/v1/equipment/by-qr/tok', () =>
      HttpResponse.json({ code: 'QR_TOKEN_NOT_FOUND', message: 'not found' }, { status: 404 }),
    ),
  )
  renderWithProviders(<ByQr />, {
    path: '/equipment/by-qr/:token',
    route: '/equipment/by-qr/tok',
  })
  expect(await screen.findByText('Không tìm thấy máy')).toBeVisible()
  expect(screen.queryByText('Không tải được dữ liệu')).not.toBeInTheDocument()
  expect(screen.getAllByText('Không tìm thấy máy')).toHaveLength(1)
})

it('redirects a resolved QR token to the equipment page', async () => {
  server.use(
    http.get('/v1/equipment/by-qr/tok', () =>
      HttpResponse.json({ id: 'e1', code: 'TB-1', name: 'Máy' }),
    ),
  )
  const { router } = renderWithProviders(<ByQr />, {
    path: '/equipment/by-qr/:token',
    route: '/equipment/by-qr/tok',
    routes: [{ path: '/equipment/:id', element: <div>DETAIL</div> }],
  })
  await waitFor(() => expect(router.state.location.pathname).toBe('/equipment/e1'))
})
