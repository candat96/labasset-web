import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component as DashboardPage } from './DashboardPage'

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/dashboard', () =>
      HttpResponse.json({
        generatedAt: '2026-09-21T00:00:00Z',
        cards: [
          { key: 'equipment.total', title: 'Tổng thiết bị', value: 4, link: '/equipment' },
          {
            key: 'equipment.active',
            title: 'Đang hoạt động',
            value: 3,
            link: '/equipment?status=active',
          },
          {
            key: 'stock.value',
            title: 'Giá trị tồn',
            value: '1000000',
            unit: 'VND',
            link: '/stock/balances',
          },
        ],
      }),
    ),
  )
})

it('renders KPI cards from GET /v1/dashboard including VND strings', async () => {
  renderWithProviders(<DashboardPage />)
  expect(await screen.findAllByTestId('kpi-card')).toHaveLength(3)
  expect(screen.getByText('Tổng thiết bị')).toBeVisible()
  expect(screen.getByText('1.000.000 ₫')).toBeVisible()
})
