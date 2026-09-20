import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { dayRangeToIso } from '@/lib/format/date-range'
import { Component } from './RepairStatsPage'

const statsBody = {
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
}

it('renders KPI cards and workload for admin', async () => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/repairs/stats', () => HttpResponse.json(statsBody)),
    http.get('/v1/repairs/workload', () =>
      HttpResponse.json([
        { id: 'u1', fullName: 'Kỹ thuật A', open: 2, overdue: 1, awaitingResponse: 0 },
      ]),
    ),
    http.get('/v1/repairs', () => HttpResponse.json({ items: [], total: 3, page: 1, limit: 1 })),
  )
  renderWithProviders(<Component />)
  expect(await screen.findByText('Tổng phiếu')).toBeVisible()
  expect(await screen.findByText('10')).toBeVisible()
  expect(await screen.findByText('Kẹt kim')).toBeVisible()
  expect(await screen.findByText('Kỹ thuật A')).toBeVisible()
})

it('giữ from/to trên URL, gửi ISO và không gọi trùng groupBy=month', async () => {
  const urls: string[] = []
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/repairs/stats', ({ request }) => {
      urls.push(request.url)
      return HttpResponse.json(statsBody)
    }),
    http.get('/v1/repairs/workload', () => HttpResponse.json([])),
    http.get('/v1/repairs', () => HttpResponse.json({ items: [], total: 0, page: 1, limit: 1 })),
  )
  const range = dayRangeToIso('2026-08-01', '2026-09-30')
  renderWithProviders(<Component />, {
    route: '/repairs/stats?from=2026-08-01&to=2026-09-30',
  })
  await waitFor(() => expect(urls.length).toBeGreaterThanOrEqual(3))
  const monthCalls = urls.filter((url) => new URL(url).searchParams.get('groupBy') === 'month')
  expect(monthCalls).toHaveLength(1)
  const query = new URL(monthCalls[0]!).searchParams
  expect(query.get('from')).toBe(range.from)
  expect(query.get('to')).toBe(range.to)
})

it('DEPT_HEAD không gọi stats/workload và thấy thông báo quyền', async () => {
  const statUrls: string[] = []
  const workloadUrls: string[] = []
  useAuthStore.getState().setSession(fakeSession(['DEPT_HEAD']))
  server.use(
    http.get('/v1/repairs/stats', ({ request }) => {
      statUrls.push(request.url)
      return HttpResponse.json(statsBody)
    }),
    http.get('/v1/repairs/workload', ({ request }) => {
      workloadUrls.push(request.url)
      return HttpResponse.json([])
    }),
    http.get('/v1/repairs', () => HttpResponse.json({ items: [], total: 0, page: 1, limit: 1 })),
  )
  renderWithProviders(<Component />)
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Bạn không có quyền xem thống kê sửa chữa.',
  )
  expect(statUrls).toHaveLength(0)
  expect(workloadUrls).toHaveLength(0)
})
