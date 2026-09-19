import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component as StocktakesPage } from './StocktakesPage'
import { Component as StocktakeDetailPage } from './StocktakeDetailPage'
import { Component as StocktakeComparePage } from './StocktakeComparePage'

const session = {
  id: 'k1',
  code: 'KK-1',
  name: 'Kiểm kho 9',
  type: 'supply',
  scopeType: 'all',
  scopeId: null,
  status: 'counting',
  notes: null,
  plannedAt: null,
  snapshotAt: '2026-09-19T00:00:00Z',
  closedAt: null,
  closedBy: null,
  createdAt: '2026-09-19T00:00:00Z',
  createdBy: 'u1',
  updatedAt: '2026-09-19T00:00:00Z',
  assignments: [],
  counts: { total: 1, counted: 0, diff: 0 },
}

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/stocktakes', () =>
      HttpResponse.json({
        items: [
          {
            id: 'k1',
            code: 'KK-1',
            name: 'Kiểm kho 9',
            type: 'supply',
            scopeType: 'all',
            status: 'draft',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      }),
    ),
    http.get('/v1/stocktakes/:id/progress', () =>
      HttpResponse.json({
        total: 1,
        counted: 0,
        percent: 0,
        byAssignee: [],
        unassigned: { total: 1, counted: 0, percent: 0 },
      }),
    ),
    http.get('/v1/stocktakes/:id/items', () =>
      HttpResponse.json({
        items: [{ id: 'i1', code: 'VT-1', bookQty: '10', countedQty: null }],
        total: 1,
        page: 1,
        limit: 50,
      }),
    ),
    http.get('/v1/stocktakes/:id/extras', () => HttpResponse.json([])),
    http.get('/v1/stocktakes/:id/package', () =>
      HttpResponse.json({
        sessionId: 'k1',
        items: [
          {
            itemId: 'i1',
            code: 'VT-1',
            name: 'Găng',
            bookQty: '10',
            lotNo: 'L1',
            location: null,
            equipmentId: null,
            lotId: 'lot1',
          },
        ],
      }),
    ),
    http.get('/v1/audit-logs/entity/:type/:id', () =>
      HttpResponse.json({ items: [], total: 0, page: 1, limit: 20 }),
    ),
    http.get('/v1/users', () => HttpResponse.json({ items: [], total: 0, page: 1, limit: 200 })),
  )
})

it('lists stocktakes', async () => {
  renderWithProviders(<StocktakesPage />)
  expect(await screen.findByRole('link', { name: 'KK-1' })).toHaveAttribute(
    'href',
    '/stocktakes/k1',
  )
})

it('posts counts with clientId after Ghi and Gửi', async () => {
  const posted: unknown[] = []
  server.use(
    http.get('/v1/stocktakes/k1', () => HttpResponse.json(session)),
    http.post('/v1/stocktakes/:id/counts', async ({ request }) => {
      posted.push(await request.json())
      return HttpResponse.json({ accepted: 1, duplicated: 0, conflicts: [], extras: [] })
    }),
  )
  renderWithProviders(<StocktakeDetailPage />, { path: '/stocktakes/:id', route: '/stocktakes/k1' })
  await userEvent.click(await screen.findByRole('tab', { name: 'Đếm trên web' }))
  await userEvent.type(await screen.findByLabelText('Quét / nhập mã'), 'VT-1')
  await userEvent.click(screen.getByRole('button', { name: 'Ghi' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Gửi (1)' }))
  await waitFor(() => expect(posted).toHaveLength(1))
  const body = posted[0] as { counts: { clientId: string; countedQty: string }[] }
  expect(body.counts[0]?.clientId).toEqual(expect.any(String))
  expect(body.counts[0]?.clientId.length).toBeGreaterThan(0)
})

it('compare page renders repeated column', async () => {
  server.use(
    http.get('/v1/stocktakes/:id/compare', () =>
      HttpResponse.json({
        items: [
          {
            key: 'lot1',
            code: 'VT-1',
            name: 'Găng',
            prevDiff: '1',
            currDiff: '-1',
          },
        ],
        summary: { prevDiffCount: 1, currDiffCount: 1, repeated: 1 },
      }),
    ),
  )
  renderWithProviders(<StocktakeComparePage />, {
    path: '/stocktakes/:id/compare',
    route: '/stocktakes/k1/compare?withSessionId=k0',
  })
  expect(await screen.findByRole('columnheader', { name: 'Lặp lại' })).toBeVisible()
  expect(await screen.findByText('✓')).toBeVisible()
})
