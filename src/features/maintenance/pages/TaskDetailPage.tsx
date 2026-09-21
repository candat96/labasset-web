import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { PageMeta } from '@/components/page/PageHeader'
import { DetailLayout } from '@/components/detail-layout'
import { SectionCard } from '@/components/page/SectionCard'
import { DataList } from '@/components/page/DataList'
import { DetailSkeleton } from '@/components/page/DetailSkeleton'
import { EmptyState } from '@/components/page/EmptyState'
import { Timeline } from '@/components/timeline'
import { ErrorState } from '@/components/page/ErrorState'
import {
  CalendarClock,
  CalendarDays,
  Check,
  ClipboardList,
  ListChecks,
  Microscope,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileField } from '@/components/form/file-field'
import { AsyncSelect } from '@/components/form/async-select'
import { SignaturePad } from '@/components/signature-pad'
import { staffUserOptions, supplyOptions } from '@/api/references'
import { uploadFile } from '@/api/files'
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
  const [finishOpen, setFinishOpen] = useState(false)
  const [overallPass, setOverallPass] = useState<'pass' | 'fail'>('pass')
  const [finishNotes, setFinishNotes] = useState('')
  const [reassignOpen, setReassignOpen] = useState(false)
  const [reassignUserId, setReassignUserId] = useState<string | null>(null)
  const [signOpen, setSignOpen] = useState(false)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
  const [signerName, setSignerName] = useState('')
  const [signatureRole, setSignatureRole] = useState<'technician' | 'department'>('technician')
  const [suppliesUsed, setSuppliesUsed] = useState<
    Array<{ supplyId: string; quantity: number; lotNo?: string }>
  >([])
  const [missingKeys, setMissingKeys] = useState<Set<string>>(new Set())
  const dirty = useRef(false)
  const clientVersion = useRef(0)
  const seededVersion = useRef<number | null>(null)
  const resultsRef = useRef<Record<string, ResultRow>>({})
  useEffect(() => {
    if (!detail.data || dirty.current || seededVersion.current === detail.data.clientVersion) return
    const next: Record<string, ResultRow> = {}
    for (const item of detail.data.templateItems) {
      const found = detail.data.results.find((row) => row.key === item.key)
      next[item.key] = found ?? { key: item.key }
    }
    resultsRef.current = next
    setResults(next)
    setSuppliesUsed(detail.data.suppliesUsed)
    clientVersion.current = detail.data.clientVersion
    seededVersion.current = detail.data.clientVersion
  }, [detail.data])
  const refetchTask = detail.refetch
  const save = useCallback(async () => {
    try {
      const saved = await api.saveResults(id, {
        results: Object.values(resultsRef.current),
        clientVersion: clientVersion.current + 1,
      })
      clientVersion.current = saved.clientVersion
      seededVersion.current = saved.clientVersion
      dirty.current = false
      toast.success(t('resultsSaved'))
      void invalidate()
      return true
    } catch (error) {
      if (isApiError(error) && error.code === 'MAINT_STALE_VERSION') {
        toast.error(messageFor(error))
        dirty.current = false
        void refetchTask()
      } else toast.error(messageFor(error))
      return false
    }
  }, [id, invalidate, refetchTask, t])
  useEffect(() => {
    if (!detail.data || detail.data.status !== 'in_progress') return
    const timer = setInterval(() => {
      if (!dirty.current) return
      void save()
    }, 30000)
    return () => clearInterval(timer)
  }, [detail.data, save])
  if (detail.isPending) return <DetailSkeleton label={t('loadingTask')} />
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data
  const assignee = isStaff || row.assigneeId === userId
  const canStart = ['scheduled', 'overdue'].includes(row.status) && assignee
  const canSave = row.status === 'in_progress' && assignee
  const patch = (key: string, over: Partial<ResultRow>) => {
    dirty.current = true
    setResults((curr) => {
      const next = { ...curr, [key]: { ...curr[key], key, ...over } }
      resultsRef.current = next
      return next
    })
  }
  return (
    <>
      {dialog}
      <DetailLayout
        eyebrow={t('tasksTitle')}
        code={row.code}
        name={row.code}
        badge={
          <div className="flex gap-1">
            <StatusBadge value={row.status} map={taskStatusMap} />
            <StatusBadge value={row.type} map={taskTypeMap} />
          </div>
        }
        meta={
          <>
            <PageMeta icon={<Microscope />}>
              <Link className="text-primary hover:underline" to={`/equipment/${row.equipmentId}`}>
                {row.equipment?.code ? `${row.equipment.code} – ` : ''}
                {row.equipment?.name ?? t('equipment')}
              </Link>
            </PageMeta>
            <PageMeta icon={<CalendarClock />}>
              {t('schedule')} {formatDateTime(row.scheduledAt)}
            </PageMeta>
            <PageMeta icon={<CalendarDays />}>
              {t('due', { defaultValue: 'Hạn' })} {formatDateTime(row.dueAt)}
            </PageMeta>
            {row.planId && (
              <PageMeta icon={<ClipboardList />}>
                <Link
                  className="text-primary hover:underline"
                  to={`/maintenance/plans/${row.planId}`}
                >
                  {t('plan')}
                </Link>
              </PageMeta>
            )}
          </>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {canStart && (
              <Button
                onClick={async () => {
                  try {
                    await api.startTask(id)
                    toast.success(t('taskStarted'))
                    void invalidate()
                  } catch (error) {
                    toast.error(messageFor(error))
                  }
                }}
              >
                {t('start')}
              </Button>
            )}
            {canSave && <Button onClick={() => void save()}>{t('saveResults')}</Button>}
            {isStaff && row.status !== 'done' && row.status !== 'skipped' && (
              <Button variant="outline" onClick={() => setReassignOpen(true)}>
                {t('reassign')}
              </Button>
            )}
            {['in_progress', 'done'].includes(row.status) && (
              <Button variant="outline" onClick={() => setSignOpen(true)}>
                {t('sign')}
              </Button>
            )}
            {canSave && <Button onClick={() => setFinishOpen(true)}>{t('finish')}</Button>}
            {isAdm && !['done', 'skipped'].includes(row.status) && (
              <Button
                variant="outline"
                onClick={async () => {
                  const reason = await confirm({
                    title: t('skipConfirm'),
                    requireReason: true,
                    destructive: true,
                  })
                  if (reason === false) return
                  try {
                    await api.skipTask(id, reason)
                    toast.success(t('taskSkipped'))
                    void invalidate()
                  } catch (error) {
                    toast.error(messageFor(error))
                  }
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
        information={
          <>
            <h2 className="mb-3 text-[15px] leading-6 font-semibold">
              {t('info', { defaultValue: 'Thông tin' })}
            </h2>
            <DataList
              columns={1}
              items={[
                {
                  label: t('equipment'),
                  value: (
                    <Link
                      className="text-primary hover:underline"
                      to={`/equipment/${row.equipmentId}`}
                    >
                      {row.equipment?.code} – {row.equipment?.name}
                    </Link>
                  ),
                },
                { label: t('type'), value: <StatusBadge value={row.type} map={taskTypeMap} /> },
                { label: t('schedule'), value: formatDateTime(row.scheduledAt) },
                { label: t('due', { defaultValue: 'Hạn' }), value: formatDateTime(row.dueAt) },
                {
                  label: t('result'),
                  value: row.overallPass == null ? null : row.overallPass ? t('pass') : t('fail'),
                },
                { label: t('notes'), value: row.notes, full: true },
              ]}
            />
            <h2 className="mt-5 mb-3 text-[15px] leading-6 font-semibold">{t('tabHistory')}</h2>
            <Timeline
              events={[
                {
                  at: row.createdAt,
                  title: t('createdAt', { defaultValue: 'Tạo công việc' }),
                  tone: 'muted',
                },
                ...(row.startedAt
                  ? [{ at: row.startedAt, title: t('start'), tone: 'primary' as const }]
                  : []),
                ...(row.finishedAt
                  ? [
                      {
                        at: row.finishedAt,
                        title: t('finish'),
                        tone:
                          row.overallPass === false ? ('danger' as const) : ('success' as const),
                      },
                    ]
                  : []),
              ]}
            />
          </>
        }
        tabs={[
          {
            value: 'checklist',
            label: 'Checklist',
            count: row.templateItems.length,
            content: (
              <>
                {row.templateItems.length === 0 && (
                  <SectionCard>
                    <EmptyState
                      icon={ListChecks}
                      title={t('noChecklist', { defaultValue: 'Công việc này không có checklist' })}
                    />
                  </SectionCard>
                )}
                {row.templateItems.map((item) => {
                  const result = results[item.key] ?? { key: item.key }
                  const measure =
                    typeof result.value === 'number' ? result.value : Number(result.value)
                  const inRange =
                    item.type === 'measure' &&
                    Number.isFinite(measure) &&
                    (item.min == null || measure >= item.min) &&
                    (item.max == null || measure <= item.max)
                  return (
                    <div
                      key={item.key}
                      className={cn(
                        'border-divider rounded-xl border p-4 transition-colors',
                        missingKeys.has(item.key) && 'border-destructive bg-destructive-bg/40',
                        result.pass === true && 'border-success/40 bg-success-bg/30',
                        result.pass === false && 'border-destructive/40 bg-destructive-bg/30',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[14px] leading-5 font-semibold">
                          {item.label}
                          {item.optional ? '' : <span className="text-destructive"> *</span>}
                        </p>
                        {result.pass === true && (
                          <Check className="text-success size-4 shrink-0" aria-hidden />
                        )}
                        {result.pass === false && (
                          <X className="text-destructive size-4 shrink-0" aria-hidden />
                        )}
                      </div>
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
                      <FileField
                        label={t('attachmentPhoto')}
                        value={result.photoFileId ?? null}
                        onChange={(photoFileId) =>
                          patch(item.key, { photoFileId: photoFileId ?? undefined })
                        }
                      />
                    </div>
                  )
                })}
                <SectionCard
                  title={t('suppliesUsed')}
                  actions={
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSuppliesUsed((current) => [...current, { supplyId: '', quantity: 1 }])
                      }
                    >
                      {t('addSupply')}
                    </Button>
                  }
                  bodyClassName="space-y-3"
                >
                  {suppliesUsed.map((supply, index) => (
                    <div key={`${supply.supplyId}-${index}`} className="grid gap-2 md:grid-cols-3">
                      <AsyncSelect
                        label={t('supply')}
                        queryKey="supplies"
                        loadOptions={supplyOptions}
                        value={supply.supplyId || null}
                        onChange={(value) =>
                          setSuppliesUsed((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, supplyId: typeof value === 'string' ? value : '' }
                                : item,
                            ),
                          )
                        }
                      />
                      <Input
                        aria-label={t('quantity')}
                        type="number"
                        min="0"
                        step="0.001"
                        value={supply.quantity}
                        onChange={(event) =>
                          setSuppliesUsed((current) =>
                            current.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, quantity: event.target.valueAsNumber || 0 }
                                : item,
                            ),
                          )
                        }
                      />
                      <div className="flex gap-2">
                        <Input
                          aria-label={t('lotNo')}
                          placeholder={t('lotNo')}
                          value={supply.lotNo ?? ''}
                          onChange={(event) =>
                            setSuppliesUsed((current) =>
                              current.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, lotNo: event.target.value } : item,
                              ),
                            )
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() =>
                            setSuppliesUsed((current) =>
                              current.filter((_, itemIndex) => itemIndex !== index),
                            )
                          }
                        >
                          {t('remove')}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {suppliesUsed.length === 0 && (
                    <p className="text-muted-foreground text-[13px]">
                      {t('noSuppliesUsed', { defaultValue: 'Chưa ghi vật tư tiêu hao' })}
                    </p>
                  )}
                </SectionCard>
              </>
            ),
          },
          {
            value: 'docs',
            label: t('tabDocs'),
            content: (
              <SectionCard title={t('tabDocs')}>
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
              </SectionCard>
            ),
          },
          {
            value: 'audit',
            label: t('tabHistory'),
            content: (
              <SectionCard title={t('audit', { defaultValue: 'Nhật ký thay đổi' })}>
                <AuditTrail entityType="maintenance_task" entityId={id} />
              </SectionCard>
            ),
          },
        ]}
      />
      <Dialog open={finishOpen} onOpenChange={setFinishOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('finish')}</DialogTitle>
          </DialogHeader>
          <Select
            value={overallPass}
            onValueChange={(value) => setOverallPass(value as 'pass' | 'fail')}
          >
            <SelectTrigger aria-label={t('result')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pass">{t('pass')}</SelectItem>
              <SelectItem value="fail">{t('fail')}</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            placeholder={t('notes')}
            value={finishNotes}
            onChange={(event) => setFinishNotes(event.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinishOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              onClick={async () => {
                if (dirty.current && !(await save())) return
                try {
                  await api.finishTask(id, {
                    overallPass: overallPass === 'pass',
                    notes: finishNotes || undefined,
                    suppliesUsed: suppliesUsed.filter((item) => item.supplyId && item.quantity > 0),
                  })
                  setMissingKeys(new Set())
                  setFinishOpen(false)
                  toast.success(t('taskFinished'))
                  void invalidate()
                } catch (error) {
                  if (isApiError(error) && error.code === 'MAINT_RESULTS_INCOMPLETE') {
                    const details = error.details as { key?: string; keys?: string[] } | undefined
                    setMissingKeys(new Set(details?.keys ?? (details?.key ? [details.key] : [])))
                  }
                  toast.error(messageFor(error))
                }
              }}
            >
              {t('finish')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('reassign')}</DialogTitle>
          </DialogHeader>
          <AsyncSelect
            label={t('assignee')}
            queryKey="staff-users"
            loadOptions={staffUserOptions}
            value={reassignUserId}
            onChange={(value) => setReassignUserId(typeof value === 'string' ? value : null)}
          />
          <DialogFooter>
            <Button
              disabled={!reassignUserId}
              onClick={async () => {
                if (!reassignUserId) return
                try {
                  await api.reassignTask(id, reassignUserId)
                  toast.success(t('reassigned'))
                  setReassignOpen(false)
                  void invalidate()
                } catch (error) {
                  toast.error(messageFor(error))
                }
              }}
            >
              {t('reassign')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('sign')}</DialogTitle>
          </DialogHeader>
          <Select
            value={signatureRole}
            onValueChange={(value) => setSignatureRole(value as 'technician' | 'department')}
          >
            <SelectTrigger aria-label={t('signatureRole')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="technician">{t('technician')}</SelectItem>
              <SelectItem value="department">{t('department')}</SelectItem>
            </SelectContent>
          </Select>
          <Input
            aria-label={t('signerName')}
            placeholder={t('signerName')}
            value={signerName}
            onChange={(event) => setSignerName(event.target.value)}
          />
          <SignaturePad onFile={setSignatureFile} />
          <DialogFooter>
            <Button
              disabled={!signatureFile || !signerName.trim()}
              onClick={async () => {
                if (!signatureFile || !signerName.trim()) return
                try {
                  const fileId = await uploadFile(signatureFile)
                  await api.signTask(id, {
                    role: signatureRole,
                    fileId,
                    signerName: signerName.trim(),
                  })
                  toast.success(t('signed'))
                  setSignOpen(false)
                  setSignatureFile(null)
                  void invalidate()
                } catch (error) {
                  toast.error(messageFor(error))
                }
              }}
            >
              {t('sign')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
