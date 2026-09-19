import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component as Transfers } from './TransfersPage'
import { Component as Compare } from './ComparePage'
import { Component as ByQr } from './ByQrPage'

beforeEach(() => useAuthStore.getState().setSession(fakeSession()))

it('approves a transfer from the hospital-wide list drawer', async () => {
  const called: string[] = []
  server.use(
    http.get('/v1/equipment/transfers', () =>
      HttpResponse.json({
        items: [
          {
            id: 't1',
            equipmentId: 'e1',
            fromDepartmentId: 'd1',
            toDepartmentId: 'd2',
            fromLocation: null,
            toLocation: null,
            reason: 'Chuyển',
            requestedBy: 'u1',
            approvedBy: null,
            status: 'pending',
            transferredAt: null,
            minutesFileId: null,
            note: null,
            createdAt: '2026-09-19T00:00:00Z',
            attachments: [],
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      }),
    ),
    http.post('/v1/equipment/e1/transfers/t1/approve', () => {
      called.push('ok')
      return HttpResponse.json({ id: 't1', status: 'approved' })
    }),
  )
  renderWithProviders(<Transfers />)
  await userEvent.click(await screen.findByText('Chuyển'))
  await userEvent.click(await screen.findByRole('button', { name: 'Duyệt' }))
  await waitFor(() => expect(called).toEqual(['ok']))
})

it('highlights differing compare fields', async () => {
  server.use(
    http.get('/v1/equipment/compare', () =>
      HttpResponse.json({
        items: [
          {
            id: 'e1',
            code: 'A',
            name: 'Máy A',
            model: 'M1',
            serial: 'S1',
            status: 'active',
            location: 'P1',
          },
          {
            id: 'e2',
            code: 'B',
            name: 'Máy B',
            model: 'M2',
            serial: 'S1',
            status: 'active',
            location: 'P1',
          },
        ],
        diff: ['model'],
      }),
    ),
    http.get('/v1/equipment', () => HttpResponse.json({ items: [], total: 0, page: 1, limit: 20 })),
  )
  renderWithProviders(<Compare />, {
    route: '/equipment/compare?ids=e1,e2',
    path: '/equipment/compare',
  })
  expect(await screen.findByText(/M1/)).toBeVisible()
  expect(screen.getByText(/model: M1/).className).toMatch(/bg-warning/)
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
