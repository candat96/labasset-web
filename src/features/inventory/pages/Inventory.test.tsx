import { screen, waitFor } from '@testing-library/react'
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
  await userEvent.type(screen.getByLabelText('Tên'), 'Huyết thanh mới')
  await userEvent.type(screen.getByLabelText('ĐVT'), 'Mil')
  await userEvent.click(await screen.findByRole('option', { name: /Mililit/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(saved[0]).toMatchObject({ name: 'Huyết thanh mới' }))
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
  await userEvent.type(screen.getByLabelText('Kho'), 'Kho')
  await userEvent.click(await screen.findByRole('option', { name: /Kho chính/ }))
  await userEvent.type(screen.getByLabelText('Nhà cung cấp'), 'Nhà')
  await userEvent.click(await screen.findByRole('option', { name: /Nhà cung cấp 1/ }))
  await userEvent.type(screen.getByLabelText('Vật tư'), 'Huyết')
  await userEvent.click(await screen.findByRole('option', { name: /Huyết thanh/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }))
  await waitFor(() => expect(saved[0]).toMatchObject({ warehouseId: 'w1' }))
})
