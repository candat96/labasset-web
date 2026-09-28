import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component as BalancesPage } from './BalancesPage'

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/stock/balances', () =>
      HttpResponse.json({ items: [], total: 0, page: 1, limit: 20 }),
    ),
    http.get('/v1/stock/value', () => HttpResponse.json({ value: '1000000' })),
    http.get('/v1/catalogs/warehouses', () => HttpResponse.json([])),
    http.get('/v1/reports/stock.turnover', () =>
      HttpResponse.json({
        columns: [],
        rows: [
          { outValue: '2000000', avgValue: '4000000' },
          { outValue: '1000000', avgValue: '1000000' },
        ],
        total: 2,
        page: 1,
        limit: 1000,
      }),
    ),
    http.get('/v1/reports/stock.count-accuracy', () =>
      HttpResponse.json({
        columns: [],
        rows: [{ totalLines: 10, matchedLines: 9 }],
        total: 1,
        page: 1,
        limit: 1000,
      }),
    ),
  )
})

it('hiện chỉ số vòng quay tồn kỳ hiện tại', async () => {
  renderWithProviders(<BalancesPage />, { path: '/stock', route: '/stock' })
  // (2.000.000 + 1.000.000) / (4.000.000 + 1.000.000) = 0,6
  expect(await screen.findByText('0,6')).toBeVisible()
  expect(screen.getByText('Vòng quay tồn')).toBeVisible()
})

it('hiện chỉ số độ chính xác tồn kỳ hiện tại', async () => {
  renderWithProviders(<BalancesPage />, { path: '/stock', route: '/stock' })
  // 9 dòng khớp / 10 tổng dòng = 90%
  expect(await screen.findByText('90%')).toBeVisible()
  expect(screen.getByText('Độ chính xác tồn')).toBeVisible()
})

it('bấm thẻ mở báo cáo đầy đủ tương ứng', async () => {
  renderWithProviders(<BalancesPage />, { path: '/stock', route: '/stock' })
  expect((await screen.findByText('Vòng quay tồn')).closest('a')).toHaveAttribute(
    'href',
    '/reports?key=stock.turnover',
  )
  expect(screen.getByText('Độ chính xác tồn').closest('a')).toHaveAttribute(
    'href',
    '/reports?key=stock.count-accuracy',
  )
})
