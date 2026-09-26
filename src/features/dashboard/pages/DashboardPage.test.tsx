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
          { key: 'equipment.broken', title: 'Hỏng', value: 2, link: '/equipment?status=broken' },
          {
            key: 'repair.overdueSla',
            title: 'Quá hạn SLA',
            value: 5,
            link: '/repairs?overdue=true',
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

it('vẽ đủ ô chỉ số theo thứ tự API trả về', async () => {
  renderWithProviders(<DashboardPage />)
  const tiles = await screen.findAllByTestId('kpi-tile')
  expect(tiles).toHaveLength(5)
  expect(tiles[0]?.textContent).toContain('Tổng thiết bị')
  expect(tiles.map((el) => el.textContent).join(' ')).toContain('Quá hạn SLA')
})

it('hiển thị tiền tệ và liên kết sang danh sách đã lọc', async () => {
  renderWithProviders(<DashboardPage />)
  expect(await screen.findByText('1.000.000 ₫')).toBeVisible()
  expect(screen.getByText('Hỏng').closest('a')).toHaveAttribute('href', '/equipment?status=broken')
})
