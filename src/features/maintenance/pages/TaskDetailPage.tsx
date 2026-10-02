import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'
import { PageMeta } from '@/components/page/PageHeader'
import { DetailLayout } from '@/components/detail-layout'
import { SectionCard } from '@/components/page/SectionCard'
import { ActionMenu } from '@/components/page/ActionMenu'
import { DataList } from '@/components/page/DataList'
import { DetailSkeleton } from '@/components/page/DetailSkeleton'
import { EmptyState } from '@/components/page/EmptyState'
import { Timeline } from '@/components/timeline'
import { ErrorState } from '@/components/page/ErrorState'
import {
  Ban,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ListChecks,
  Microscope,
  PenLine,
  Plus,
  Printer,
  Save,
  UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
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
import { AsyncSelect } from '@/components/form/async-select'
import { SignaturePad } from '@/components/signature-pad'
import { DocumentSigningCard } from '@/features/signing/components/SignedDocumentsPanel'
import { DOC_DEFAULT_SLOTS } from '@/features/signing/api'
import { staffUserOptions, supplyOptions } from '@/api/references'
import { uploadFile } from '@/api/files'
import * as api from '../api'
import { useInvalidateTasks, useTask } from '../hooks'
import type { ResultRow } from '../types'
import { ChecklistItemCard } from '../components/ChecklistItemCard'
import {
  nextItemUid,
  slugifyItemKey,
  toChecklistItems,
  toEditableItems,
  uniqueItemKey,
  type EditableChecklistItem,
} from '../checklist'
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
  const [checklist, setChecklist] = useState<EditableChecklistItem[]>([])
  const dirtyChecklist = useRef(false)
  const checklistRef = useRef<EditableChecklistItem[]>([])
  const [saveTemplateChecked, setSaveTemplateChecked] = useState(false)
  const [templateName, setTemplateName] = useState('')
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
    if (!dirtyChecklist.current) {
      const items = toEditableItems(detail.data.templateItems)
      checklistRef.current = items
      setChecklist(items)
    }
    setSuppliesUsed(detail.data.suppliesUsed)
    clientVersion.current = detail.data.clientVersion
    seededVersion.current = detail.data.clientVersion
  }, [detail.data])

  const setChecklistItems = useCallback(
    (update: (items: EditableChecklistItem[]) => EditableChecklistItem[]) => {
      dirtyChecklist.current = true
      setChecklist((current) => {
        const next = update(current)
        checklistRef.current = next
        return next
      })
    },
    [],
  )

  const patchItem = useCallback(
    (uid: string, patch: Partial<EditableChecklistItem>) => {
      setChecklistItems((items) =>
        items.map((item) => {
          if (item.uid !== uid) return item
          const merged = { ...item, ...patch }
          // Mục mới chưa có kết quả: sinh lại mã theo nhãn, bảo đảm không trùng.
          if (merged.fresh) {
            const used = new Set(items.filter((row) => row.uid !== uid).map((row) => row.key))
            merged.key = uniqueItemKey(slugifyItemKey(merged.label), used)
          }
          return merged
        }),
      )
    },
    [setChecklistItems],
  )

  const addItem = useCallback(() => {
    setChecklistItems((items) => [
      ...items,
      {
        uid: nextItemUid(),
        key: uniqueItemKey('', new Set(items.map((row) => row.key))),
        label: '',
        type: 'check',
        unit: '',
        min: '',
        max: '',
        optional: false,
        fresh: true,
      },
    ])
  }, [setChecklistItems])

  const removeItem = useCallback(
    (uid: string) => {
      const removed = checklistRef.current.find((item) => item.uid === uid)
      setChecklistItems((items) => items.filter((item) => item.uid !== uid))
      if (removed) {
        dirty.current = true
        setResults((curr) => {
          const next = { ...curr }
          delete next[removed.key]
          resultsRef.current = next
          return next
        })
      }
    },
    [setChecklistItems],
  )

  const patchResult = useCallback((key: string, over: Partial<ResultRow>) => {
    dirty.current = true
    setResults((curr) => {
      const next = { ...curr, [key]: { ...curr[key], key, ...over } }
      resultsRef.current = next
      return next
    })
  }, [])

  /**
   * Lưu các mục kiểm tra của chính công việc rồi xoá kết quả của mục mới đổi mã
   * (kết quả cũ gắn với mã cũ nên phải bỏ trước khi gửi `/results`).
   */
  const saveChecklistItems = useCallback(async () => {
    const items = toChecklistItems(checklistRef.current)
    if (!items) {
      toast.error(t('itemLabelRequired'))
      return false
    }
    let nextResults = resultsRef.current
    try {
      await api.saveChecklist(id, items)
      const keys = new Set(items.map((item) => item.key))
      const pruned = Object.fromEntries(
        Object.entries(resultsRef.current).filter(([key]) => keys.has(key)),
      )
      if (Object.keys(pruned).length !== Object.keys(resultsRef.current).length) {
        dirty.current = true
        resultsRef.current = pruned
        setResults(pruned)
      }
      nextResults = pruned
      const refreshed = await detail.refetch()
      if (refreshed.data) {
        const seeded: Record<string, ResultRow> = {}
        for (const item of refreshed.data.templateItems) {
          const found = refreshed.data.results.find((row) => row.key === item.key)
          seeded[item.key] = found ?? { key: item.key }
        }
        for (const [key, row] of Object.entries(nextResults))
          if (seeded[key]) seeded[key] = { ...seeded[key], ...row, key }
        resultsRef.current = seeded
        setResults(seeded)
        seededVersion.current = refreshed.data.clientVersion
        clientVersion.current = refreshed.data.clientVersion
      }
      dirtyChecklist.current = false
      return true
    } catch (error) {
      toast.error(messageFor(error))
      return false
    }
  }, [id, detail, t])

  const refetchTask = detail.refetch
  const save = useCallback(async () => {
    try {
      if (dirtyChecklist.current && !(await saveChecklistItems())) return false
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
  }, [id, invalidate, refetchTask, t, saveChecklistItems])
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
  const canEditChecklist = isStaff && ['scheduled', 'overdue', 'in_progress'].includes(row.status)
  const canSave = row.status === 'in_progress' && assignee
  const canEnterResults = canSave && !dirtyChecklist.current
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
              <Link className="text-primary" to={`/equipment/${row.equipmentId}`}>
                {row.equipment?.code ? `${row.equipment.code} – ` : ''}
                {row.equipment?.name ?? t('equipment')}
              </Link>
            </PageMeta>
            <PageMeta icon={<CalendarClock />}>
              {t('schedule')} {formatDateTime(row.scheduledAt)}
            </PageMeta>
            <PageMeta icon={<CalendarDays />}>
              {t('due')} {formatDateTime(row.dueAt)}
            </PageMeta>
            {row.planId && (
              <PageMeta icon={<ClipboardList />}>
                <Link className="text-primary" to={`/maintenance/plans/${row.planId}`}>
                  {t('plan')}
                </Link>
              </PageMeta>
            )}
          </>
        }
        actions={
          <ActionMenu
            items={[
              canStart && {
                key: 'start',
                label: t('start'),
                variant: 'primary' as const,
                onClick: () => {
                  void (async () => {
                    try {
                      await api.startTask(id)
                      toast.success(t('taskStarted'))
                      void invalidate()
                    } catch (error) {
                      toast.error(messageFor(error))
                    }
                  })()
                },
              },
              canEditChecklist && {
                key: 'addItem',
                label: t('addItemLine'),
                icon: <Plus />,
                onClick: addItem,
              },
              canEditChecklist && {
                key: 'saveChecklist',
                label: t('saveChecklist'),
                icon: <Save />,
                onClick: () => void saveChecklistItems(),
              },
              canSave && {
                key: 'save',
                label: t('saveResults'),
                icon: <Save />,
                onClick: () => void save(),
              },
              canSave && {
                key: 'finish',
                label: t('finish'),
                variant: 'primary' as const,
                icon: <CheckCircle2 />,
                onClick: () => setFinishOpen(true),
              },
              ['in_progress', 'done'].includes(row.status) && {
                key: 'sign',
                label: t('sign'),
                icon: <PenLine />,
                onClick: () => setSignOpen(true),
              },
              row.status === 'done' && {
                key: 'print',
                label: t('printReport'),
                icon: <Printer />,
                onClick: () =>
                  void api.printTaskReport(id).catch((e) => toast.error(messageFor(e))),
              },
              isStaff &&
                row.status !== 'done' &&
                row.status !== 'skipped' && {
                  key: 'reassign',
                  label: t('reassign'),
                  icon: <UserPlus />,
                  onClick: () => setReassignOpen(true),
                },
              isAdm &&
                !['done', 'skipped'].includes(row.status) && {
                  key: 'skip',
                  label: t('skip'),
                  variant: 'destructive' as const,
                  icon: <Ban />,
                  separator: true,
                  onClick: () => {
                    void (async () => {
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
                    })()
                  },
                },
            ]}
          />
        }
        information={
          <>
            <h2 className="mb-3 text-[15px] leading-6 font-semibold">{t('info')}</h2>
            <DataList
              columns={1}
              items={[
                {
                  label: t('equipment'),
                  value: (
                    <Link className="text-primary" to={`/equipment/${row.equipmentId}`}>
                      {row.equipment?.code} – {row.equipment?.name}
                    </Link>
                  ),
                },
                { label: t('type'), value: <StatusBadge value={row.type} map={taskTypeMap} /> },
                { label: t('schedule'), value: formatDateTime(row.scheduledAt) },
                { label: t('due'), value: formatDateTime(row.dueAt) },
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
                  title: t('createdAt'),
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
                <SectionCard title={`Ảnh tình trạng — ${row.code} (không bắt buộc)`}>
                  <AttachmentsPanel
                    key={id}
                    entityType="maintenance_task"
                    entityId={id}
                    kinds={[{ value: 'photo', label: 'Ảnh tình trạng' }]}
                    canWrite={isStaff && !['done', 'skipped'].includes(row.status)}
                    photosOnly
                  />
                </SectionCard>
                <SectionCard
                  title={t('items')}
                  description={t('itemsEditableHint')}
                  actions={
                    canEditChecklist && (
                      <Button type="button" variant="outline" size="sm" onClick={addItem}>
                        <Plus aria-hidden />
                        {t('addItemLine')}
                      </Button>
                    )
                  }
                  bodyClassName="space-y-3"
                >
                  {checklist.length === 0 && (
                    <EmptyState
                      icon={ListChecks}
                      title={t('noChecklist')}
                      description={t('noChecklistHint')}
                      action={
                        canEditChecklist && (
                          <Button type="button" onClick={addItem}>
                            <Plus aria-hidden />
                            {t('addFirstItem')}
                          </Button>
                        )
                      }
                    />
                  )}
                  {checklist.map((item, index) => (
                    <ChecklistItemCard
                      key={item.uid}
                      item={item}
                      index={index}
                      result={results[item.key] ?? { key: item.key }}
                      missing={missingKeys.has(item.key)}
                      canEdit={canEditChecklist}
                      canEnterResults={canEnterResults}
                      onPatchItem={(patch) => patchItem(item.uid, patch)}
                      onRemove={() => removeItem(item.uid)}
                      onPatchResult={(patch) => patchResult(item.key, patch)}
                    />
                  ))}
                </SectionCard>
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
                    <p className="text-muted-foreground text-[13px]">{t('noSuppliesUsed')}</p>
                  )}
                </SectionCard>
              </>
            ),
          },
          {
            value: 'docs',
            label: t('tabDocs'),
            content: (
              <>
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
                <DocumentSigningCard
                  docType="maintenance.task"
                  id={id}
                  slots={DOC_DEFAULT_SLOTS['maintenance.task']}
                />
              </>
            ),
          },
          {
            value: 'audit',
            label: t('tabHistory'),
            content: (
              <SectionCard title={t('audit')}>
                <AuditTrail entityType="maintenance_task" entityId={id} />
              </SectionCard>
            ),
          },
        ]}
      />
      <Dialog
        open={finishOpen}
        onOpenChange={(open) => {
          setFinishOpen(open)
          if (!open) setSaveTemplateChecked(false)
        }}
      >
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
          <div className="flex items-start gap-2">
            <Checkbox
              id="save-checklist-template"
              className="mt-0.5"
              checked={saveTemplateChecked}
              onCheckedChange={(checked) => {
                const next = checked === true
                setSaveTemplateChecked(next)
                if (next) setTemplateName((current) => current || `${row.code} — mẫu`)
              }}
            />
            <div className="space-y-1">
              <Label htmlFor="save-checklist-template" className="cursor-pointer">
                {t('saveAsTemplateCheckbox')}
              </Label>
              <p className="text-muted-foreground text-[12.5px] leading-5">
                {t('saveAsTemplateHint')}
              </p>
            </div>
          </div>
          {saveTemplateChecked && (
            <Input
              aria-label={t('templateName')}
              placeholder={t('templateName')}
              value={templateName}
              onChange={(event) => setTemplateName(event.target.value)}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinishOpen(false)}>
              {t('cancel')}
            </Button>
            <Button
              disabled={saveTemplateChecked && !templateName.trim()}
              onClick={async () => {
                if (dirtyChecklist.current && !(await saveChecklistItems())) return
                if (dirty.current && !(await save())) return
                try {
                  await api.finishTask(id, {
                    overallPass: overallPass === 'pass',
                    notes: finishNotes || undefined,
                    suppliesUsed: suppliesUsed.filter((item) => item.supplyId && item.quantity > 0),
                  })
                  if (saveTemplateChecked && templateName.trim()) {
                    try {
                      await api.saveAsTemplate(id, { name: templateName.trim() })
                      toast.success(t('templateSaved'))
                      void invalidate()
                    } catch (error) {
                      toast.error(messageFor(error))
                    }
                  }
                  setMissingKeys(new Set())
                  setFinishOpen(false)
                  setSaveTemplateChecked(false)
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
