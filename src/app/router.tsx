import { createBrowserRouter, type RouteObject } from 'react-router'
import { RequireAuth } from './guards/RequireAuth'
import { RequirePasswordChanged } from './guards/RequirePasswordChanged'
import { RequireRole } from './guards/RequireRole'
import { RequireSysAuth } from './guards/RequireSysAuth'
import { AppShell } from './layout/AppShell'
import { SysShell } from './layout/SysShell'
import { NotFoundPage } from './pages/NotFoundPage'
import { ForbiddenPage } from './pages/ForbiddenPage'
import { PlaceholderPage } from './pages/PlaceholderPage'
import { MENU } from '@/routes/menu'
import i18n from '@/lib/i18n'

/** Route đã có trang thật; mọi mục MENU còn lại tự sinh placeholder. */
const implemented: RouteObject[] = [
  { path: 'admin/users', lazy: () => import('@/features/users/pages/UsersPage') },
  { path: 'admin/users/:id', lazy: () => import('@/features/users/pages/UserDetailPage') },
  { path: 'admin/catalogs/:name', lazy: () => import('@/features/catalogs/pages/CatalogPage') },
  { path: 'admin/settings', lazy: () => import('@/features/settings/pages/SettingsPage') },
  { path: 'admin/audit-logs', lazy: () => import('@/features/audit-logs/pages/AuditLogsPage') },
  {
    path: 'admin/departments/:id',
    lazy: () => import('@/features/departments/pages/DepartmentDetailPage'),
  },
  {
    path: 'notifications/preferences',
    lazy: () => import('@/features/notifications/pages/PreferencesPage'),
  },
  { index: true, lazy: () => import('@/features/dashboard/pages/DashboardPage') },
  { path: 'notifications', lazy: () => import('@/features/notifications/pages/NotificationsPage') },
  {
    path: 'admin/departments',
    lazy: () => import('@/features/departments/pages/DepartmentsPage'),
    handle: { crumb: undefined },
  },
  { path: 'profile', lazy: () => import('@/features/auth/pages/ProfilePage') },
  { path: 'change-password', lazy: () => import('@/features/auth/pages/ChangePasswordPage') },
  { path: 'sessions', lazy: () => import('@/features/auth/pages/SessionsPage') },
  { path: 'equipment', lazy: () => import('@/features/equipment/pages/EquipmentPage') },
  { path: 'equipment/new', lazy: () => import('@/features/equipment/pages/EquipmentFormPage') },
  { path: 'equipment/compare', lazy: () => import('@/features/equipment/pages/ComparePage') },
  { path: 'equipment/transfers', lazy: () => import('@/features/equipment/pages/TransfersPage') },
  {
    path: 'equipment/by-qr/:token',
    lazy: () => import('@/features/equipment/pages/ByQrPage'),
  },
  {
    path: 'equipment/:id/edit',
    lazy: () => import('@/features/equipment/pages/EquipmentFormPage'),
  },
  { path: 'equipment/:id', lazy: () => import('@/features/equipment/pages/EquipmentDetailPage') },
  { path: 'faults', lazy: () => import('@/features/faults/pages/FaultsPage') },
  { path: 'faults/new', lazy: () => import('@/features/faults/pages/FaultFormPage') },
  {
    path: 'faults/suggestions',
    lazy: () => import('@/features/faults/pages/FaultSuggestionsPage'),
  },
  { path: 'faults/:id/edit', lazy: () => import('@/features/faults/pages/FaultFormPage') },
  { path: 'faults/:id', lazy: () => import('@/features/faults/pages/FaultDetailPage') },
  { path: 'repairs', lazy: () => import('@/features/repairs/pages/RepairsPage') },
  { path: 'repairs/new', lazy: () => import('@/features/repairs/pages/RepairFormPage') },
  { path: 'repairs/stats', lazy: () => import('@/features/repairs/pages/RepairStatsPage') },
  { path: 'repairs/:id', lazy: () => import('@/features/repairs/pages/RepairDetailPage') },
]

const sysImplemented = [
  '/sys/login',
  '/sys/hospitals',
  '/sys/migrations',
  '/sys/announcements',
  '/sys/stats',
  '/sys/jobs',
]

const implementedPaths = new Set([
  ...implemented.map((r) => (r.index ? '/' : `/${r.path}`)),
  ...sysImplemented,
])

const placeholders: RouteObject[] = MENU.flatMap((g) =>
  g.items
    .filter((i) => !implementedPaths.has(i.path))
    .map((i) => ({
      path: i.path.slice(1),
      element: (
        <RequireRole roles={i.roles ?? g.roles}>
          <PlaceholderPage nameKey={i.labelKey} />
        </RequireRole>
      ),
    })),
)

// Bảo vệ theo vai trò cho trang thật lấy từ MENU (cùng nguồn với sidebar).
function guarded(route: RouteObject): RouteObject {
  const path = route.index ? '/' : `/${route.path}`
  for (const g of MENU) {
    const item = g.items.find(
      (i) => i.path === path || (i.path !== '/' && path.startsWith(i.path + '/')),
    )
    if (item) {
      const roles = item.roles ?? g.roles
      if (!roles) return route
      const Lazy = route.lazy
      return {
        ...route,
        lazy: async () => {
          const m = await (Lazy as () => Promise<{ Component: React.ComponentType }>)()
          const Component = m.Component
          return {
            Component: () => (
              <RequireRole roles={roles}>
                <Component />
              </RequireRole>
            ),
          }
        },
      }
    }
  }
  return route
}

export const router = createBrowserRouter([
  {
    lazy: () => import('@/features/auth/pages/AuthLayout'),
    children: [
      { path: '/login', lazy: () => import('@/features/auth/pages/LoginPage') },
      { path: '/login/otp', lazy: () => import('@/features/auth/pages/OtpPage') },
      { path: '/forgot-password', lazy: () => import('@/features/auth/pages/ForgotPasswordPage') },
      { path: '/reset-password', lazy: () => import('@/features/auth/pages/ResetPasswordPage') },
    ],
  },
  { path: '/sys/login', lazy: () => import('@/features/sys/auth/pages/SysLoginPage') },
  {
    element: <RequireSysAuth />,
    children: [
      {
        path: '/sys',
        element: <SysShell />,
        children: [
          { path: 'hospitals', lazy: () => import('@/features/sys/hospitals/pages/HospitalsPage') },
          {
            path: 'hospitals/new',
            lazy: () => import('@/features/sys/hospitals/pages/HospitalFormPage'),
          },
          {
            path: 'hospitals/:id/edit',
            lazy: () => import('@/features/sys/hospitals/pages/HospitalFormPage'),
          },
          {
            path: 'hospitals/:id',
            lazy: () => import('@/features/sys/hospitals/pages/HospitalDetailPage'),
          },
          {
            path: 'migrations',
            lazy: () => import('@/features/sys/migrations/pages/MigrationsPage'),
          },
          {
            path: 'announcements',
            lazy: () => import('@/features/sys/announcements/pages/SysAnnouncementsPage'),
          },
          { path: 'stats', lazy: () => import('@/features/sys/stats/pages/SysStatsPage') },
          { path: 'jobs', lazy: () => import('@/features/sys/jobs/pages/SysJobsPage') },
        ],
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequirePasswordChanged />,
        children: [
          {
            path: '/',
            element: <AppShell />,
            children: [
              ...implemented.map(guarded),
              ...placeholders,
              { path: '403', element: <ForbiddenPage /> },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
])

document.title = i18n.t('app.name')
