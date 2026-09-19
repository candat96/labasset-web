import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { useSysAuthStore } from '@/stores/sys-auth.store'
import { Component as SysLogin } from './SysLoginPage'

it('stores sys session without tenant and navigates', async () => {
  let seen: Headers | undefined
  server.use(
    http.post('/sys/auth/login', ({ request }) => {
      seen = request.headers
      return HttpResponse.json({
        accessToken: 'SYS1',
        user: { id: 's1', username: 'sys', fullName: 'System' },
      })
    }),
  )
  const { router } = renderWithProviders(<SysLogin />, {
    route: '/sys/login',
    path: '/sys/login',
    routes: [{ path: '/sys/hospitals', element: <div>HOSPITALS</div> }],
  })
  await userEvent.type(screen.getByLabelText('Tài khoản'), 'sys')
  await userEvent.type(screen.getByLabelText('Mật khẩu'), 'secret')
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/sys/hospitals'))
  expect(useSysAuthStore.getState().accessToken).toBe('SYS1')
  expect(seen?.get('x-tenant-id')).toBeNull()
})

it('shows mapped credentials error', async () => {
  server.use(
    http.post('/sys/auth/login', () =>
      HttpResponse.json({ code: 'AUTH_INVALID_CREDENTIALS', message: 'bad' }, { status: 401 }),
    ),
  )
  renderWithProviders(<SysLogin />, { route: '/sys/login', path: '/sys/login' })
  await userEvent.type(screen.getByLabelText('Tài khoản'), 'sys')
  await userEvent.type(screen.getByLabelText('Mật khẩu'), 'x')
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Tài khoản hoặc mật khẩu không đúng')
})
