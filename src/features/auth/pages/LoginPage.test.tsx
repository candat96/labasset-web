import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { Component as LoginPage } from './LoginPage'
import { useAuthStore } from '@/stores/auth.store'

const health = (mode: string) =>
  http.get('/health', () => HttpResponse.json({ status: 'ok', mode }))

it('asks for hospital code in multi mode', async () => {
  server.use(health('multi'))
  renderWithProviders(<LoginPage />, { route: '/login', path: '/login' })
  expect(await screen.findByLabelText('Mã bệnh viện')).toBeInTheDocument()
})

it('hides hospital code in single mode', async () => {
  server.use(health('single'))
  renderWithProviders(<LoginPage />, { route: '/login', path: '/login' })
  expect(await screen.findByLabelText('Tài khoản')).toBeInTheDocument()
  expect(screen.queryByLabelText('Mã bệnh viện')).not.toBeInTheDocument()
})

it('shows mapped error on 401 and uppercases hospital code', async () => {
  let body: Record<string, string> = {}
  server.use(
    health('multi'),
    http.post('/v1/auth/login', async ({ request }) => {
      body = (await request.json()) as Record<string, string>
      return HttpResponse.json({ code: 'UNAUTHORIZED', message: 'bad' }, { status: 401 })
    }),
  )
  renderWithProviders(<LoginPage />, { route: '/login', path: '/login' })
  await userEvent.type(await screen.findByLabelText('Mã bệnh viện'), 'bvdemo')
  await userEvent.type(screen.getByLabelText('Tài khoản'), 'admin')
  await userEvent.type(screen.getByLabelText('Mật khẩu'), 'x')
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Tài khoản hoặc mật khẩu không đúng')
  expect(body.hospitalCode).toBe('BVDEMO')
})

it('stores session and navigates to returnTo on success', async () => {
  server.use(
    health('single'),
    http.post('/v1/auth/login', () => HttpResponse.json(fakeSession())),
  )
  const { router } = renderWithProviders(<LoginPage />, {
    route: '/login?returnTo=%2Fadmin%2Fusers',
    path: '/login',
    routes: [{ path: '/admin/users', element: <div>USERS</div> }],
  })
  await userEvent.type(await screen.findByLabelText('Tài khoản'), 'admin')
  await userEvent.type(screen.getByLabelText('Mật khẩu'), 'x')
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/admin/users'))
  expect(useAuthStore.getState().accessToken).toBe('A1')
})

it('goes to OTP step when challenged', async () => {
  server.use(
    health('single'),
    http.post('/v1/auth/login', () => HttpResponse.json({ otpRequired: true, otpToken: 'tok' })),
  )
  const { router } = renderWithProviders(<LoginPage />, {
    route: '/login',
    path: '/login',
    routes: [{ path: '/login/otp', element: <div>OTP</div> }],
  })
  await userEvent.type(await screen.findByLabelText('Tài khoản'), 'admin')
  await userEvent.type(screen.getByLabelText('Mật khẩu'), 'x')
  await userEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/login/otp'))
  expect((router.state.location.state as { otpToken: string }).otpToken).toBe('tok')
})
