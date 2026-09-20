import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/status-badge'
import { commonStatusMap, taskStatusMap } from '@/lib/status-maps'
import { formatDate } from '@/lib/format/date'
import { messageFor } from '@/api/errors'
import { generatePlan, listTasks, previewPlan } from '../api'
import { useInvalidatePlans, useInvalidateTasks, usePlan } from '../hooks'
import { useTranslation } from 'react-i18next'

export function Component() {
  const { t } = useTranslation('maintenance')

  const { id = '' } = useParams()
  const detail = usePlan(id)
  const yearNow = new Date().getUTCFullYear()
  const [year, setYear] = useState(String(yearNow))
  const invalidatePlans = useInvalidatePlans()
  const invalidateTasks = useInvalidateTasks()
  const preview = useQuery({
    queryKey: ['maintenance', 'plans', id, 'preview', year],
    queryFn: () => previewPlan(id, Number(year)),
    enabled: !!id,
  })
  const tasks = useQuery({
    queryKey: ['maintenance', 'tasks', { planId: id }],
    queryFn: () => listTasks({ planId: id, page: 1, limit: 50 }),
    enabled: !!id,
  })
  if (detail.isPending) return <p role="status">{t('loadingPlan')}</p>
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data
  const previewRows = Array.isArray(preview.data)
    ? preview.data
    : ((preview.data as { items?: unknown[] } | undefined)?.items ?? [])
  return (
    <>
      <PageHeader
        title={row.name}
        badge={<StatusBadge value={row.isActive ? 'active' : 'inactive'} map={commonStatusMap} />}
      />
      <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">{t('cycle')}</dt>
          <dd>
            {row.cycleMonths
              ? t('cycleMonthsValue', { count: row.cycleMonths })
              : t('cycleDaysValue', { count: row.cycleDays ?? '—' })}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('start')}</dt>
          <dd>{formatDate(row.startDate) || '—'}</dd>
        </div>
      </dl>
      <section className="mb-6 rounded-lg border p-3">
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <Input
            type="number"
            aria-label={t('year')}
            className="w-28"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
          <Button
            onClick={async () => {
              try {
                const result = await generatePlan(id, Number(year))
                toast.success(
                  t('planGenerated', {
                    created: result.created ?? 0,
                    skipped: result.skipped ?? 0,
                  }),
                )
                void invalidatePlans()
                invalidateTasks()
              } catch (error) {
                toast.error(messageFor(error))
              }
            }}
          >
            {t('generateYear')} {year}
          </Button>
        </div>
        <h2 className="mb-2 font-medium">{t('previewTitle')}</h2>
        <ul className="space-y-1 text-sm">
          {previewRows.map((item, index) => {
            const rec = item as Record<string, unknown>
            return (
              <li key={index}>
                {String(rec.equipmentCode ?? rec.equipmentId ?? t('equipment'))} ·{' '}
                {String(rec.scheduledAt ?? rec.date ?? '')}
                {rec.exists || rec.hasTask ? t('previewExists') : t('previewWillCreate')}
              </li>
            )
          })}
          {previewRows.length === 0 && (
            <li className="text-muted-foreground">{t('previewEmpty')}</li>
          )}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 font-medium">{t('generatedTasks')}</h2>
        <ul className="space-y-1 text-sm">
          {(tasks.data?.items ?? []).map((task) => (
            <li key={task.id}>
              <Link className="text-primary hover:underline" to={`/maintenance/tasks/${task.id}`}>
                {task.code}
              </Link>{' '}
              <StatusBadge value={task.status} map={taskStatusMap} />
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
