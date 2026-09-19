import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import '@/lib/i18n'
import { RequireAuth } from './RequireAuth'
import { RequireRole } from './RequireRole'
import { RequirePasswordChanged } from './RequirePasswordChanged'
import { RequireSysAuth } from './RequireSysAuth'
import { useAuthStore, type UserView } from '@/stores/auth.store'
import { useSysAuthStore } from '@/stores/sys-auth.store'
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

it('redirects anonymous sys users to sys login', () => {
  const router = createMemoryRouter(
    [
      { path: '/sys/login', element: <div>SYSLOGIN</div> },
      {
        element: <RequireSysAuth />,
        children: [{ path: '/sys/hospitals', element: <div>HOS</div> }],
      },
    ],
    { initialEntries: ['/sys/hospitals'] },
  )
  render(<RouterProvider router={router} />)
  expect(screen.getByText('SYSLOGIN')).toBeInTheDocument()
})

it('renders sys content when sys token exists', () => {
  useSysAuthStore.getState().setSession({
    accessToken: 'SYS1',
    user: { id: 's1', username: 'sys', fullName: 'System' },
  })
  const router = createMemoryRouter(
    [
      {
        element: <RequireSysAuth />,
        children: [{ path: '/sys/hospitals', element: <div>HOS</div> }],
      },
    ],
    { initialEntries: ['/sys/hospitals'] },
  )
  render(<RouterProvider router={router} />)
  expect(screen.getByText('HOS')).toBeInTheDocument()
})

it('forces password change', () => {
  login(['DEPT_USER'], true)
  mount('/', <div>HOME</div>)
  expect(screen.getByText('CHANGE')).toBeInTheDocument()
})
