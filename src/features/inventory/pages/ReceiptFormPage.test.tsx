import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component as ReceiptFormPage } from './ReceiptFormPage'

/** Vật tư có đơn vị mua + hệ số quy đổi để bật chế độ nhập theo đơn vị mua. */
const supplyRow = (extra: Record<string, unknown> = {}) => ({
  id: 's1',
  code: 'HC-01',
  name: 'Huyết thanh',
  unitId: 'u1',
  purchaseUnitId: 'u2',
  conversionFactor: '100',
  refPrice: '100000',
  bidPrice: '90000',
  bidValidTo: '2030-12-31',
  circulationValidTo: null,
  trackLot: false,
  trackExpiry: false,
  isActive: true,
  ...extra,
})

const receiptRoutes = [{ path: '/stock/receipts/:id', element: <div>DETAIL</div> }]

function mockReceiptForm(supply: Record<string, unknown> = supplyRow()) {
  server.use(
    http.get('/v1/catalogs/warehouses', () =>
      HttpResponse.json([{ id: 'w1', code: 'K1', name: 'Kho chính' }]),
    ),
    http.get('/v1/catalogs/suppliers', () =>
      HttpResponse.json([{ id: 'sp1', code: 'NCC1', name: 'Nhà cung cấp 1' }]),
    ),
    http.get('/v1/catalogs/units', () =>
      HttpResponse.json([
        { id: 'u1', code: 'CAI', name: 'Cái' },
        { id: 'u2', code: 'HOP', name: 'Hộp' },
      ]),
    ),
    http.get('/v1/supplies/s1', () => HttpResponse.json(supply)),
    http.get('/v1/supplies', () =>
      HttpResponse.json({
        items: [{ id: 's1', code: 'HC-01', name: 'Huyết thanh' }],
        total: 1,
        page: 1,
        limit: 50,
      }),
    ),
  )
}

async function settleForm() {
  await screen.findByRole('button', { name: /^(Lưu|Lưu nháp)$/ })
  await new Promise((resolve) => setTimeout(resolve, 120))
}

async function fillHeaderAndSupply() {
  await settleForm()
  await userEvent.type(screen.getByLabelText('Kho'), 'Kho')
  await userEvent.click(await screen.findByRole('option', { name: /Kho chính/ }))
  await userEvent.type(screen.getByLabelText('Nhà cung cấp'), 'Nhà')
  await userEvent.click(await screen.findByRole('option', { name: /Nhà cung cấp 1/ }))
  await userEvent.type(screen.getByLabelText('Vật tư'), 'Huyết')
  await userEvent.click(await screen.findByRole('option', { name: /Huyết thanh/ }))
}

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
})

it('gửi purchaseQuantity và diễn giải quy đổi khi nhập theo đơn vị mua', async () => {
  const saved: Array<{ items: Record<string, unknown>[] }> = []
  mockReceiptForm()
  server.use(
    http.post('/v1/stock/receipts', async ({ request }) => {
      saved.push((await request.json()) as { items: Record<string, unknown>[] })
      return HttpResponse.json({ id: 'r2', code: 'NK-2' }, { status: 201 })
    }),
  )
  renderWithProviders(<ReceiptFormPage />, {
    path: '/stock/receipts/new',
    route: '/stock/receipts/new',
    routes: receiptRoutes,
  })
  await fillHeaderAndSupply()
  // Chỉ hiện lựa chọn đơn vị mua khi vật tư đã khai hệ số quy đổi + đơn vị mua.
  await userEvent.click(await screen.findByRole('button', { name: 'Đơn vị mua' }))
  const qty = screen.getByLabelText(/Số lượng/)
  await userEvent.clear(qty)
  await userEvent.type(qty, '2.5')
  expect(await screen.findByText('2,5 Hộp = 250 Cái')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }))
  await waitFor(() => expect(saved).toHaveLength(1))
  expect(saved[0]!.items[0]).toMatchObject({ purchaseQuantity: '2.5', unitCost: '90000' })
  expect(saved[0]!.items[0]).not.toHaveProperty('quantity')
})

it('không hiện lựa chọn đơn vị mua khi vật tư chưa khai hệ số quy đổi', async () => {
  mockReceiptForm(supplyRow({ conversionFactor: null, purchaseUnitId: null }))
  renderWithProviders(<ReceiptFormPage />, {
    path: '/stock/receipts/new',
    route: '/stock/receipts/new',
    routes: receiptRoutes,
  })
  await fillHeaderAndSupply()
  await waitFor(() => expect(screen.getByLabelText(/Số lượng/)).toHaveValue('1'))
  expect(screen.queryByRole('button', { name: 'Đơn vị mua' })).not.toBeInTheDocument()
})

it('đơn giá mặc định lấy giá thầu khi còn hiệu lực', async () => {
  mockReceiptForm(supplyRow({ bidValidTo: '2030-12-31', bidPrice: '90000' }))
  renderWithProviders(<ReceiptFormPage />, {
    path: '/stock/receipts/new',
    route: '/stock/receipts/new',
    routes: receiptRoutes,
  })
  await fillHeaderAndSupply()
  await waitFor(() => expect(screen.getByLabelText('Đơn giá')).toHaveValue('90000'))
})

