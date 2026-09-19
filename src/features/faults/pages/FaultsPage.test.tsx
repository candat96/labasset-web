import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './FaultsPage'

const row = {
  id: 'f1',
  errorCode: 'E-01',
  title: 'Không hút mẫu',
  model: 'XN-1000',
  scope: 'model',
  severity: 'high',
  status: 'published',
  helpfulCount: 3,
  viewCount: 12,
  version: 2,
  updatedAt: '2026-09-19T00:00:00Z',
}

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/faults', () => HttpResponse.json({ items: [row], total: 1, page: 1, limit: 20 })),
    http.get('/v1/faults/suggestions', () =>
      HttpResponse.json({ items: [], total: 2, page: 1, limit: 1 }),
    ),
    http.get('/v1/catalogs/:name', () => HttpResponse.json([])),
  )
})

it('lists faults and keeps filters on the URL', async () => {
  const urls: string[] = []
  server.use(
    http.get('/v1/faults', ({ request }) => {
      urls.push(request.url)
      return HttpResponse.json({ items: [row], total: 1, page: 1, limit: 20 })
    }),
  )
  const { router } = renderWithProviders(<Component />)
  expect(await screen.findByRole('link', { name: 'E-01' })).toHaveAttribute('href', '/faults/f1')
  expect(screen.getByText('Không hút mẫu')).toBeVisible()
  await userEvent.type(screen.getByLabelText('Tìm lỗi'), 'hut')
  await waitFor(() => expect(urls.some((u) => u.includes('q=hut'))).toBe(true))
  expect(router.state.location.search).toContain('q=hut')
})

it('hides write actions for DEPT_USER', async () => {
  useAuthStore.getState().setSession(fakeSession(['DEPT_USER']))
  renderWithProviders(<Component />)
  expect(await screen.findByText('Không hút mẫu')).toBeVisible()
  expect(screen.queryByRole('link', { name: 'Thêm lỗi' })).not.toBeInTheDocument()
  expect(screen.queryByRole('link', { name: /Đề xuất chờ duyệt/ })).not.toBeInTheDocument()
})

it('shows pending suggestion badge for admin', async () => {
  renderWithProviders(<Component />)
  expect(await screen.findByRole('link', { name: 'Đề xuất chờ duyệt (2)' })).toBeVisible()
})
