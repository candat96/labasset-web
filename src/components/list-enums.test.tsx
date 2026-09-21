import type { ReactNode } from 'react'
import { cleanup, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { fakeSession, renderWithProviders } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component as EquipmentPage } from '@/features/equipment/pages/EquipmentPage'
import { Component as EquipmentTransfersPage } from '@/features/equipment/pages/TransfersPage'
import { Component as FaultsPage } from '@/features/faults/pages/FaultsPage'
import { Component as FaultSuggestionsPage } from '@/features/faults/pages/FaultSuggestionsPage'
import { Component as RepairsPage } from '@/features/repairs/pages/RepairsPage'
import { Component as CalibrationsPage } from '@/features/calibrations/pages/CalibrationsPage'
import { Component as PlansPage } from '@/features/maintenance/pages/PlansPage'
import { Component as TasksPage } from '@/features/maintenance/pages/TasksPage'
import { Component as TemplatesPage } from '@/features/maintenance/pages/TemplatesPage'
import { Component as SuppliesPage } from '@/features/inventory/pages/SuppliesPage'
import { Component as BalancesPage } from '@/features/inventory/pages/BalancesPage'
import { Component as LotsPage } from '@/features/inventory/pages/LotsPage'
import { Component as IssuesPage } from '@/features/inventory/pages/IssuesPage'
import { Component as ReceiptsPage } from '@/features/inventory/pages/ReceiptsPage'
import { Component as StockTransfersPage } from '@/features/inventory/pages/TransfersPage'
import { Component as AlertsPage } from '@/features/inventory/pages/AlertsPage'
import { Component as RequestsPage } from '@/features/requests/pages/RequestsPage'
import { Component as RecurringPage } from '@/features/requests/pages/RecurringPage'
import { Component as QuotasPage } from '@/features/requests/pages/QuotasPage'
import { Component as StocktakesPage } from '@/features/stocktakes/pages/StocktakesPage'
import { Component as UsersPage } from '@/features/users/pages/UsersPage'
import { Component as DepartmentsPage } from '@/features/departments/pages/DepartmentsPage'
import { Component as DepartmentDetailPage } from '@/features/departments/pages/DepartmentDetailPage'
import { Component as AuditLogsPage } from '@/features/audit-logs/pages/AuditLogsPage'
import { Component as NotificationsPage } from '@/features/notifications/pages/NotificationsPage'

/** snake_case (`to_department`) hoặc SCREAMING_CASE (`DEPT_HEAD`) lộ ra bảng. */
const RAW_ENUM = /^[a-z]+(_[a-z]+)+$|^[A-Z]+(_[A-Z]+)+$/

const AT = '2026-09-20T03:00:00Z'
/** Một dòng “đa năng”: đủ trường enum cho mọi list DTO, giá trị snake_case cố ý. */
const ROW: Record<string, unknown> = {
  id: 'r1',
  code: 'MA-01',
  name: 'Dòng mẫu',
  title: 'Dòng mẫu',
  fullName: 'Người mẫu',
  username: 'nguoi.mau',
  email: null,
  status: 'draft',
  type: 'to_department',
  scope: 'model',
  scopeType: 'warehouse',
  severity: 'medium',
  priority: 'urgent',
  result: 'conditional',
  source: 'manual',
  reason: 'Lý do',
  category: 'spare_part',
  action: 'dept_approve',
  entityType: 'stock_issue',
  entityId: 'e1',
  userId: 'u1',
  roles: ['DEPT_HEAD', 'EQUIPMENT_STAFF'],
  qcStatus: 'pending',
  isActive: true,
  equipmentId: 'e1',
  warehouseId: 'w1',
  toWarehouseId: 'w2',
  toDepartmentId: 'd1',
  departmentId: 'd1',
  departmentName: 'Xét nghiệm',
  supplierId: 's1',
  receiverName: 'Người nhận',
  issuedAt: AT,
  receivedAt: AT,
  scheduledAt: AT,
  dueAt: AT,
  createdAt: AT,
  updatedAt: AT,
  postedAt: AT,
  nextDueAt: AT,
  totalAmount: '1000',
  cost: '1000',
  totalCost: '1000',
  quantity: '1',
  qtyOnHand: '1',
  bookQty: '1',
  dayOfMonth: 1,
  items: [],
  assignments: [],
  overallPass: null,
  fefoWarning: false,
  isOverdue: false,
  equipmentDown: false,
  viewCount: 1,
  version: 1,
  model: 'M1',
  severityLabel: null,
  message: 'Cảnh báo',
  ip: '10.0.0.1',
  data: {},
  readAt: null,
  body: 'Nội dung',
}

