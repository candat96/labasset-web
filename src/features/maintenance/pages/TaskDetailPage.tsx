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
import { useInvalidateMaint, useTask } from '../hooks'
import type { ResultRow } from '../types'

export function Component() {
  const { id = '' } = useParams()
  const detail = useTask(id)
  const invalidate = useInvalidateMaint()
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
  if (detail.isPending) return <p role="status">Đang tải công việc…</p>
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
      toast.success('Đã lưu kết quả')
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
                  toast.success('Đã bắt đầu')
                  void invalidate()
                }}
              >
                Bắt đầu
              </Button>
            )}
            {canSave && <Button onClick={() => void save()}>Lưu kết quả</Button>}
            {canSave && (
              <Button
                onClick={async () => {
                  try {
                    await api.finishTask(id, { overallPass: true })
                    toast.success('Đã hoàn thành')
                    void invalidate()
                  } catch (error) {
                    toast.error(messageFor(error))
                  }
                }}
              >
                Hoàn thành
              </Button>
            )}
            {isAdm && row.status !== 'done' && (
              <Button
                variant="outline"
                onClick={async () => {
                  const reason = await confirm({
                    title: 'Bỏ qua?',
                    requireReason: true,
                    destructive: true,
                  })
                  if (reason === false) return
                  await api.skipTask(id, reason)
                  toast.success('Đã bỏ qua')
                  void invalidate()
                }}
              >
                Bỏ qua
              </Button>
            )}
            {row.status === 'done' && (
              <Button
                variant="outline"
                onClick={() =>
                  void api.downloadTaskReport(id, row.code).catch((e) => toast.error(messageFor(e)))
                }
              >
                In biên bản
              </Button>
            )}
          </div>
        }
      />
      <p className="text-muted-foreground mb-4 text-sm">
        Lịch {formatDateTime(row.scheduledAt)} · Hạn {formatDateTime(row.dueAt)}
        {row.planId && (
          <>
            {' '}
            ·{' '}
            <Link className="text-primary hover:underline" to={`/maintenance/plans/${row.planId}`}>
              Kế hoạch
            </Link>
          </>
        )}
        {' · '}
        <Link className="text-primary hover:underline" to={`/equipment/${row.equipmentId}`}>
          Máy
        </Link>
      </p>
      <Tabs defaultValue="checklist">
        <TabsList>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="docs">Tài liệu</TabsTrigger>
          <TabsTrigger value="audit">Lịch sử</TabsTrigger>
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
                      Đạt
                    </Button>
                    <Button
                      size="sm"
                      variant={result.pass === false ? 'default' : 'outline'}
                      onClick={() => patch(item.key, { pass: false, value: false })}
                    >
                      Không đạt
                    </Button>
                  </div>
                )}
                {item.type === 'measure' && (
                  <div className="mt-2">
                    <Input
                      aria-label={item.label}
                      type="number"
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
                    <p className="text-muted-foreground text-xs">
                      {item.unit}{' '}
                      {item.min != null || item.max != null
                        ? `(${item.min ?? '—'}–${item.max ?? '—'})`
                        : ''}
                      {inRange ? ' · trong khoảng' : ''}
                    </p>
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
                  placeholder="Ghi chú"
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
              { value: 'photo', label: 'Ảnh' },
              { value: 'signature_technician', label: 'Chữ ký kỹ thuật' },
              { value: 'signature_department', label: 'Chữ ký khoa' },
              { value: 'report', label: 'Biên bản' },
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
