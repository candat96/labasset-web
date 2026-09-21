import type { ReactNode } from 'react'
import { cleanup, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { fakeSession, renderWithProviders } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { CatalogPage } from '@/features/catalogs/pages/CatalogPage'
import { Component as EquipmentPage } from '@/features/equipment/pages/EquipmentPage'
import { Component as FaultsPage } from '@/features/faults/pages/FaultsPage'
import { Component as ReceiptsPage } from '@/features/inventory/pages/ReceiptsPage'
import { Component as RepairsPage } from '@/features/repairs/pages/RepairsPage'
import { Component as RepairStatsPage } from '@/features/repairs/pages/RepairStatsPage'
import { Component as UsersPage } from '@/features/users/pages/UsersPage'
import { Component as DepartmentsPage } from '@/features/departments/pages/DepartmentsPage'
import { Component as AuditLogsPage } from '@/features/audit-logs/pages/AuditLogsPage'
import { Component as NotificationsPage } from '@/features/notifications/pages/NotificationsPage'
import { Component as EquipmentTransfersPage } from '@/features/equipment/pages/TransfersPage'
import { Component as QrLabelsPage } from '@/features/equipment/pages/QrLabelsPage'
import { Component as CalibrationsPage } from '@/features/calibrations/pages/CalibrationsPage'
import { Component as PlansPage } from '@/features/maintenance/pages/PlansPage'
import { Component as TasksPage } from '@/features/maintenance/pages/TasksPage'
import { Component as TemplatesPage } from '@/features/maintenance/pages/TemplatesPage'
import { Component as SuppliesPage } from '@/features/inventory/pages/SuppliesPage'
import { Component as BalancesPage } from '@/features/inventory/pages/BalancesPage'
import { Component as LotsPage } from '@/features/inventory/pages/LotsPage'
import { Component as IssuesPage } from '@/features/inventory/pages/IssuesPage'
import { Component as AlertsPage } from '@/features/inventory/pages/AlertsPage'
import { Component as RequestsPage } from '@/features/requests/pages/RequestsPage'
import { Component as QuotasPage } from '@/features/requests/pages/QuotasPage'
import { Component as RecurringPage } from '@/features/requests/pages/RecurringPage'
import { Component as StocktakesPage } from '@/features/stocktakes/pages/StocktakesPage'
import { Component as ReportsPage } from '@/features/reports/pages/ReportsPage'
import { Component as FaultSuggestionsPage } from '@/features/faults/pages/FaultSuggestionsPage'
import { Component as DepartmentDetailPage } from '@/features/departments/pages/DepartmentDetailPage'

/** camelCase key thô hoặc `filters.xxx` lộ ra UI. */
const RAW_KEY = /^(?:[a-z]+(?:[A-Z][a-z]+)+|filters\..+)$/

const PAGES: Array<{
  name: string
  ui: ReactNode
  route?: string
  path?: string
}> = [
  { name: 'equipment', ui: <EquipmentPage /> },
  { name: 'faults', ui: <FaultsPage /> },
  { name: 'receipts', ui: <ReceiptsPage /> },
  { name: 'repairs', ui: <RepairsPage /> },
  { name: 'repair-stats', ui: <RepairStatsPage /> },
  { name: 'users', ui: <UsersPage /> },
  { name: 'departments', ui: <DepartmentsPage /> },
  { name: 'catalogs', ui: <CatalogPage slug="manufacturers" /> },
  { name: 'audit-logs', ui: <AuditLogsPage /> },
  { name: 'notifications', ui: <NotificationsPage /> },
  { name: 'equipment-transfers', ui: <EquipmentTransfersPage /> },
  { name: 'qr-labels', ui: <QrLabelsPage /> },
  { name: 'calibrations', ui: <CalibrationsPage /> },
  { name: 'plans', ui: <PlansPage /> },
  { name: 'tasks', ui: <TasksPage /> },
  { name: 'templates', ui: <TemplatesPage /> },
  { name: 'supplies', ui: <SuppliesPage /> },
  { name: 'balances', ui: <BalancesPage /> },
  { name: 'lots', ui: <LotsPage /> },
  { name: 'issues', ui: <IssuesPage /> },
  { name: 'alerts', ui: <AlertsPage /> },
  { name: 'requests', ui: <RequestsPage /> },
  { name: 'quotas', ui: <QuotasPage /> },
  { name: 'recurring', ui: <RecurringPage /> },
  { name: 'stocktakes', ui: <StocktakesPage /> },
  { name: 'reports', ui: <ReportsPage /> },
  { name: 'fault-suggestions', ui: <FaultSuggestionsPage /> },
  {
    name: 'department-detail',
    ui: <DepartmentDetailPage />,
    route: '/admin/departments/d1',
    path: '/admin/departments/:id',
  },
]

function assertFilterBar(pageName: string) {
  const bars = document.querySelectorAll('[data-slot="filter-bar"]')
  for (const bar of bars) {
    const fields = bar.querySelectorAll('[data-filter-label]')
    for (const field of fields) {
      const label = field.getAttribute('data-filter-label') ?? ''
      expect(label, `${pageName}: FilterField thiếu nhãn`).toBeTruthy()
      expect(label, `${pageName}: nhãn thô "${label}"`).not.toMatch(RAW_KEY)
      const visible = field.querySelector('[data-slot="filter-title"]')
      expect(visible, `${pageName}: FilterField "${label}" không render Label`).toBeTruthy()
      expect(visible).toHaveTextContent(label)
    }
    const grid = bar.querySelector('[data-slot="filter-grid"]')
    if (grid) {
      for (const child of Array.from(grid.children)) {
        const labeled = child.hasAttribute('data-filter-label')
        const more =
          child.getAttribute('data-slot') === 'more-filters' ||
          !!child.querySelector('[data-slot="more-filters"]')
        expect(labeled || more, `${pageName}: ô lọc không có FilterField (${child.tagName})`).toBe(
          true,
        )
      }
    }
    const texts = [
      ...Array.from(bar.querySelectorAll('[data-filter-label]')).map(
        (el) => el.getAttribute('data-filter-label') ?? '',
      ),
      ...Array.from(bar.querySelectorAll('[placeholder]')).map(
        (el) => el.getAttribute('placeholder') ?? '',
      ),
      ...Array.from(grid?.querySelectorAll('[aria-label]') ?? []).map(
        (el) => el.getAttribute('aria-label') ?? '',
      ),
    ]
    for (const text of texts) {
      expect(text, `${pageName}: key thô "${text}"`).not.toMatch(RAW_KEY)
    }
  }
}

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get(/\/v1\/departments\/[^/]+$/, () =>
      HttpResponse.json({
        id: 'd1',
        code: 'XN',
        name: 'Xét nghiệm',
        isActive: true,
        phone: null,
        location: null,
      }),
    ),
    http.get(/\/v1\/catalogs\/.*/, () => HttpResponse.json([])),
    http.get(/\/v1\/.*/, () =>
      HttpResponse.json({ items: [], total: 0, page: 1, limit: 20, unreadCount: 0 }),
    ),
  )
})

it('mọi FilterField có nhãn, không key thô', async () => {
  for (const page of PAGES) {
    renderWithProviders(page.ui, { route: page.route ?? '/', path: page.path ?? '*' })
    await waitFor(() => {
      const ready =
        document.querySelector('[data-slot="filter-bar"]') ||
        document.querySelector('h1') ||
        document.querySelector('[role="status"]') ||
        document.querySelector('[role="alert"]')
      expect(ready, `${page.name}: trang không render`).toBeTruthy()
    })
    assertFilterBar(page.name)
    cleanup()
  }
})
