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
import { useInvalidateMaint, usePlan } from '../hooks'

export function Component() {
  const { id = '' } = useParams()
  const detail = usePlan(id)
  const yearNow = new Date().getUTCFullYear()
  const [year, setYear] = useState(String(yearNow))
  const invalidate = useInvalidateMaint()
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
  if (detail.isPending) return <p role="status">Đang tải kế hoạch…</p>
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
          <dt className="text-muted-foreground">Chu kỳ</dt>
          <dd>{row.cycleMonths ? `${row.cycleMonths} tháng` : `${row.cycleDays ?? '—'} ngày`}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Bắt đầu</dt>
          <dd>{formatDate(row.startDate) || '—'}</dd>
        </div>
      </dl>
      <section className="mb-6 rounded-lg border p-3">
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <Input
            type="number"
            aria-label="Năm"
            className="w-28"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
          <Button
            onClick={async () => {
              try {
                const result = await generatePlan(id, Number(year))
                toast.success(`Đã tạo ${result.created ?? 0}, bỏ qua ${result.skipped ?? 0}`)
                void invalidate()
                void tasks.refetch()
              } catch (error) {
                toast.error(messageFor(error))
              }
            }}
          >
            Sinh lịch năm {year}
          </Button>
        </div>
        <h2 className="mb-2 font-medium">Xem trước lịch</h2>
        <ul className="space-y-1 text-sm">
          {previewRows.map((item, index) => {
            const rec = item as Record<string, unknown>
            return (
              <li key={index}>
                {String(rec.equipmentCode ?? rec.equipmentId ?? 'Máy')} ·{' '}
                {String(rec.scheduledAt ?? rec.date ?? '')}
                {rec.exists || rec.hasTask ? ' (đã có task)' : ' (sẽ tạo)'}
              </li>
            )
          })}
          {previewRows.length === 0 && <li className="text-muted-foreground">Chưa có mốc</li>}
        </ul>
      </section>
      <section>
        <h2 className="mb-2 font-medium">Task đã sinh</h2>
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
