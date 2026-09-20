import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component as RequestsPage } from './RequestsPage'
import { Component as RequestFormPage } from './RequestFormPage'

const row = {
  id: 'q1',
  code: 'PYC-1',
  type: 'supply',
  status: 'submitted',
  departmentName: 'XN',
  requesterName: 'A',
  priority: 'normal',
  neededBy: null,
  quotaExceeded: false,
  itemCount: 1,
  createdAt: '2026-09-19T00:00:00Z',
}

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/requests', () =>
      HttpResponse.json({ items: [row], total: 1, page: 1, limit: 20 }),
    ),
    http.get('/v1/departments', () => HttpResponse.json({ items: [] })),
    http.get('/v1/equipment', () => HttpResponse.json({ items: [] })),
    http.get('/v1/supplies', () =>
      HttpResponse.json({
        items: [{ id: 's1', code: 'HC-01', name: 'Huyết thanh' }],
        total: 1,
        page: 1,
        limit: 20,
      }),
    ),
  )
})

it('lists requests', async () => {
  renderWithProviders(<RequestsPage />)
  expect(await screen.findByRole('link', { name: 'PYC-1' })).toHaveAttribute('href', '/requests/q1')
})

it('creates a draft request', async () => {
  const saved: unknown[] = []
  server.use(
    http.post('/v1/requests', async ({ request }) => {
      const body = (await request.json()) as {
        type?: string
        items?: { supplyId?: string; qtyRequested?: string }[]
      }
      // Phiếu vật tư phải có ít nhất 1 dòng hợp lệ (giống backend).
      if (
        !body.type ||
        (body.type === 'supply' &&
          (!body.items?.length || !body.items[0]?.supplyId || !body.items[0]?.qtyRequested))
      ) {
        return HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Thiếu dòng vật tư' },
          { status: 400 },
        )
      }
      saved.push(body)
      return HttpResponse.json({ id: 'q2', code: 'PYC-2' }, { status: 201 })
    }),
  )
  renderWithProviders(<RequestFormPage />, {
    path: '/requests/new',
    route: '/requests/new',
    routes: [{ path: '/requests/:id', element: <div>DETAIL</div> }],
  })
  await userEvent.type(screen.getByLabelText('Vật tư'), 'Huyết')
  await userEvent.click(await screen.findByRole('option', { name: /Huyết thanh/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }))
  await waitFor(() =>
    expect(saved[0]).toMatchObject({
      type: 'supply',
      priority: 'normal',
      items: [{ supplyId: 's1', qtyRequested: '1' }],
    }),
  )
})
