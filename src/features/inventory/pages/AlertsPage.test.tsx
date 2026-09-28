import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component as AlertsPage } from './AlertsPage'

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
})

it('hiện loại cảnh báo mới "Đến điểm đặt hàng"', async () => {
  server.use(
    http.get('/v1/stock/alerts', () =>
      HttpResponse.json({
        items: [
          {
            id: 'a1',
            type: 'reorder',
            message:
              'Đến điểm đặt hàng: HC-01 – Huyết thanh còn khả dụng 15.000 / điểm đặt hàng 35.000',
            supplyId: 's1',
            supplyName: 'Huyết thanh',
            warehouseName: null,
            lotNo: null,
            severity: 'warning',
            createdAt: '2026-09-28T00:00:00.000Z',
            resolvedAt: null,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      }),
    ),
  )
  renderWithProviders(<AlertsPage />, { path: '/stock/alerts', route: '/stock/alerts' })
  expect(await screen.findByText('Đến điểm đặt hàng')).toBeVisible()
  expect(screen.getByText('Huyết thanh')).toBeVisible()
})
