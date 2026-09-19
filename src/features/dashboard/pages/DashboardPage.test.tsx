import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component as DashboardPage } from './DashboardPage'

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/equipment', () => HttpResponse.json({ items: [], total: 4, page: 1, limit: 1 })),
    http.get('/v1/repairs', () => HttpResponse.json({ items: [], total: 2, page: 1, limit: 1 })),
    http.get('/v1/maintenance/tasks', () =>
      HttpResponse.json({ items: [], total: 1, page: 1, limit: 1 }),
    ),
    http.get('/v1/requests', () => HttpResponse.json({ items: [], total: 3, page: 1, limit: 1 })),
    http.get('/v1/stock/alerts', () =>
      HttpResponse.json({ items: [], total: 5, page: 1, limit: 1 }),
    ),
  )
})

it('renders KPI cards from live list totals', async () => {
  renderWithProviders(<DashboardPage />)
  expect(await screen.findAllByTestId('kpi-card')).toHaveLength(7)
  expect(screen.queryByText('Dữ liệu mẫu')).not.toBeInTheDocument()
})
