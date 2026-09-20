import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { Component as Notifications } from './NotificationsPage'
import { Component as Preferences } from './PreferencesPage'
import { GlobalSearch } from '@/app/layout/GlobalSearch'
const notification = {
  id: 'n1',
  createdAt: '2026-09-19T00:00:00Z',
  type: 'request.pending',
  title: 'Phiếu chờ duyệt',
  body: 'Nội dung',
  readAt: null,
  data: { requestId: 'r1' },
}
it('lists, filters unread, marks all and navigates by notification data', async () => {
  const queries: string[] = [],
    read = vi.fn()
  server.use(
    http.get('/v1/notifications', ({ request }) => {
      queries.push(request.url)
      return HttpResponse.json({
        items: [notification],
        total: 1,
        page: 1,
        limit: 20,
        unreadCount: 1,
      })
    }),
    http.post('/v1/notifications/read-all', () => {
      read()
      return new HttpResponse(null, { status: 204 })
    }),
    http.post('/v1/notifications/n1/read', () => new HttpResponse(null, { status: 204 })),
  )
  const { router } = renderWithProviders(<Notifications />)
  await screen.findByText('Phiếu chờ duyệt')
  await userEvent.click(screen.getByRole('switch'))
  await waitFor(() => expect(queries.some((q) => q.includes('unread=true'))).toBe(true))
  await userEvent.click(screen.getByRole('button', { name: /Đánh dấu tất cả/ }))
  await waitFor(() => expect(read).toHaveBeenCalled())
  await userEvent.click(screen.getByText('Phiếu chờ duyệt'))
  expect(router.state.location.pathname).toBe('/requests/r1')
})
it('filters type across pages rather than only the displayed page', async () => {
  server.use(
    http.get('/v1/notifications', ({ request }) => {
      const page = new URL(request.url).searchParams.get('page')
      return HttpResponse.json({
        items:
          page === '2'
            ? [notification]
            : [{ ...notification, id: 'other', type: 'maintenance.done', title: 'Bảo dưỡng' }],
        total: 2,
        page: Number(page),
        limit: 200,
        unreadCount: 1,
      })
    }),
  )
  renderWithProviders(<Notifications />, { route: '/notifications?type=request.pending' })
  expect(await screen.findByText('Phiếu chờ duyệt')).toBeVisible()
  expect(screen.queryByText('Bảo dưỡng')).not.toBeInTheDocument()
})
it('loads preferences and saves only changed types', async () => {
  const saved = vi.fn()
  server.use(
    http.get('/v1/notifications/preferences', () =>
      HttpResponse.json([{ type: 'request.pending', push: true, inapp: true }]),
    ),
    http.put('/v1/notifications/preferences', async ({ request }) => {
      saved(await request.json())
      return new HttpResponse(null, { status: 204 })
    }),
  )
  renderWithProviders(<Preferences />)
  await userEvent.click(
    await screen.findByRole('switch', { name: 'Đẩy tới thiết bị — Phiếu yêu cầu chờ duyệt' }),
  )
  await userEvent.click(screen.getByRole('button', { name: 'Lưu tuỳ chọn' }))
  await waitFor(() =>
    expect(saved).toHaveBeenCalledWith({
      preferences: [{ type: 'request.pending', push: false, inapp: true }],
    }),
  )
})
it('keeps edited preferences on server error', async () => {
  server.use(
    http.get('/v1/notifications/preferences', () => HttpResponse.json([])),
    http.put('/v1/notifications/preferences', () =>
      HttpResponse.json({ code: 'FORBIDDEN' }, { status: 403 }),
    ),
  )
  renderWithProviders(<Preferences />)
  const toggle = await screen.findByRole('switch', {
    name: 'Đẩy tới thiết bị — Phiếu yêu cầu chờ duyệt',
  })
  await userEvent.click(toggle)
  await userEvent.click(screen.getByRole('button', { name: 'Lưu tuỳ chọn' }))
  expect(await screen.findByText('Bạn không có quyền thực hiện')).toBeVisible()
  expect(toggle).toHaveAttribute('aria-checked', 'false')
})
it('searches four endpoints and opens a grouped result with Enter', async () => {
  const calls: string[] = []
  for (const kind of ['equipment', 'supplies', 'repairs', 'requests'])
    server.use(
      http.get(`/v1/${kind}`, ({ request }) => {
        calls.push(request.url)
        return HttpResponse.json({
          items: kind === 'equipment' ? [{ id: 'e1', code: 'XN1', name: 'Máy xét nghiệm' }] : [],
        })
      }),
    )
  const { router } = renderWithProviders(<GlobalSearch />)
  await userEvent.keyboard('{Control>}k{/Control}')
  await userEvent.type(screen.getByRole('combobox'), 'XN')
  expect(await screen.findByRole('option', { name: /XN1/ })).toBeVisible()
  expect(calls).toHaveLength(4)
  expect(calls.every((c) => c.includes('limit=5') && c.includes('q=XN'))).toBe(true)
  await userEvent.keyboard('{ArrowDown}{Enter}')
  expect(router.state.location.pathname).toBe('/equipment/e1')
})
