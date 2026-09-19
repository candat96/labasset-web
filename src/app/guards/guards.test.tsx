import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import '@/lib/i18n'
import { RequireAuth } from './RequireAuth'
import { RequireRole } from './RequireRole'
import { RequirePasswordChanged } from './RequirePasswordChanged'
import { useAuthStore, type UserView } from '@/stores/auth.store'
import { ADM } from '@/routes/roles'

const user = (roles: string[], must = false): UserView => ({
  id: 'u',
  username: 'x',
  fullName: 'X',
  email: null,
  phone: null,
  departmentId: null,
  roles,
  mustChangePassword: must,
  otpEnabled: false,
})
const login = (roles: string[], must = false) =>
  useAuthStore.getState().setSession({
    accessToken: 'a',
    refreshToken: 'r',
    tenantId: 't',
    user: user(roles, must),
  })

function mount(path: string, element: React.ReactNode) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <div>LOGIN</div> },
      { path: '/change-password', element: <div>CHANGE</div> },
      {
        element: <RequireAuth />,
        children: [{ element: <RequirePasswordChanged />, children: [{ path, element }] }],
      },
    ],
    { initialEntries: [path] },
  )
  render(<RouterProvider router={router} />)
  return router
}

it('redirects anonymous to login with returnTo', () => {
  const router = mount('/admin/users', <div>USERS</div>)
  expect(screen.getByText('LOGIN')).toBeInTheDocument()
  expect(router.state.location.search).toBe('?returnTo=%2Fadmin%2Fusers')
})

it('renders 403 when role missing, content when present', () => {
  login(['DEPT_USER'])
  mount(
    '/admin/users',
    <RequireRole roles={ADM}>
      <div>USERS</div>
    </RequireRole>,
  )
  expect(screen.getByText('Bạn không có quyền truy cập')).toBeInTheDocument()
  expect(screen.queryByText('USERS')).not.toBeInTheDocument()
})

it('renders content for allowed role', () => {
  login(['HOSPITAL_ADMIN'])
  mount(
    '/admin/users',
    <RequireRole roles={ADM}>
      <div>USERS</div>
    </RequireRole>,
  )
  expect(screen.getByText('USERS')).toBeInTheDocument()
})

it('forces password change', () => {
  login(['DEPT_USER'], true)
  mount('/', <div>HOME</div>)
  expect(screen.getByText('CHANGE')).toBeInTheDocument()
})
