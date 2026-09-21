import { createBrowserRouter, Navigate, type RouteObject } from 'react-router'
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

const showSys = import.meta.env.VITE_SHOW_SYS === 'true'

/** Route đã có trang thật; mọi mục MENU còn lại tự sinh placeholder. */
const implemented: RouteObject[] = [
  { path: 'admin/users', lazy: () => import('@/features/users/pages/UsersPage') },
  { path: 'admin/users/:id', lazy: () => import('@/features/users/pages/UserDetailPage') },
  { path: 'admin/catalogs', lazy: () => import('@/features/catalogs/pages/CatalogsIndexPage') },
  { path: 'admin/catalogs/:name', lazy: () => import('@/features/catalogs/pages/CatalogPage') },
  { path: 'admin/settings', lazy: () => import('@/features/settings/pages/SettingsPage') },
  { path: 'admin/numbering', element: <Navigate to="/admin/settings?tab=numbering" replace /> },
  { path: 'admin/backup', lazy: () => import('@/features/settings/pages/BackupPage') },
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
  { path: 'equipment/qr-labels', lazy: () => import('@/features/equipment/pages/QrLabelsPage') },
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
  {
    path: 'maintenance/templates',
    lazy: () => import('@/features/maintenance/pages/TemplatesPage'),
  },
  {
    path: 'maintenance/templates/new',
    lazy: () => import('@/features/maintenance/pages/TemplateFormPage'),
  },
  {
    path: 'maintenance/templates/:id/edit',
    lazy: () => import('@/features/maintenance/pages/TemplateFormPage'),
  },
  { path: 'maintenance/plans', lazy: () => import('@/features/maintenance/pages/PlansPage') },
  {
    path: 'maintenance/plans/:id',
    lazy: () => import('@/features/maintenance/pages/PlanDetailPage'),
  },
  { path: 'maintenance/tasks', lazy: () => import('@/features/maintenance/pages/TasksPage') },
  {
    path: 'maintenance/tasks/:id',
    lazy: () => import('@/features/maintenance/pages/TaskDetailPage'),
  },
  {
    path: 'maintenance/calendar',
    lazy: () => import('@/features/maintenance/pages/CalendarPage'),
  },
  { path: 'calibrations', lazy: () => import('@/features/calibrations/pages/CalibrationsPage') },
  {
    path: 'calibrations/:id',
    lazy: () => import('@/features/calibrations/pages/CalibrationDetailPage'),
  },
  { path: 'supplies', lazy: () => import('@/features/inventory/pages/SuppliesPage') },
  { path: 'supplies/new', lazy: () => import('@/features/inventory/pages/SupplyFormPage') },
  { path: 'supplies/:id/edit', lazy: () => import('@/features/inventory/pages/SupplyFormPage') },
  { path: 'supplies/:id', lazy: () => import('@/features/inventory/pages/SupplyDetailPage') },
  { path: 'stock', lazy: () => import('@/features/inventory/pages/BalancesPage') },
  { path: 'stock/lots', lazy: () => import('@/features/inventory/pages/LotsPage') },
  { path: 'stock/receipts', lazy: () => import('@/features/inventory/pages/ReceiptsPage') },
  { path: 'stock/receipts/new', lazy: () => import('@/features/inventory/pages/ReceiptFormPage') },
  {
    path: 'stock/receipts/:id/edit',
    lazy: () => import('@/features/inventory/pages/ReceiptFormPage'),
  },
  {
    path: 'stock/receipts/:id',
    lazy: () => import('@/features/inventory/pages/ReceiptDetailPage'),
  },
  { path: 'stock/issues', lazy: () => import('@/features/inventory/pages/IssuesPage') },
  { path: 'stock/issues/new', lazy: () => import('@/features/inventory/pages/IssueFormPage') },
  { path: 'stock/issues/:id/edit', lazy: () => import('@/features/inventory/pages/IssueFormPage') },
  { path: 'stock/issues/:id', lazy: () => import('@/features/inventory/pages/IssueDetailPage') },
  { path: 'stock/transfers', lazy: () => import('@/features/inventory/pages/TransfersPage') },
  { path: 'stock/alerts', lazy: () => import('@/features/inventory/pages/AlertsPage') },
  { path: 'requests', lazy: () => import('@/features/requests/pages/RequestsPage') },
  { path: 'requests/new', lazy: () => import('@/features/requests/pages/RequestFormPage') },
  { path: 'requests/quotas', lazy: () => import('@/features/requests/pages/QuotasPage') },
  { path: 'requests/recurring', lazy: () => import('@/features/requests/pages/RecurringPage') },
  { path: 'requests/:id/edit', lazy: () => import('@/features/requests/pages/RequestFormPage') },
  { path: 'requests/:id', lazy: () => import('@/features/requests/pages/RequestDetailPage') },
  { path: 'stocktakes', lazy: () => import('@/features/stocktakes/pages/StocktakesPage') },
  {
    path: 'stocktakes/:id/compare',
    lazy: () => import('@/features/stocktakes/pages/StocktakeComparePage'),
  },
  { path: 'stocktakes/:id', lazy: () => import('@/features/stocktakes/pages/StocktakeDetailPage') },
  { path: 'my-tasks', lazy: () => import('@/features/dashboard/pages/MyTasksPage') },
  { path: 'reports', lazy: () => import('@/features/reports/pages/ReportsPage') },
  { path: 'reports/builder', lazy: () => import('@/features/reports/pages/ReportBuilderPage') },
  { path: 'reports/custom/new', lazy: () => import('@/features/reports/pages/ReportBuilderPage') },
  {
    path: 'reports/custom/:id/edit',
    lazy: () => import('@/features/reports/pages/ReportBuilderPage'),
  },
  { path: 'reports/jobs', lazy: () => import('@/features/reports/pages/ReportJobsPage') },
  { path: 'assistant', lazy: () => import('@/features/assistant/pages/AssistantPage') },
  { path: 'assistant/digest', lazy: () => import('@/features/assistant/pages/DigestPage') },
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
  ...(showSys
    ? [{ path: '/sys/login', lazy: () => import('@/features/sys/auth/pages/SysLoginPage') }]
    : [{ path: '/sys/*', element: <NotFoundPage /> }]),
  {
    element: showSys ? <RequireSysAuth /> : <NotFoundPage />,
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
