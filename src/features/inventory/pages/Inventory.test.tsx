import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component as SuppliesPage } from './SuppliesPage'
import { Component as SupplyFormPage } from './SupplyFormPage'
import { Component as ReceiptsPage } from './ReceiptsPage'
import { Component as ReceiptFormPage } from './ReceiptFormPage'
import { Component as IssueFormPage } from './IssueFormPage'
import { Component as TransfersPage } from './TransfersPage'

/**
 * Chờ form dựng xong trước khi thao tác. Ba trang nhập/xuất/vật tư là TRANG (có
 * thanh nút dính đáy), riêng Chuyển kho mở bằng drawer từ danh sách.
 */
async function settleForm() {
  await screen.findByRole('button', { name: /^(Lưu|Lưu nháp)$/ })
  await new Promise((resolve) => setTimeout(resolve, 120))
}

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/supplies', () =>
      HttpResponse.json({
        items: [
          {
            id: 's1',
            code: 'HC-01',
            name: 'Huyết thanh',
            trackLot: true,
            trackExpiry: true,
            minStock: '10',
            refPrice: '100000',
            isActive: true,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      }),
    ),
    http.get('/v1/stock/receipts', () =>
      HttpResponse.json({
        items: [
          {
            id: 'r1',
            code: 'NK-1',
            type: 'purchase',
            status: 'draft',
            totalAmount: '1000',
            items: [],
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      }),
    ),
    http.get('/v1/catalogs/:name', () => HttpResponse.json([])),
  )
})

it('lists supplies', async () => {
  renderWithProviders(<SuppliesPage />)
  expect(await screen.findByRole('link', { name: 'HC-01' })).toHaveAttribute('href', '/supplies/s1')
})

