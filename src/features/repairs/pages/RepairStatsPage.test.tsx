import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './RepairStatsPage'

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/repairs/stats', () =>
      HttpResponse.json({
        groups: [
          {
            key: '2026-09',
            label: '09/2026',
            tickets: 4,
            completed: 2,
            cost: '1000000',
            downtimeHours: 3,
            mttrHours: 2,
          },
        ],
        topFaults: [{ faultId: 'f1', title: 'Kẹt kim', count: 3 }],
        totals: { tickets: 10, completed: 6, cost: '5000000', downtimeHours: 12, mttrHours: 4.5 },
        mtbfHours: 40,
      }),
    ),
    http.get('/v1/repairs/workload', () =>
      HttpResponse.json([
        { id: 'u1', fullName: 'Kỹ thuật A', open: 2, overdue: 1, awaitingResponse: 0 },
      ]),
    ),
    http.get('/v1/repairs', () => HttpResponse.json({ items: [], total: 3, page: 1, limit: 1 })),
  )
})

it('renders KPI cards and workload', async () => {
  renderWithProviders(<Component />)
  expect(await screen.findByText('Tổng phiếu')).toBeVisible()
  expect(await screen.findByText('10')).toBeVisible()
  expect(await screen.findByText('Kẹt kim')).toBeVisible()
  expect(await screen.findByText('Kỹ thuật A')).toBeVisible()
})
