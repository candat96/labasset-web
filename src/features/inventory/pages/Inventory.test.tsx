import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component as SuppliesPage } from './SuppliesPage'
import { Component as SupplyFormPage } from './SupplyFormPage'
import { Component as ReceiptsPage } from './ReceiptsPage'

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
  expect(await screen.findByText('Bắt buộc')).toBeVisible()
})

it('creates a supply', async () => {
  const saved: unknown[] = []
  server.use(
    http.post('/v1/supplies', async ({ request }) => {
      saved.push(await request.json())
      return HttpResponse.json({ id: 's2', code: 'HC-02', name: 'Mới' }, { status: 201 })
    }),
  )
  renderWithProviders(<SupplyFormPage />, {
    path: '/supplies/new',
    route: '/supplies/new',
    routes: [{ path: '/supplies/:id', element: <div>DETAIL</div> }],
  })
  await userEvent.type(screen.getByLabelText('Tên'), 'Huyết thanh mới')
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
