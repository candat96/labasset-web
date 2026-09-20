import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Boxes,
  Building2,
  Calendar,
  ClipboardCheck,
  ClipboardList,
  Cog,
  DatabaseBackup,
  FileCheck,
  FileText,
  FlaskConical,
  Gauge,
  Hash,
  History,
  Hospital,
  LayoutDashboard,
  ListChecks,
  ListTodo,
  Megaphone,
  Microscope,
  PackageMinus,
  PackagePlus,
  PieChart,
  QrCode,
  Scale,
  Settings,
  Table2,
  Tags,
  Truck,
  Users,
  Wrench,
} from 'lucide-react'
import { ADM, HEADS, STAFF, type Role } from './roles'

export interface MenuItem {
  path: string
  labelKey: string
  icon?: LucideIcon
  /** Không ghi = mọi vai trò đã đăng nhập */
  roles?: readonly Role[]
  hidden?: boolean
}

export interface MenuGroup {
  key: string
  labelKey: string
  roles?: readonly Role[]
  items: MenuItem[]
}

const showSys = import.meta.env.VITE_SHOW_SYS === 'true'

export const SYS_ITEMS = [
  { path: '/sys/hospitals', labelKey: 'menu:items.sysHospitals', icon: Hospital },
  { path: '/sys/migrations', labelKey: 'menu:items.sysMigrations', icon: DatabaseBackup },
  { path: '/sys/announcements', labelKey: 'menu:items.sysAnnouncements', icon: Megaphone },
  { path: '/sys/stats', labelKey: 'menu:items.sysStats', icon: PieChart },
  { path: '/sys/jobs', labelKey: 'menu:items.sysJobs', icon: Cog },
] as const

