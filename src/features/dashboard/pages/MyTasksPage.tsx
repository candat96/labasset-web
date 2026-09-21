import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { api, unwrap } from '@/api/client'
import type { components } from '@/api/schema'
import { PageHeader } from '@/components/page/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useTranslation } from 'react-i18next'

type MyTasks = components['schemas']['MyTasksResponseDto']

const LINKS: Record<string, string> = {
  repairsAssigned: '/repairs?assigneeId=me',
  repairsPendingResponse: '/repairs?assigneeId=me',
  repairsOverdue: '/repairs?assigneeId=me&overdue=true',
  maintenanceDue7d: '/maintenance/tasks?assigneeId=me',
  maintenanceOverdue: '/maintenance/tasks?assigneeId=me&status=overdue',
  requestsPendingApproval: '/requests?pendingFor=me',
  requestsPendingIssue: '/requests?status=approved',
  requestsPendingReceive: '/requests?status=issued',
  stocktakesCounting: '/stocktakes?status=counting',
  alertsRepairsNew: '/repairs?status=new',
  alertsCalibrationOverdue: '/calibrations?overdue=true',
  alertsStock: '/stock/alerts?resolved=false',
}

export function Component() {
  const { t } = useTranslation('dashboard')
  const query = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => unwrap(api.GET('/v1/me/tasks')) as Promise<MyTasks>,
  })
  const data = query.data
  const rows = data
    ? [
        ['repairsAssigned', data.repairs.assigned],
        ['repairsPendingResponse', data.repairs.pendingResponse],
        ['repairsOverdue', data.repairs.overdue],
        ['maintenanceDue7d', data.maintenance.due7d],
        ['maintenanceOverdue', data.maintenance.overdue],
        ['requestsPendingApproval', data.requests.pendingApproval],
        ['requestsPendingIssue', data.requests.pendingIssue],
        ['requestsPendingReceive', data.requests.pendingReceive],
        ['stocktakesCounting', data.stocktakes.counting],
        ['alertsRepairsNew', data.alerts.repairsNew],
        ['alertsCalibrationOverdue', data.alerts.calibrationOverdue],
        ['alertsStock', Object.values(data.alerts.stock).reduce((sum, value) => sum + value, 0)],
      ].sort((a, b) => Number(b[1]) - Number(a[1]))
    : []

  return (
    <>
      <PageHeader title={t('myTasksTitle')} />
      {query.error && (
        <p role="alert" className="text-destructive">
          Không tải được việc của tôi.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {query.isPending
          ? Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-24" />)
          : rows.map(([key, value]) => (
              <Card key={String(key)}>
                <CardContent className="p-4">
                  <Link className="block" to={LINKS[String(key)] ?? '/my-tasks'}>
                    <div className="text-muted-foreground text-sm">{t(`tasks.${key}`)}</div>
                    <div className="mt-1 text-2xl font-semibold tabular-nums">{String(value)}</div>
                  </Link>
                </CardContent>
              </Card>
            ))}
      </div>
    </>
  )
}