const PAGES: Array<{ name: string; ui: ReactNode; route?: string; path?: string }> = [
  { name: 'equipment', ui: <EquipmentPage /> },
  { name: 'equipment-transfers', ui: <EquipmentTransfersPage /> },
  { name: 'faults', ui: <FaultsPage /> },
  { name: 'fault-suggestions', ui: <FaultSuggestionsPage /> },
  { name: 'repairs', ui: <RepairsPage /> },
  { name: 'calibrations', ui: <CalibrationsPage /> },
  { name: 'plans', ui: <PlansPage /> },
  { name: 'tasks', ui: <TasksPage /> },
  { name: 'templates', ui: <TemplatesPage /> },
  { name: 'supplies', ui: <SuppliesPage /> },
  { name: 'balances', ui: <BalancesPage /> },
  { name: 'lots', ui: <LotsPage /> },
  { name: 'issues', ui: <IssuesPage /> },
  { name: 'receipts', ui: <ReceiptsPage /> },
  { name: 'stock-transfers', ui: <StockTransfersPage /> },
  { name: 'alerts', ui: <AlertsPage /> },
  { name: 'requests', ui: <RequestsPage /> },
  { name: 'recurring', ui: <RecurringPage /> },
  { name: 'quotas', ui: <QuotasPage /> },
  { name: 'stocktakes', ui: <StocktakesPage /> },
  { name: 'users', ui: <UsersPage /> },
  { name: 'departments', ui: <DepartmentsPage /> },
  {
    name: 'department-detail',
    ui: <DepartmentDetailPage />,
    route: '/admin/departments/d1?tab=users',
    path: '/admin/departments/:id',
  },
  { name: 'audit-logs', ui: <AuditLogsPage /> },
  { name: 'notifications', ui: <NotificationsPage /> },
]

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get(/\/v1\/departments\/[^/]+$/, () =>
      HttpResponse.json({ ...ROW, id: 'd1', code: 'XN', name: 'Xét nghiệm' }),
    ),
    http.get(/\/v1\/catalogs\/.*/, () => HttpResponse.json([])),
    http.get(/\/v1\/departments$/, () => HttpResponse.json([])),
    http.get(/\/v1\/.*/, () =>
      HttpResponse.json({ items: [ROW], total: 1, page: 1, limit: 20, unreadCount: 0 }),
    ),
  )
})

it('không cột nào trong bảng danh sách lộ enum thô (snake_case / SCREAMING_CASE)', async () => {
  for (const page of PAGES) {
    renderWithProviders(page.ui, { route: page.route ?? '/', path: page.path ?? '*' })
    await waitFor(() => {
      expect(document.querySelector('tbody td'), `${page.name}: bảng chưa có dòng`).toBeTruthy()
    })
    const cells = Array.from(document.querySelectorAll('tbody td'))
    for (const cell of cells) {
      const text = (cell.textContent ?? '').trim()
      expect(text, `${page.name}: ô "${text}" lộ enum thô`).not.toMatch(RAW_ENUM)
      for (const token of text.split(/[\s,·/]+/)) {
        expect(token, `${page.name}: ô "${text}" chứa enum thô "${token}"`).not.toMatch(RAW_ENUM)
      }
    }
    cleanup()
  }
}, 30_000)
