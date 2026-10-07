import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  Gauge,
  Inbox,
  PackageCheck,
  PackageMinus,
  ShoppingCart,
  UserCheck,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { api, unwrap } from '@/api/client'
import * as demandApi from '@/features/procurement/api'
import type { components } from '@/api/schema'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { ErrorState } from '@/components/page/ErrorState'
import { PageSkeleton } from '@/components/page/DetailSkeleton'
import { KpiCard, type KpiTone } from '@/components/kpi-card'
import { useTranslation } from 'react-i18next'

type MyTasks = components['schemas']['MyTasksResponseDto']

// Mỗi liên kết phải mở ra ĐÚNG tập hợp mà con số bên cạnh đã đếm. API đếm
// "quá hạn" và "đến hạn" theo phạm vi khoa chứ không theo người được giao, nên
// các liên kết đó không được kèm assigneeId — trước đây kèm nên bấm vào thấy
// danh sách ít hơn hẳn con số.
// Tập trạng thái "còn mở" của API (OPEN_REPAIR_STATUSES) — có cả trạng thái
// "mới", nếu thiếu thì danh sách ra ít dòng hơn con số đã đếm.
const OPEN_REPAIR_STATUSES = 'new,accepted,in_progress,awaiting_parts,awaiting_vendor'

const LINKS: Record<string, string> = {
  repairsAssigned: `/repairs?assignedTo=me&status=${OPEN_REPAIR_STATUSES}`,
  repairsPendingResponse: '/repairs?pendingResponse=true',
  repairsOverdue: '/repairs?overdue=true',
  maintenanceDue7d: '/maintenance/tasks?status=scheduled,in_progress&due=7d',
  maintenanceOverdue: '/maintenance/tasks?overdue=true',
  requestsPendingApproval: '/requests?pendingFor=me',
  requestsPendingIssue: '/requests?status=approved',
  requestsPendingReceive: '/requests?status=issued',
  stocktakesCounting: '/stocktakes?status=counting',
  demandToSubmit: '/procurement/demand',
  demandToApprove: '/procurement/demand',
  demandToAccept: '/procurement/demand',
  alertsRepairsNew: '/repairs?status=new',
  alertsCalibrationOverdue: '/equipment?calibrationOverdue=true',
  alertsStock: '/stock/alerts?resolved=false',
}

const META: Record<string, { icon: LucideIcon; tone: KpiTone }> = {
  repairsAssigned: { icon: Wrench, tone: 'info' },
  repairsPendingResponse: { icon: UserCheck, tone: 'warning' },
  repairsOverdue: { icon: AlertTriangle, tone: 'danger' },
  maintenanceDue7d: { icon: CalendarClock, tone: 'warning' },
  maintenanceOverdue: { icon: AlertTriangle, tone: 'danger' },
  requestsPendingApproval: { icon: ClipboardList, tone: 'info' },
  requestsPendingIssue: { icon: PackageMinus, tone: 'info' },
  requestsPendingReceive: { icon: PackageCheck, tone: 'info' },
  stocktakesCounting: { icon: ClipboardCheck, tone: 'info' },
  demandToSubmit: { icon: ShoppingCart, tone: 'warning' },
  demandToApprove: { icon: ClipboardList, tone: 'info' },
  demandToAccept: { icon: PackageCheck, tone: 'warning' },
  alertsRepairsNew: { icon: Inbox, tone: 'warning' },
  alertsCalibrationOverdue: { icon: Gauge, tone: 'danger' },
  alertsStock: { icon: Boxes, tone: 'warning' },
}

const GROUPS: { key: string; items: string[] }[] = [
  { key: 'mine', items: ['repairsAssigned', 'repairsPendingResponse', 'repairsOverdue'] },
  { key: 'maintenance', items: ['maintenanceDue7d', 'maintenanceOverdue'] },
  {
    key: 'requests',
    items: ['requestsPendingApproval', 'requestsPendingIssue', 'requestsPendingReceive'],
  },
  {
    key: 'alerts',
    items: ['stocktakesCounting', 'alertsRepairsNew', 'alertsCalibrationOverdue', 'alertsStock'],
  },
  { key: 'demand', items: ['demandToSubmit', 'demandToApprove', 'demandToAccept'] },
]

export function Component() {
  const { t } = useTranslation('dashboard')
  const query = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => unwrap(api.GET('/v1/me/tasks')) as Promise<MyTasks>,
  })
  // me/tasks.demand (T5) chưa sẵn sàng — đếm từ /v1/demand/my (phiếu khoa mình,
  // các kỳ đang mở) bằng trạng thái phiếu.
  const demandMy = useQuery({
    queryKey: ['demand-my', 'tasks'],
    queryFn: () => demandApi.getMyDemand(),
  })
  const data = query.data
  const dmy = demandMy.data?.items ?? []
  const values: Record<string, number> = {
    ...(data
      ? {
          repairsAssigned: data.repairs.assigned,
          repairsPendingResponse: data.repairs.pendingResponse,
          repairsOverdue: data.repairs.overdue,
          maintenanceDue7d: data.maintenance.due7d,
          maintenanceOverdue: data.maintenance.overdue,
          requestsPendingApproval: data.requests.pendingApproval,
          requestsPendingIssue: data.requests.pendingIssue,
          requestsPendingReceive: data.requests.pendingReceive,
          stocktakesCounting: data.stocktakes.counting,
          alertsRepairsNew: data.alerts.repairsNew,
          alertsCalibrationOverdue: data.alerts.calibrationOverdue,
          alertsStock: Object.values(data.alerts.stock).reduce((sum, value) => sum + value, 0),
        }
      : {}),
    ...(demandMy.data
      ? {
          demandToSubmit: dmy.filter((r) => r.status === 'draft' || r.status === 'returned').length,
          demandToApprove: dmy.filter((r) => r.status === 'submitted').length,
          demandToAccept: dmy.filter((r) => r.status === 'dept_approved').length,
        }
      : {}),
  }
  const total = Object.values(values).reduce((sum, value) => sum + value, 0)

  return (
    <>
      <PageHeader
        title={t('myTasksTitle')}
        description={
          data
            ? t('myTasksSummary', {
                defaultValue: '{{n}} việc đang chờ bạn xử lý — bấm vào thẻ để mở danh sách.',
                n: total,
              })
            : t('myTasksHint', { defaultValue: 'Việc được giao và các mục cần bạn xử lý.' })
        }
      />
      {query.error && <ErrorState error={query.error} onRetry={() => void query.refetch()} />}
      {query.isPending && <PageSkeleton label={t('loading', { defaultValue: 'Đang tải…' })} />}
      {data && (
        <div className="space-y-5">
          {GROUPS.map((group) => (
            <SectionCard
              key={group.key}
              title={t(`taskGroups.${group.key}`, {
                defaultValue: {
                  mine: 'Sửa chữa của tôi',
                  maintenance: 'Bảo dưỡng',
                  requests: 'Phiếu yêu cầu',
                  alerts: 'Cảnh báo & kiểm kê',
                }[group.key],
              })}
            >
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {group.items.map((key) => {
                  const meta = META[key] ?? { icon: Inbox, tone: 'neutral' as const }
                  const Icon = meta.icon
                  return (
                    <Link key={key} to={LINKS[key] ?? '/my-tasks'} className="block">
                      <KpiCard
                        title={t(`tasks.${key}`)}
                        value={values[key] ?? 0}
                        icon={<Icon />}
                        tone={meta.tone}
                      />
                    </Link>
                  )
                })}
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </>
  )
}