it('imports supplies with multipart body validated by msw', async () => {
  let imported = false
  server.use(
    http.post('/v1/supplies/import', async ({ request }) => {
      const contentType = request.headers.get('content-type') ?? ''
      if (!contentType.includes('multipart/form-data')) {
        return HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Tệp Excel không hợp lệ' },
          { status: 400 },
        )
      }
      imported = true
      return HttpResponse.json({ created: 1, updated: 0, errors: [] })
    }),
  )
  renderWithProviders(<SuppliesPage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Nhập Excel' }))
  const dialog = within(screen.getByRole('dialog'))
  await userEvent.upload(
    dialog.getByLabelText('Tệp Excel'),
    new File(['xlsx'], 'vat-tu.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  )
  await userEvent.click(dialog.getByRole('button', { name: 'Nhập' }))
  await waitFor(() => expect(imported).toBe(true))
  expect(await dialog.findByText('Đã nhập 1 dòng.')).toBeVisible()
})

it('hiện đủ dòng đã nhập lẫn dòng lỗi khi vật tư nhập một phần', async () => {
  server.use(
    http.post('/v1/supplies/import', () =>
      HttpResponse.json({
        created: 2,
        updated: 0,
        errors: [{ row: 3, field: 'unitCode', message: 'Đơn vị không tồn tại' }],
      }),
    ),
  )
  renderWithProviders(<SuppliesPage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Nhập Excel' }))
  const dialog = within(screen.getByRole('dialog'))
  await userEvent.upload(
    dialog.getByLabelText('Tệp Excel'),
    new File(['xlsx'], 'vat-tu.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  )
  await userEvent.click(dialog.getByRole('button', { name: 'Nhập' }))
  expect(await dialog.findByText('Đã nhập 2 dòng, 1 dòng lỗi.')).toBeVisible()
  expect(dialog.getByText('Đơn vị không tồn tại')).toBeVisible()
  expect(dialog.getByText(/Dòng lỗi KHÔNG được nhập/)).toBeVisible()
})

it('validates supply name', async () => {
  renderWithProviders(<SupplyFormPage />, { path: '/supplies/new', route: '/supplies/new' })
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  expect((await screen.findAllByText('Bắt buộc')).length).toBeGreaterThanOrEqual(2)
})

it('creates a supply', async () => {
  const saved: unknown[] = []
  server.use(
    http.get('/v1/catalogs/units', () =>
      HttpResponse.json([{ id: 'u1', code: 'ML', name: 'Mililit' }]),
    ),
    http.post('/v1/supplies', async ({ request }) => {
      const body = (await request.json()) as { name?: string }
      // Handler kiểm tra field bắt buộc như backend để không che lỗi 400 thật.
      if (!body.name) {
        return HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'name là bắt buộc' },
          { status: 400 },
        )
      }
      saved.push(body)
      return HttpResponse.json({ id: 's2', code: 'HC-02', name: 'Mới' }, { status: 201 })
    }),
  )
  renderWithProviders(<SupplyFormPage />, {
    path: '/supplies/new',
    route: '/supplies/new',
    routes: [{ path: '/supplies/:id', element: <div>DETAIL</div> }],
  })
  await settleForm()
  await userEvent.type(screen.getByLabelText('Tên'), 'Huyết thanh mới')
  await userEvent.type(screen.getByLabelText('ĐVT'), 'Mil')
  await userEvent.click(await screen.findByRole('option', { name: /Mililit/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(saved[0]).toMatchObject({ name: 'Huyết thanh mới' }))
})

it('creates a supply without code — body omits code and toast shows generated one', async () => {
  const saved: Record<string, unknown>[] = []
  server.use(
    http.get('/v1/catalogs/units', () =>
      HttpResponse.json([{ id: 'u1', code: 'ML', name: 'Mililit' }]),
    ),
    http.post('/v1/supplies', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>
      if (!body.name) {
        return HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'name là bắt buộc' },
          { status: 400 },
        )
      }
      saved.push(body)
      return HttpResponse.json({ id: 's3', code: 'VT-00001', name: body.name }, { status: 201 })
    }),
  )
  renderWithProviders(<SupplyFormPage />, {
    path: '/supplies/new',
    route: '/supplies/new',
    routes: [{ path: '/supplies/:id', element: <div>DETAIL</div> }],
  })
  await settleForm()
  expect(screen.getByLabelText('Mã')).toHaveAttribute(
    'placeholder',
    'Để trống sẽ tự sinh (vd VT-00001)',
  )
  await userEvent.type(screen.getByLabelText('Tên'), 'Huyết thanh không mã')
  await userEvent.type(screen.getByLabelText('ĐVT'), 'Mil')
  await userEvent.click(await screen.findByRole('option', { name: /Mililit/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await vi.waitFor(() => expect(saved).toHaveLength(1))
  expect(saved[0]).not.toHaveProperty('code')
  expect(await screen.findByText('Đã tạo vật tư — mã VT-00001')).toBeVisible()
})

it('lists receipts', async () => {
  renderWithProviders(<ReceiptsPage />)
  expect(await screen.findByRole('link', { name: 'NK-1' })).toHaveAttribute(
    'href',
    '/stock/receipts/r1',
  )
})

it('creates an issue with a body validated like the API', async () => {
  const saved: unknown[] = []
  server.use(
    http.get('/v1/catalogs/warehouses', () =>
      HttpResponse.json([{ id: 'w1', code: 'K1', name: 'Kho chính' }]),
    ),
    http.get('/v1/departments', () =>
      HttpResponse.json({ items: [{ id: 'd1', code: 'XN', name: 'Khoa XN' }] }),
    ),
    http.get('/v1/supplies', () =>
      HttpResponse.json({
        items: [{ id: 's1', code: 'HC-01', name: 'Huyết thanh' }],
        total: 1,
        page: 1,
        limit: 20,
      }),
    ),
    http.post('/v1/stock/issues', async ({ request }) => {
      const body = (await request.json()) as {
        warehouseId?: string
        toDepartmentId?: string
        items?: { supplyId?: string; quantity?: string }[]
      }
      if (!body.warehouseId || !body.toDepartmentId || !body.items?.[0]?.supplyId) {
        return HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Thiếu kho/khoa/vật tư' },
          { status: 400 },
        )
      }
      saved.push(body)
      return HttpResponse.json({ id: 'i9', code: 'PX-9' }, { status: 201 })
    }),
  )
  renderWithProviders(<IssueFormPage />, {
    path: '/stock/issues/new',
    route: '/stock/issues/new',
    routes: [{ path: '/stock/issues/:id', element: <div>DETAIL</div> }],
  })
  await settleForm()
  await userEvent.type(screen.getByLabelText('Kho'), 'Kho')
  await userEvent.click(await screen.findByRole('option', { name: /Kho chính/ }))
  await userEvent.type(screen.getByLabelText('Khoa nhận'), 'XN')
  await userEvent.click(await screen.findByRole('option', { name: /Khoa XN/ }))
  await userEvent.type(screen.getByLabelText('Vật tư'), 'Huyết')
  await userEvent.click(await screen.findByRole('option', { name: /Huyết thanh/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }))
  await waitFor(() => expect(saved[0]).toMatchObject({ warehouseId: 'w1', toDepartmentId: 'd1' }))
})

it('creates a receipt with a body validated like the API', async () => {
  const saved: unknown[] = []
  server.use(
    http.get('/v1/catalogs/warehouses', () =>
      HttpResponse.json([{ id: 'w1', code: 'K1', name: 'Kho chính' }]),
    ),
    http.get('/v1/catalogs/suppliers', () =>
      HttpResponse.json([{ id: 'sp1', code: 'NCC1', name: 'Nhà cung cấp 1' }]),
    ),
    http.get('/v1/supplies', () =>
      HttpResponse.json({
        items: [{ id: 's1', code: 'HC-01', name: 'Huyết thanh' }],
        total: 1,
        page: 1,
        limit: 20,
      }),
    ),
    http.get('/v1/supplies/s1', () =>
      HttpResponse.json({
        id: 's1',
        code: 'HC-01',
        name: 'Huyết thanh',
        trackLot: false,
        trackExpiry: false,
      }),
    ),
    http.post('/v1/stock/receipts', async ({ request }) => {
      const body = (await request.json()) as {
        warehouseId?: string
        items?: { supplyId?: string; quantity?: string; unitCost?: string }[]
      }
      if (!body.warehouseId || !body.items?.length || !body.items[0]?.supplyId) {
        return HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Thiếu kho hoặc vật tư' },
          { status: 400 },
        )
      }
      saved.push(body)
      return HttpResponse.json({ id: 'r2', code: 'NK-2' }, { status: 201 })
    }),
  )
  renderWithProviders(<ReceiptFormPage />, {
    path: '/stock/receipts/new',
    route: '/stock/receipts/new',
    routes: [{ path: '/stock/receipts/:id', element: <div>DETAIL</div> }],
  })
  await settleForm()
  await userEvent.type(screen.getByLabelText('Kho'), 'Kho')
  await userEvent.click(await screen.findByRole('option', { name: /Kho chính/ }))
  await userEvent.type(screen.getByLabelText('Nhà cung cấp'), 'Nhà')
  await userEvent.click(await screen.findByRole('option', { name: /Nhà cung cấp 1/ }))
  await userEvent.type(screen.getByLabelText('Vật tư'), 'Huyết')
  await userEvent.click(await screen.findByRole('option', { name: /Huyết thanh/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }))
  await waitFor(() => expect(saved[0]).toMatchObject({ warehouseId: 'w1' }))
})

it('creates a transfer with multiple validated lot lines', async () => {
  const saved: unknown[] = []
  server.use(
    http.get('/v1/stock/issues', () =>
      HttpResponse.json({ items: [], total: 0, page: 1, limit: 20 }),
    ),
    http.get('/v1/catalogs/warehouses', () =>
      HttpResponse.json([
        { id: 'w1', code: 'K1', name: 'Kho nguồn' },
        { id: 'w2', code: 'K2', name: 'Kho đích' },
      ]),
    ),
    http.get('/v1/stock/lots', () =>
      HttpResponse.json({
        items: [
          { id: 'l1', lotNo: 'L01', supplyId: 'supply-1', available: '10' },
          { id: 'l2', lotNo: 'L02', supplyId: 'supply-2', available: '8' },
        ],
        total: 2,
        page: 1,
        limit: 50,
      }),
    ),
    http.post('/v1/stock/transfers', async ({ request }) => {
      const body = (await request.json()) as {
        fromWarehouseId?: string
        toWarehouseId?: string
        items?: Array<{ lotId?: string; quantity?: string }>
      }
      if (
        !body.fromWarehouseId ||
        !body.toWarehouseId ||
        body.fromWarehouseId === body.toWarehouseId ||
        body.items?.length !== 2 ||
        body.items.some((item) => !item.lotId || !item.quantity)
      ) {
        return HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Phiếu chuyển kho không hợp lệ' },
          { status: 400 },
        )
      }
      saved.push(body)
      return HttpResponse.json({ id: 'transfer-1', code: 'CK-1' }, { status: 201 })
    }),
  )
  renderWithProviders(<TransfersPage />)
  await userEvent.click(screen.getByRole('button', { name: 'Tạo chuyển kho' }))
  await screen.findByTestId('form-drawer')
  // Drawer tự focus trường đầu sau khi mở — chờ focus ổn định rồi mới thao tác.
  await waitFor(() => expect(screen.getByLabelText('Số lượng')).toHaveFocus())
  await userEvent.type(screen.getByLabelText('Kho nguồn'), 'nguồn')
  await userEvent.click(await screen.findByRole('option', { name: /Kho nguồn/ }))
  await userEvent.type(screen.getByLabelText('Kho đích'), 'đích')
  await userEvent.click(await screen.findByRole('option', { name: /Kho đích/ }))
  await userEvent.type(screen.getByLabelText('Lô'), 'L01')
  await userEvent.click(await screen.findByRole('option', { name: /L01/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Thêm dòng' }))
  const lotInputs = screen.getAllByLabelText('Lô')
  await userEvent.type(lotInputs[1]!, 'L02')
  await userEvent.click(await screen.findByRole('option', { name: /L02/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(saved).toHaveLength(1))
}, 15_000)

it('gọi API đúng tham số lọc và hiện chip lọc đang áp khi panel thu', async () => {
  localStorage.setItem('filter-panel:stock-receipts', '0')
  let url = ''
  server.use(
    http.get('/v1/stock/receipts', ({ request }) => {
      url = request.url
      return HttpResponse.json({
        items: [
          {
            id: 'r1',
            code: 'NK-1',
            type: 'purchase',
            status: 'draft',
            totalAmount: '1000',
            items: [],
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      })
    }),
  )
  renderWithProviders(<ReceiptsPage />, { route: '/?status=draft' })
  expect(await screen.findByTestId('filter-panel-active-chips')).toHaveTextContent('Nháp')
  await waitFor(() => expect(url).toContain('status=draft'))
  localStorage.removeItem('filter-panel:stock-receipts')
})

it('chọn trạng thái trong panel lọc gọi API với tham số mới', async () => {
  localStorage.setItem('filter-panel:stock-receipts', '1')
  let url = ''
  server.use(
    http.get('/v1/stock/receipts', ({ request }) => {
      url = request.url
      return HttpResponse.json({ items: [], total: 0, page: 1, limit: 20 })
    }),
  )
  renderWithProviders(<ReceiptsPage />)
  await userEvent.click(await screen.findByLabelText('Trạng thái'))
  await userEvent.click(await screen.findByRole('option', { name: 'Nháp' }))
  await waitFor(() => expect(url).toContain('status=draft'))
  localStorage.removeItem('filter-panel:stock-receipts')
})

/** Vật tư tối thiểu để test danh sách dựng được. */
const listSupply = (extra: Record<string, unknown> = {}) => ({
  id: 's1',
  code: 'HC-01',
  name: 'Huyết thanh',
  groupId: null,
  unitId: null,
  packaging: null,
  manufacturerId: null,
  trackLot: false,
  trackExpiry: false,
  trackSerial: false,
  minStock: '0',
  maxStock: '0',
  refPrice: null,
  isActive: true,
  circulationNumber: null,
  circulationValidTo: null,
  riskClass: null,
  ...extra,
})

function mockSupplyList(items: Record<string, unknown>[]) {
  server.use(
    http.get('/v1/supplies', () =>
      HttpResponse.json({ items, total: items.length, page: 1, limit: 20 }),
    ),
  )
}

it('hiện cột hồ sơ mới và cắt đuôi số 0 của numeric', async () => {
  mockSupplyList([
    listSupply({
      groupId: 'g1',
      unitId: 'u1',
      packaging: 'Hộp 10 lọ',
      minStock: '10.0000',
      maxStock: '100.5000',
      circulationNumber: '2500001/ĐKLH',
      circulationValidTo: '2099-01-01',
      riskClass: 'C',
    }),
  ])
  server.use(
    http.get('/v1/catalogs/supply-groups', () =>
      HttpResponse.json([{ id: 'g1', code: 'VTTH', name: 'Vật tư tiêu hao' }]),
    ),
    http.get('/v1/catalogs/units', () =>
      HttpResponse.json([{ id: 'u1', code: 'HOP', name: 'Hộp' }]),
    ),
  )
  renderWithProviders(<SuppliesPage />)
  expect(await screen.findByRole('link', { name: 'HC-01' })).toBeInTheDocument()
  const row = screen.getByRole('row', { name: /HC-01/ })
  expect(within(row).getByText('Vật tư tiêu hao')).toBeVisible()
  expect(within(row).getByText('Hộp')).toBeVisible()
  expect(within(row).getByText('Hộp 10 lọ')).toBeVisible()
  expect(within(row).getByText('Loại C')).toBeVisible()
  expect(within(row).getByText('2500001/ĐKLH')).toBeVisible()
  // numeric(14,3): "10.0000" → "10"; "100.5000" → "100,5".
  expect(within(row).getByText('10')).toBeVisible()
  expect(within(row).getByText('100,5')).toBeVisible()
})

it('tô đỏ số lưu hành đã hết hạn và vàng khi còn ≤ 60 ngày', async () => {
  const soon = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)
  mockSupplyList([
    listSupply({
      id: 's1',
      code: 'HS-01',
      name: 'Quá hạn',
      circulationNumber: 'SO-1',
      circulationValidTo: '2020-01-01',
    }),
    listSupply({
      id: 's2',
      code: 'HS-02',
      name: 'Sắp hạn',
      circulationNumber: 'SO-2',
      circulationValidTo: soon,
    }),
  ])
  renderWithProviders(<SuppliesPage />)
  expect(await screen.findByRole('link', { name: 'HS-01' })).toBeInTheDocument()
  const danger = screen.getByText('Đã hết hiệu lực').closest('[data-slot="badge"]')
  expect(danger).toHaveAttribute('data-variant', 'danger')
  expect(danger).toHaveAttribute('data-tone', 'danger')
  const warning = screen.getByText(/Còn \d+ ngày/).closest('[data-slot="badge"]')
  expect(warning).toHaveAttribute('data-variant', 'warning')
  expect(warning).toHaveAttribute('data-tone', 'warning')
})

it('cột hãng ẩn mặc định, bật được qua nút Cột', async () => {
  mockSupplyList([listSupply({ manufacturerId: 'm1' })])
  server.use(
    http.get('/v1/catalogs/manufacturers', () =>
      HttpResponse.json([{ id: 'm1', code: 'MH', name: 'Hãng A' }]),
    ),
  )
  renderWithProviders(<SuppliesPage />)
  await screen.findByRole('link', { name: 'HC-01' })
  expect(screen.queryByRole('columnheader', { name: 'Hãng sản xuất' })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Cột' }))
  await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Hãng sản xuất' }))
  await userEvent.keyboard('{Escape}')
  expect(await screen.findByRole('columnheader', { name: 'Hãng sản xuất' })).toBeInTheDocument()
  expect(screen.getByText('Hãng A')).toBeVisible()
})
