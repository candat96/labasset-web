import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession, fakeUser } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component as Users } from './UsersPage'
import { Component as Detail } from './UserDetailPage'
const user = { ...fakeUser(), isActive: true, lastLoginAt: '2026-09-01T00:00:00Z' }
beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/departments', ({ request }) =>
      HttpResponse.json(
        new URL(request.url).searchParams.get('all') === 'true'
          ? [{ id: 'd1', code: 'XN', name: 'Xét nghiệm' }]
          : { items: [{ id: 'd1', code: 'XN', name: 'Xét nghiệm' }] },
      ),
    ),
    http.get('/v1/users', () => HttpResponse.json({ items: [user], total: 1, page: 1, limit: 20 })),
    http.get('/v1/users/u1', () => HttpResponse.json(user)),
  )
})
it('lists and filters users on the URL', async () => {
  const searches: string[] = []
  server.use(
    http.get('/v1/users', ({ request }) => {
      searches.push(request.url)
      return HttpResponse.json({ items: [user], total: 1, page: 1, limit: 20 })
    }),
  )
  const { router } = renderWithProviders(<Users />)
  expect(await screen.findByRole('link', { name: 'admin' })).toHaveAttribute(
    'href',
    '/admin/users/u1',
  )
  await userEvent.type(screen.getByLabelText('Tìm người dùng'), 'abc')
  await waitFor(() => expect(searches.some((s) => s.includes('q=abc'))).toBe(true))
  expect(router.state.location.search).toContain('q=abc')
})
it('validates department role, submits field errors then shows a one-time password', async () => {
  userEvent.setup() // Clipboard API for jsdom, matching a secure browser context.
  const saved: unknown[] = []
  server.use(
    http.post('/v1/users', async ({ request }) => {
      const body = (await request.json()) as { username: string }
      saved.push(body)
      return body.username === 'taken'
        ? HttpResponse.json(
            { code: 'VALIDATION_ERROR', details: ['username đã tồn tại'] },
            { status: 400 },
          )
        : HttpResponse.json({ user, tempPassword: 'Tmp!123456' })
    }),
  )
  renderWithProviders(<Users />)
  await userEvent.click(screen.getByRole('button', { name: 'Thêm người dùng' }))
  const form = within(screen.getByRole('dialog'))
  await userEvent.type(form.getByLabelText('Tài khoản'), 'taken')
  await userEvent.type(form.getByLabelText('Họ tên'), 'Nguyễn An')
  await userEvent.click(form.getByRole('checkbox', { name: 'Nhân viên khoa' }))
  await userEvent.click(form.getByRole('button', { name: 'Lưu' }))
  expect(await form.findByText('Vai trò khoa bắt buộc chọn khoa/phòng')).toBeVisible()
  await userEvent.click(form.getByRole('combobox', { name: 'Khoa/phòng' }))
  await userEvent.click(await screen.findByRole('option', { name: 'XN — Xét nghiệm' }))
  await userEvent.click(form.getByRole('button', { name: 'Lưu' }))
  expect(await form.findByText('username đã tồn tại')).toBeVisible()
  await userEvent.clear(form.getByLabelText('Tài khoản'))
  await userEvent.type(form.getByLabelText('Tài khoản'), 'newuser')
  await userEvent.click(form.getByRole('button', { name: 'Lưu' }))
  expect(await screen.findByText('Tmp!123456')).toBeVisible()
  expect(saved[1]).toMatchObject({ departmentId: 'd1', roles: ['DEPT_USER'] })
  await userEvent.click(screen.getByRole('button', { name: 'Sao chép' }))
  expect(await screen.findByText('Đã sao chép')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Đã lưu, đóng' }))
  expect(screen.queryByText('Tmp!123456')).not.toBeInTheDocument()
})
it('hides self-lock/delete and sends only changed edit fields', async () => {
  const saved = vi.fn()
  server.use(
    http.patch('/v1/users/u1', async ({ request }) => {
      saved(await request.json())
      return HttpResponse.json(user)
    }),
  )
  renderWithProviders(<Detail />, { path: '/admin/users/:id', route: '/admin/users/u1' })
  await screen.findByRole('heading', { name: 'Quản trị viên' })
  expect(screen.queryByRole('button', { name: 'Khoá' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Xoá' })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Sửa' }))
  const form = within(screen.getByRole('dialog'))
  await userEvent.clear(form.getByLabelText('Họ tên'))
  await userEvent.type(form.getByLabelText('Họ tên'), 'Tên mới')
  await userEvent.click(form.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(saved).toHaveBeenCalledWith({ fullName: 'Tên mới' }))
})
it('resets password and surfaces a delete conflict without leaving detail', async () => {
  useAuthStore.getState().setSession({ ...fakeSession(), user: { ...fakeUser(), id: 'other' } })
  server.use(
    http.post('/v1/users/u1/reset-password', () =>
      HttpResponse.json({ tempPassword: 'Reset!1234' }),
    ),
    http.delete('/v1/users/u1', () =>
      HttpResponse.json(
        { code: 'USER_IN_USE', message: 'Người dùng đã có dữ liệu' },
        { status: 409 },
      ),
    ),
  )
  const { router } = renderWithProviders(<Detail />, {
    path: '/admin/users/:id',
    route: '/admin/users/u1',
  })
  await userEvent.click(await screen.findByRole('button', { name: 'Reset mật khẩu' }))
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
  expect(await screen.findByText('Reset!1234')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Đã lưu, đóng' }))
  await userEvent.click(screen.getByRole('button', { name: 'Xoá' }))
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
  expect(await screen.findByText('Người dùng đã có dữ liệu')).toBeVisible()
  expect(router.state.location.pathname).toBe('/admin/users/u1')
})
it('hides write controls for read-only roles', async () => {
  useAuthStore.getState().setSession(fakeSession(['DEPT_USER']))
  renderWithProviders(<Users />)
  await screen.findByRole('link', { name: 'admin' })
  expect(screen.queryByRole('button', { name: 'Thêm người dùng' })).not.toBeInTheDocument()
})
