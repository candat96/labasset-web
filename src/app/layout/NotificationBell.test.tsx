import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { NotificationBell } from './NotificationBell'

vi.mock('@/features/notifications/stream', () => ({
  openNotificationStream: vi.fn(() => Promise.resolve()),
  parseSse: vi.fn(),
}))

const page = (unreadCount: number) => ({
  total: 1,
  page: 1,
  limit: 8,
  unreadCount,
  items: [
    {
      id: 'n1',
      createdAt: new Date().toISOString(),
      userId: 'u1',
      type: 'repair.assigned',
      title: 'Phiếu sửa chữa mới',
      body: 'Bạn được phân công',
      data: { path: '/repairs/1' },
      readAt: null,
    },
  ],
})

beforeEach(() => useAuthStore.getState().setSession(fakeSession()))

it('shows unread badge and marks read on click', async () => {
  let read = false
  server.use(
    http.get('/v1/notifications', () => HttpResponse.json(page(read ? 0 : 3))),
    http.post('/v1/notifications/n1/read', () => {
      read = true
      return new HttpResponse(null, { status: 204 })
    }),
  )
  const { router } = renderWithProviders(<NotificationBell />, {
    routes: [{ path: '/repairs/1', element: <div>REPAIR</div> }],
  })
  expect(await screen.findByTestId('unread-badge')).toHaveTextContent('3')
  await userEvent.click(screen.getByRole('button', { name: /Thông báo/ }))
  await userEvent.click(await screen.findByText('Phiếu sửa chữa mới'))
  await vi.waitFor(() => expect(read).toBe(true))
  await vi.waitFor(() => expect(router.state.location.pathname).toBe('/repairs/1'))
})
