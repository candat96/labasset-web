import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/status-badge'
import { AttachmentsPanel } from '@/components/attachments-panel'
import { AuditTrail } from '@/components/audit-trail'
import { useConfirm } from '@/components/confirm-dialog'
import { taskStatusMap, taskTypeMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { useCan } from '@/app/guards/useCan'
import { ADM, STAFF } from '@/routes/roles'
import { isApiError, messageFor } from '@/api/errors'
import { useAuthStore } from '@/stores/auth.store'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import * as api from '../api'
import { useInvalidateTasks, useTask } from '../hooks'
import type { ResultRow } from '../types'
import { useTranslation } from 'react-i18next'

export function Component() {
  const { t } = useTranslation('maintenance')

  const { id = '' } = useParams()
  const detail = useTask(id)
  const invalidate = useInvalidateTasks()
  const isAdm = useCan(ADM)
  const isStaff = useCan(STAFF)
  const userId = useAuthStore((s) => s.user?.id)
  const { confirm, dialog } = useConfirm()
  const [results, setResults] = useState<Record<string, ResultRow>>({})
  const dirty = useRef(false)
  useEffect(() => {
    if (!detail.data) return
    const next: Record<string, ResultRow> = {}
    for (const item of detail.data.templateItems) {
      const found = detail.data.results.find((row) => row.key === item.key)
      next[item.key] = found ?? { key: item.key }
    }
    setResults(next)
  }, [detail.data])
  useEffect(() => {
    if (!detail.data || detail.data.status !== 'in_progress') return
    const timer = setInterval(() => {
      if (!dirty.current) return
      void save()
    }, 30000)
    return () => clearInterval(timer)
  })
  if (detail.isPending) return <p role="status">{t('loadingTask')}</p>
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data
  const assignee = isStaff || row.assigneeId === userId
  const canStart = ['scheduled', 'overdue'].includes(row.status) && assignee
  const canSave = row.status === 'in_progress' && assignee
  const save = async () => {
    try {
      await api.saveResults(id, {
        results: Object.values(results),
        clientVersion: row.clientVersion,
      })
      dirty.current = false
      toast.success(t('resultsSaved'))
      void invalidate()
    } catch (error) {
      if (isApiError(error) && error.code === 'MAINT_STALE_VERSION') {
        toast.error(messageFor(error))
        void detail.refetch()
      } else toast.error(messageFor(error))
    }
  }
  const patch = (key: string, over: Partial<ResultRow>) => {
    dirty.current = true
    setResults((curr) => ({ ...curr, [key]: { ...curr[key], key, ...over } }))
  }
  return (
    <>
      {dialog}
      <PageHeader
        title={row.code}
        description={row.equipment?.name}
        badge={
          <div className="flex gap-1">
            <StatusBadge value={row.status} map={taskStatusMap} />
            <StatusBadge value={row.type} map={taskTypeMap} />
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {canStart && (
              <Button
                onClick={async () => {
                  await api.startTask(id)
                  toast.success(t('taskStarted'))
                  void invalidate()
                }}
              >
                {t('start')}
              </Button>
            )}
            {canSave && <Button onClick={() => void save()}>{t('saveResults')}</Button>}
            {canSave && (
              <Button
                onClick={async () => {
                  try {
                    await api.finishTask(id, { overallPass: true })
                    toast.success(t('taskFinished'))
                    void invalidate()
                  } catch (error) {
                    toast.error(messageFor(error))
                  }
                }}
              >
                {t('finish')}
              </Button>
            )}
            {isAdm && row.status !== 'done' && (
              <Button
                variant="outline"
                onClick={async () => {
                  const reason = await confirm({
                    title: t('skipConfirm'),
                    requireReason: true,
                    destructive: true,
                  })
                  if (reason === false) return
                  await api.skipTask(id, reason)
                  toast.success(t('taskSkipped'))
                  void invalidate()
                }}
              >
                {t('skip')}
              </Button>
            )}
            {row.status === 'done' && (
              <Button
                variant="outline"
                onClick={() =>
                  void api.downloadTaskReport(id, row.code).catch((e) => toast.error(messageFor(e)))
                }
              >
                {t('printReport')}
              </Button>
            )}
          </div>
        }
      />
      <p className="text-muted-foreground mb-4 text-sm">
        {t('schedule')} {formatDateTime(row.scheduledAt)} {t('dueLabel')}{' '}
        {formatDateTime(row.dueAt)}
        {row.planId && (
          <>
            {' '}
            ·{' '}
            <Link className="text-primary hover:underline" to={`/maintenance/plans/${row.planId}`}>
              {t('plan')}
            </Link>
          </>
        )}
        {' · '}
        <Link className="text-primary hover:underline" to={`/equipment/${row.equipmentId}`}>
          {t('equipment')}
        </Link>
      </p>
      <Tabs defaultValue="checklist">
        <TabsList>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="docs">{t('tabDocs')}</TabsTrigger>
          <TabsTrigger value="audit">{t('tabHistory')}</TabsTrigger>
        </TabsList>
        <TabsContent value="checklist" className="space-y-3">
          {row.templateItems.map((item) => {
            const result = results[item.key] ?? { key: item.key }
            const measure = typeof result.value === 'number' ? result.value : Number(result.value)
            const inRange =
              item.type === 'measure' &&
              Number.isFinite(measure) &&
              (item.min == null || measure >= item.min) &&
              (item.max == null || measure <= item.max)
            return (
              <div key={item.key} className="rounded border p-3">
                <p className="font-medium">
                  {item.label}
                  {item.optional ? '' : ' *'}
                </p>
                {item.type === 'check' && (
                  <div className="mt-2 flex gap-3">
                    <Button
                      size="sm"
                      variant={result.pass === true ? 'default' : 'outline'}
                      onClick={() => patch(item.key, { pass: true, value: true })}
                    >
                      {t('pass')}
                    </Button>
                    <Button
                      size="sm"
                      variant={result.pass === false ? 'default' : 'outline'}
                      onClick={() => patch(item.key, { pass: false, value: false })}
                    >
                      {t('fail')}
                    </Button>
                  </div>
                )}
                {item.type === 'measure' && (
                  <div className="mt-2">
                    <Input
                      aria-label={item.label}
                      type="number"
                      placeholder={`${item.unit}${item.min != null || item.max != null ? ` (${item.min ?? '—'}–${item.max ?? '—'})` : ''}`}
                      value={result.value == null ? '' : String(result.value)}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : Number(e.target.value)
                        const pass =
                          value == null
                            ? undefined
                            : (item.min == null || value >= item.min) &&
                              (item.max == null || value <= item.max)
                        patch(item.key, { value, pass })
                      }}
                    />
                    {inRange && <span className="sr-only">{t('inRange')}</span>}
                  </div>
                )}
                {item.type === 'text' && (
                  <Textarea
                    className="mt-2"
                    aria-label={item.label}
                    value={typeof result.value === 'string' ? result.value : ''}
                    onChange={(e) =>
                      patch(item.key, { value: e.target.value, pass: !!e.target.value })
                    }
                  />
                )}
                <Input
                  className="mt-2"
                  placeholder={t('notes')}
                  value={result.note ?? ''}
                  onChange={(e) => patch(item.key, { note: e.target.value })}
                />
              </div>
            )
          })}
        </TabsContent>
        <TabsContent value="docs">
          <AttachmentsPanel
            entityType="maintenance_task"
            entityId={id}
            kinds={[
              { value: 'photo', label: t('attachmentPhoto') },
              { value: 'signature_technician', label: t('attachmentSignatureTechnician') },
              { value: 'signature_department', label: t('attachmentSignatureDepartment') },
              { value: 'report', label: t('attachmentReport') },
            ]}
          />
        </TabsContent>
        <TabsContent value="audit">
          <AuditTrail entityType="maintenance_task" entityId={id} />
        </TabsContent>
      </Tabs>
    </>
  )
}