it('đơn giá mặc định lấy giá tham chiếu khi thầu đã hết hạn', async () => {
  mockReceiptForm(supplyRow({ bidValidTo: '2020-01-01', bidPrice: '90000' }))
  renderWithProviders(<ReceiptFormPage />, {
    path: '/stock/receipts/new',
    route: '/stock/receipts/new',
    routes: receiptRoutes,
  })
  await fillHeaderAndSupply()
  await waitFor(() => expect(screen.getByLabelText('Đơn giá')).toHaveValue('100000'))
})

it('giữ đơn giá đã sửa tay, ghi đè khi đổi vật tư khác', async () => {
  server.use(
    http.get('/v1/catalogs/warehouses', () =>
      HttpResponse.json([{ id: 'w1', code: 'K1', name: 'Kho chính' }]),
    ),
    http.get('/v1/catalogs/suppliers', () =>
      HttpResponse.json([{ id: 'sp1', code: 'NCC1', name: 'Nhà cung cấp 1' }]),
    ),
    http.get('/v1/catalogs/units', () =>
      HttpResponse.json([
        { id: 'u1', code: 'CAI', name: 'Cái' },
        { id: 'u2', code: 'HOP', name: 'Hộp' },
      ]),
    ),
    http.get('/v1/supplies', () =>
      HttpResponse.json({
        items: [
          { id: 's1', code: 'HC-01', name: 'Huyết thanh A' },
          { id: 's2', code: 'HC-02', name: 'Huyết thanh B' },
        ],
        total: 2,
        page: 1,
        limit: 50,
      }),
    ),
    http.get('/v1/supplies/s1', () =>
      HttpResponse.json(supplyRow({ name: 'Huyết thanh A', bidPrice: '90000' })),
    ),
    http.get('/v1/supplies/s2', () =>
      HttpResponse.json(
        supplyRow({ id: 's2', code: 'HC-02', name: 'Huyết thanh B', bidPrice: '70000' }),
      ),
    ),
  )
  renderWithProviders(<ReceiptFormPage />, {
    path: '/stock/receipts/new',
    route: '/stock/receipts/new',
    routes: receiptRoutes,
  })
  await settleForm()
  await userEvent.type(screen.getByLabelText('Kho'), 'Kho')
  await userEvent.click(await screen.findByRole('option', { name: /Kho chính/ }))
  await userEvent.type(screen.getByLabelText('Nhà cung cấp'), 'Nhà')
  await userEvent.click(await screen.findByRole('option', { name: /Nhà cung cấp 1/ }))
  await userEvent.type(screen.getByLabelText('Vật tư'), 'A')
  await userEvent.click(await screen.findByRole('option', { name: /Huyết thanh A/ }))
  await waitFor(() => expect(screen.getByLabelText('Đơn giá')).toHaveValue('90000'))
  const cost = screen.getByLabelText('Đơn giá')
  await userEvent.clear(cost)
  await userEvent.type(cost, '12345')
  await waitFor(() => expect(screen.getByLabelText('Đơn giá')).toHaveValue('12345'))
  // Đổi vật tư khác thì giá mặc định của vật tư mới ghi đè giá vừa gõ.
  await userEvent.click(screen.getByLabelText('Vật tư'))
  await userEvent.click(await screen.findByRole('option', { name: /Huyết thanh B/ }))
  await waitFor(() => expect(screen.getByLabelText('Đơn giá')).toHaveValue('70000'))
})

it('hiện đủ cảnh báo sau khi lưu', async () => {
  const warnings = [
    'Lô - còn dưới 30 ngày hạn dùng khi nhập',
    'Vật tư HC-01 đã hết hiệu lực số lưu hành từ 2020-01-01',
  ]
  mockReceiptForm()
  server.use(
    http.post('/v1/stock/receipts', () =>
      HttpResponse.json({ id: 'r2', code: 'NK-2', details: { warnings } }, { status: 201 }),
    ),
  )
  renderWithProviders(<ReceiptFormPage />, {
    path: '/stock/receipts/new',
    route: '/stock/receipts/new',
    routes: receiptRoutes,
  })
  await fillHeaderAndSupply()
  await userEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }))
  expect(await screen.findByText(warnings[0]!)).toBeInTheDocument()
  expect(screen.getByText(warnings[1]!)).toBeInTheDocument()
})

it('cảnh báo trong form khi số lưu hành đã hết hiệu lực', async () => {
  mockReceiptForm(supplyRow({ circulationValidTo: '2020-01-01' }))
  renderWithProviders(<ReceiptFormPage />, {
    path: '/stock/receipts/new',
    route: '/stock/receipts/new',
    routes: receiptRoutes,
  })
  await fillHeaderAndSupply()
  expect(await screen.findByText(/đã hết hiệu lực số lưu hành/)).toBeInTheDocument()
})