/** Nguồn duy nhất cho sidebar, breadcrumb, route và guard. */
export const MENU: MenuGroup[] = [
  {
    key: 'overview',
    labelKey: 'menu:groups.overview',
    items: [
      { path: '/', labelKey: 'menu:items.dashboard', icon: LayoutDashboard },
      { path: '/my-tasks', labelKey: 'menu:items.myTasks', icon: ListChecks },
      { path: '/notifications', labelKey: 'menu:items.notifications', icon: Bell },
    ],
  },
  {
    key: 'equipment',
    labelKey: 'menu:groups.equipment',
    items: [
      { path: '/equipment', labelKey: 'menu:items.equipment', icon: Microscope },
      {
        path: '/equipment/transfers',
        labelKey: 'menu:items.transfers',
        icon: ArrowLeftRight,
        roles: STAFF,
      },
      { path: '/equipment/qr-labels', labelKey: 'menu:items.qrLabels', icon: QrCode, roles: STAFF },
      { path: '/faults', labelKey: 'menu:items.faults', icon: BookOpen },
    ],
  },
  {
    key: 'repairs',
    labelKey: 'menu:groups.repairs',
    items: [
      { path: '/repairs', labelKey: 'menu:items.repairs', icon: Wrench },
      // API `/v1/repairs/stats` chỉ ADM/VT (workload chỉ ADM) → menu theo đúng quyền API.
      { path: '/repairs/stats', labelKey: 'menu:items.repairStats', icon: BarChart3, roles: STAFF },
    ],
  },
  {
    key: 'maintenance',
    labelKey: 'menu:groups.maintenance',
    items: [
      { path: '/maintenance/calendar', labelKey: 'menu:items.calendar', icon: Calendar },
      {
        path: '/maintenance/plans',
        labelKey: 'menu:items.plans',
        icon: ClipboardList,
        roles: STAFF,
      },
      { path: '/maintenance/tasks', labelKey: 'menu:items.tasks', icon: ListTodo },
      { path: '/calibrations', labelKey: 'menu:items.calibrations', icon: Gauge },
      {
        path: '/maintenance/templates',
        labelKey: 'menu:items.templates',
        icon: FileCheck,
        roles: STAFF,
      },
    ],
  },
  {
    key: 'supplies',
    labelKey: 'menu:groups.supplies',
    roles: STAFF,
    items: [
      { path: '/supplies', labelKey: 'menu:items.supplies', icon: FlaskConical },
      { path: '/stock', labelKey: 'menu:items.stock', icon: Boxes },
      { path: '/stock/receipts', labelKey: 'menu:items.receipts', icon: PackagePlus },
      { path: '/stock/issues', labelKey: 'menu:items.issues', icon: PackageMinus },
      { path: '/stock/transfers', labelKey: 'menu:items.stockTransfers', icon: Truck },
      { path: '/stock/alerts', labelKey: 'menu:items.alerts', icon: AlertTriangle },
    ],
  },
  {
    key: 'requests',
    labelKey: 'menu:groups.requests',
    items: [
      { path: '/requests', labelKey: 'menu:items.requests', icon: FileText },
      { path: '/requests/quotas', labelKey: 'menu:items.quotas', icon: Scale, roles: HEADS },
    ],
  },
  {
    key: 'stocktake',
    labelKey: 'menu:groups.stocktake',
    items: [{ path: '/stocktakes', labelKey: 'menu:items.stocktakes', icon: ClipboardCheck }],
  },
  {
    key: 'reports',
    labelKey: 'menu:groups.reports',
    roles: HEADS,
    items: [
      { path: '/reports', labelKey: 'menu:items.reports', icon: PieChart },
      { path: '/reports/builder', labelKey: 'menu:items.reportBuilder', icon: Table2 },
    ],
  },
  {
    key: 'assistant',
    labelKey: 'menu:groups.assistant',
    roles: HEADS,
    items: [{ path: '/assistant', labelKey: 'menu:items.assistant', icon: Bot }],
  },
  {
    key: 'admin',
    labelKey: 'menu:groups.admin',
    roles: ADM,
    items: [
      { path: '/admin/departments', labelKey: 'menu:items.departments', icon: Building2 },
      { path: '/admin/users', labelKey: 'menu:items.users', icon: Users },
      { path: '/admin/catalogs', labelKey: 'menu:items.catalogs', icon: Tags },
      { path: '/admin/settings', labelKey: 'menu:items.settings', icon: Settings },
      { path: '/admin/numbering', labelKey: 'menu:items.numbering', icon: Hash },
      { path: '/admin/audit-logs', labelKey: 'menu:items.auditLogs', icon: History },
      { path: '/admin/backup', labelKey: 'menu:items.backup', icon: DatabaseBackup },
    ],
  },
  {
    key: 'sys',
    labelKey: 'menu:groups.sys',
    roles: ADM,
    items: [
      {
        path: '/sys/hospitals',
        labelKey: 'menu:items.sysHospitals',
        icon: Hospital,
        hidden: !showSys,
      },
      {
        path: '/sys/migrations',
        labelKey: 'menu:items.sysMigrations',
        icon: DatabaseBackup,
        hidden: !showSys,
      },
      { path: '/sys/jobs', labelKey: 'menu:items.sysJobs', icon: Cog, hidden: !showSys },
      {
        path: '/sys/announcements',
        labelKey: 'menu:items.sysAnnouncements',
        icon: Megaphone,
        hidden: !showSys,
      },
      { path: '/sys/stats', labelKey: 'menu:items.sysStats', icon: PieChart, hidden: !showSys },
    ],
  },
]

/** Mục ngoài sidebar (user menu) — vẫn cần nhãn breadcrumb. */
export const EXTRA_ITEMS: MenuItem[] = [
  { path: '/notifications/preferences', labelKey: 'notifications:preferences' },
  { path: '/profile', labelKey: 'menu:items.profile' },
  { path: '/change-password', labelKey: 'menu:items.changePassword' },
  { path: '/sessions', labelKey: 'menu:items.sessions' },
  { path: '/equipment/compare', labelKey: 'menu:items.equipmentCompare' },
]

export const allMenuItems = (): MenuItem[] => MENU.flatMap((g) => g.items)

/** Khoa/phòng trong `/admin/departments` là mục riêng — path phải khớp tiền tố dài nhất. */
export function findMenuItem(pathname: string): { group: MenuGroup | null; item: MenuItem } | null {
  let best: { group: MenuGroup | null; item: MenuItem } | null = null
  const consider = (group: MenuGroup | null, item: MenuItem) => {
    const match =
      item.path === '/'
        ? pathname === '/'
        : pathname === item.path || pathname.startsWith(item.path + '/')
    if (match && (!best || item.path.length > best.item.path.length)) best = { group, item }
  }
  for (const g of MENU) for (const it of g.items) consider(g, it)
  for (const it of EXTRA_ITEMS) consider(null, it)
  return best
}
