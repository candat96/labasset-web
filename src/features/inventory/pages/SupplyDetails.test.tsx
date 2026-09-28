import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component as SupplyFormPage } from './SupplyFormPage'
import { Component as SupplyDetailPage } from './SupplyDetailPage'

/** Hàng vật tư chi tiết dùng chung cho các ca kiểm thử màn chi tiết. */
const supplyRow = (extra: Record<string, unknown> = {}) => ({
  id: 's1',
  code: 'HC-01',
  name: 'Huyết thanh',
  groupId: null,
  unitId: 'u1',
  packaging: null,
  manufacturerCode: null,
  manufacturerId: null,
  defaultSupplierId: null,
  refPrice: null,
  trackLot: false,
  trackExpiry: false,
  minStock: null,
  maxStock: null,
  openVialDays: null,
  storageCondition: null,
  isActive: true,
  notes: null,
  circulationNumber: null,
  circulationValidTo: null,
  riskClass: null,
  countryOfOrigin: null,
  insuranceCode: null,
  insuranceName: null,
  insuranceRate: null,
  insurancePrice: null,
  bidPackage: null,
  bidDecisionNo: null,
  bidPrice: null,
  bidValidTo: null,
  purchaseUnitId: null,
  conversionFactor: null,
  minShelfLifeDays: null,
  ...extra,
})

/** Mock đủ endpoint mà màn chi tiết gọi khi dựng (query chạy song song). */
function mockDetailEndpoints(row: Record<string, unknown> = supplyRow()) {
  server.use(
    http.get('/v1/supplies/:id', () => HttpResponse.json(row)),
    http.get('/v1/supplies/:id/stock', () => HttpResponse.json({ balances: [], lots: [] })),
    http.get('/v1/supplies/:id/card', () =>
      HttpResponse.json({ opening: '0', closing: '0', items: [] }),
    ),
    http.get('/v1/supplies/:id/equipment', () => HttpResponse.json([])),
    http.get('/v1/stock/forecast', () =>
      HttpResponse.json({ avg30: '0', avg90: '0', dailyUsage: '0', daysLeft: null }),
    ),
    http.get('/v1/catalogs/warehouses', () => HttpResponse.json([])),
    http.get('/v1/catalogs/units', () =>
      HttpResponse.json([
        { id: 'u1', code: 'ML', name: 'Mililit' },
        { id: 'u2', code: 'TH', name: 'Thùng' },
      ]),
    ),
  )
}

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
})

it('chặn hệ số quy đổi bằng 0 khi lưu vật tư', async () => {
  let posted = false
  server.use(
    http.get('/v1/catalogs/units', () =>
      HttpResponse.json([{ id: 'u1', code: 'ML', name: 'Mililit' }]),
    ),
    http.post('/v1/supplies', () => {
      posted = true
      return HttpResponse.json({ id: 's2', code: 'HC-02', name: 'Mới' }, { status: 201 })
    }),
  )
  renderWithProviders(<SupplyFormPage />, { path: '/supplies/new', route: '/supplies/new' })
  await screen.findByRole('button', { name: 'Lưu' })
  await userEvent.type(screen.getByLabelText('Tên'), 'Huyết thanh mới')
  await userEvent.type(screen.getByLabelText('ĐVT'), 'Mil')
  await userEvent.click(await screen.findByRole('option', { name: /Mililit/ }))
  await userEvent.type(screen.getByLabelText('Hệ số quy đổi'), '0')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  expect(await screen.findByText('Hệ số quy đổi phải lớn hơn 0')).toBeInTheDocument()
  expect(posted).toBe(false)
})

it('cảnh báo đỏ khi số lưu hành đã hết hiệu lực', async () => {
  mockDetailEndpoints(supplyRow({ circulationValidTo: '2020-01-01' }))
  server.use(http.get('/v1/supplies/:id/substitutes', () => HttpResponse.json([])))
  renderWithProviders(<SupplyDetailPage />, {
    path: '/supplies/:id',
    route: '/supplies/s1',
  })
  const alert = await screen.findByRole('alert')
  expect(alert).toHaveTextContent('Đã hết hiệu lực')
  expect(alert).toHaveAttribute('data-tone', 'danger')
  expect(alert).toHaveClass('text-destructive')
})

it('thêm rồi xoá vật tư thay thế', async () => {
  let linked: Record<string, unknown>[] = []
  const bodies: unknown[] = []
  let deleted = ''
  mockDetailEndpoints()
  server.use(
    http.get('/v1/supplies/:id/substitutes', () => HttpResponse.json(linked)),
    http.get('/v1/supplies', () =>
      HttpResponse.json({
        items: [{ id: 's2', code: 'HC-02', name: 'Huyết thanh B' }],
        total: 1,
        page: 1,
        limit: 50,
      }),
    ),
    http.post('/v1/supplies/:id/substitutes', async ({ request }) => {
      bodies.push(await request.json())
      linked = [
        { id: 's2', code: 'HC-02', name: 'Huyết thanh B', unitName: 'Mililit', notes: null },
      ]
      return HttpResponse.json(linked, { status: 201 })
    }),
    http.delete('/v1/supplies/:id/substitutes/:substituteId', ({ params }) => {
      deleted = String(params.substituteId)
      linked = []
      return HttpResponse.json({ removed: true })
    }),
  )
  renderWithProviders(<SupplyDetailPage />, {
    path: '/supplies/:id',
    route: '/supplies/s1',
  })
  await screen.findByText('Huyết thanh')
  await userEvent.type(screen.getByLabelText('Vật tư thay thế'), 'Huyết B')
  await userEvent.click(await screen.findByRole('option', { name: /Huyết thanh B/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Thêm' }))
  await waitFor(() => expect(bodies[0]).toMatchObject({ substituteId: 's2' }))
  expect(await screen.findByRole('link', { name: 'HC-02' })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Xoá vật tư thay thế' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Xoá' }))
  await waitFor(() => expect(deleted).toBe('s2'))
})

it('hiện và lưu chu kỳ kiểm đếm (ngày) của vật tư', async () => {
  let body: Record<string, unknown> | null = null
  mockDetailEndpoints(supplyRow({ countCycleDays: 30 }))
  server.use(
    http.patch('/v1/supplies/:id', async ({ request }) => {
      body = (await request.json()) as Record<string, unknown>
      return HttpResponse.json(supplyRow({ countCycleDays: 45 }))
    }),
  )
  renderWithProviders(<SupplyFormPage />, {
    path: '/supplies/:id',
    route: '/supplies/s1',
  })
  const field = await screen.findByLabelText('Chu kỳ kiểm đếm (ngày)')
  expect(field).toHaveValue(30)
  await userEvent.clear(field)
  await userEvent.type(field, '45')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(body?.countCycleDays).toBe(45))
})
