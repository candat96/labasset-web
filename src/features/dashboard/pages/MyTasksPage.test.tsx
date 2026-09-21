import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { Component } from './MyTasksPage'

it('renders and sorts counters from GET /v1/me/tasks', async () => {
  server.use(
    http.get('/v1/me/tasks', () =>
      HttpResponse.json({
        repairs: { assigned: 2, pendingResponse: 1, overdue: 3 },
        maintenance: { due7d: 4, overdue: 0 },
        requests: { pendingApproval: 5, pendingIssue: 0, pendingReceive: 1 },
        stocktakes: { counting: 2 },
        alerts: {
          repairsNew: 1,
          calibrationOverdue: 0,
          stock: { low_stock: 2, expiring: 1, expired: 0, open_vial_expiring: 0, stale: 0 },
        },
      }),
    ),
  )
  renderWithProviders(<Component />)
  expect(await screen.findByText('Phiếu chờ duyệt')).toBeVisible()
  expect(screen.getByText('Bảo dưỡng đến hạn 7 ngày')).toBeVisible()
  expect(screen.getAllByText('5')).toHaveLength(1)
})
