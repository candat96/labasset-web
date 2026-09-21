import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Big from 'big.js'
import { toast } from 'sonner'
import { Building2, CalendarClock, User } from 'lucide-react'
import { DetailLayout } from '@/components/detail-layout'
import { PageMeta } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { DataList } from '@/components/page/DataList'
import { DetailSkeleton } from '@/components/page/DetailSkeleton'
import { ErrorState } from '@/components/page/ErrorState'
import { ActionMenu } from '@/components/page/ActionMenu'
import { StatusBadge } from '@/components/status-badge'
import { AuditTrail } from '@/components/audit-trail'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { FormDialog } from '@/components/form/FormDialog'
import { TextField } from '@/components/form/fields'
import { DateField } from '@/components/form/date-field'
import { useConfirm } from '@/components/confirm-dialog'
import { messageFor } from '@/api/errors'
import { formatVnd } from '@/lib/format/money'
import { formatQty } from '@/lib/format/number'
import { formatDate, formatDateTime } from '@/lib/format/date'
import { demandDecisionLabels, demandPeriodKindLabels, enumLabel } from '@/lib/enum-labels'
import { demandPeriodStatusMap, demandRequestStatusMap, demandDecisionMap } from '@/lib/status-maps'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import * as api from '../api'
import type {
  DemandConsolidation,
  DemandItemType,
  DemandPeriod,
  DemandRequestSummary,
  DemandRequestSummaryPage,
} from '../paths'
import { useTranslation } from 'react-i18next'

const editSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên kỳ'),
  submitDeadline: z.string().optional(),
  notes: z.string().optional(),
})
type EditValues = z.infer<typeof editSchema>

/** Ô số tiền/số lượng dạng chuỗi Decimal, chỉ gửi lên khi rời ô. */
function DecimalCell({
  value,
  disabled,
  onCommit,
  className,
  ariaLabel,
}: {
  value: string
  disabled?: boolean
  onCommit: (value: string) => void
  className?: string
  ariaLabel?: string
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? value
  return (
    <Input
      aria-label={ariaLabel}
      className={className}
      inputMode="decimal"
      value={shown}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={async () => {
        const next = (draft ?? '').trim()
        setDraft(null)
        if (!next || next === value) return
        try {
          await onCommit(next)
        } catch {
          /* toast lỗi đã hiện ở cấp call site */
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
    />
  )
}

function ConsolidationRow({ row, editable }: { row: DemandConsolidation; editable: boolean }) {
  const { t } = useTranslation('procurement')
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['demand-consolidation'] })
  const patch = async (body: Parameters<typeof api.updateConsolidation>[1]) => {
    try {
      await api.updateConsolidation(row.id, body)
      toast.success(t('updated'))
      invalidate()
    } catch (error) {
      toast.error(messageFor(error))
    }
  }
  const patchTotal = async (value: string) => {
    const oldTotal = new Big(row.qtyApproved || '0')
    if (oldTotal.lte(0)) return patch({ qtyApproved: value })
    const ratio = new Big(value).div(oldTotal)
    await patch({
      qtyApproved: value,
      breakdown: row.breakdown.map((item) => ({
        lineId: item.lineId,
        qtyApproved: ratio
          .mul(item.qtyApproved || '0')
          .round(3)
          .toString(),
      })),
    })
  }
  const amount = new Big(row.unitPricePlan || '0').mul(row.qtyApproved || '0')
  return (
    <>
      <TableRow>
        <TableCell className="w-8">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('expand', { defaultValue: 'Mở rộng' })}
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? '▾' : '▸'}
          </Button>
        </TableCell>
        <TableCell className="font-medium">
          {row.itemName}
          {row.spec ? <p className="text-subtle text-[12px]">{row.spec}</p> : null}
          {row.suggestedDecision && (
            <p className="text-subtle text-[11.5px]">
              {t('suggestedHint', {
                decision: enumLabel(demandDecisionLabels, row.suggestedDecision),
                defaultValue: 'Gợi ý: {{decision}}',
              })}
            </p>
          )}
        </TableCell>
        <TableCell className="text-subtle text-[12.5px]">{row.unit ?? '—'}</TableCell>
        <TableCell className="text-right tabular-nums">{formatQty(row.qtyRequested)}</TableCell>
        <TableCell className="text-right">
          {editable ? (
            <DecimalCell
              className="w-24 text-right"
              ariaLabel={`${row.itemName} — SL duyệt`}
              value={row.qtyApproved ?? '0'}
              onCommit={patchTotal}
            />
          ) : (
            <span className="tabular-nums">{formatQty(row.qtyApproved ?? '0')}</span>
          )}
        </TableCell>
        <TableCell className="text-right">
          {editable ? (
            <DecimalCell
              className="w-28 text-right"
              ariaLabel={`${row.itemName} — Đơn giá kế hoạch`}
              value={row.unitPricePlan ?? '0'}
              onCommit={(value) => void patch({ unitPricePlan: value })}
            />
          ) : (
            <span className="tabular-nums">{formatVnd(row.unitPricePlan ?? '')}</span>
          )}
        </TableCell>
        <TableCell className="text-right tabular-nums">{formatVnd(amount.toString())}</TableCell>
        <TableCell>
          {editable ? (
            <Select
              value={row.decision}
              onValueChange={(value) =>
                void patch({ decision: value as DemandConsolidation['decision'] })
              }
            >
              <SelectTrigger className="w-36" aria-label={`${row.itemName} — Quyết định`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(demandDecisionLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <StatusBadge value={row.decision} map={demandDecisionMap} />
          )}
        </TableCell>
        <TableCell>
          {editable ? (
            <DecimalCell
              className="w-40"
              ariaLabel={`${row.itemName} — Ghi chú`}
              value={row.note ?? ''}
              onCommit={(value) => void patch({ note: value })}
            />
          ) : (
            (row.note ?? '—')
          )}
        </TableCell>
      </TableRow>
      {open && (
        <TableRow>
          <TableCell colSpan={9}>
            <div className="space-y-1 py-1">
              {row.breakdown.map((item) => (
                <div key={item.lineId} className="flex items-center gap-4 text-[13px]">
                  <span className="min-w-40 font-medium">
                    {item.departmentName ?? item.departmentId}
                  </span>
                  <span className="text-subtle tabular-nums">
                    {t('qtyRequested', { defaultValue: 'SL yêu cầu' })}:{' '}
                    {formatQty(item.qtyRequested)}
                  </span>
                  {editable ? (
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-subtle text-[12px]">
                        {t('qtyApproved', { defaultValue: 'SL duyệt' })}
                      </span>
                      <DecimalCell
                        className="w-24 text-right"
                        ariaLabel={`${row.itemName} — ${item.departmentName ?? item.departmentId} SL duyệt`}
                        value={item.qtyApproved ?? '0'}
                        onCommit={(value) =>
                          void patch({
                            breakdown: row.breakdown.map((b) =>
                              b.lineId === item.lineId
                                ? { lineId: b.lineId, qtyApproved: value }
                                : b,
                            ),
                          })
                        }
                      />
                    </div>
                  ) : (
                    <span className="tabular-nums ml-auto">
                      {t('qtyApproved', { defaultValue: 'SL duyệt' })}:{' '}
                      {formatQty(item.qtyApproved)}
                    </span>
                  )}
                </div>
              ))}
              {row.breakdown.length === 0 && (
                <p className="text-subtle text-[13px]">
                  {t('noBreakdown', { defaultValue: 'Không có chi tiết theo khoa' })}
                </p>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

/** Bảng tổng hợp dùng chung cho Tổng hợp / Thiết bị mới / Dịch vụ. */
function ConsolidationTab({
  periodId,
  rows,
  editable,
  filter,
}: {
  periodId: string
  rows: DemandConsolidation[]
  editable: boolean
  filter?: DemandItemType
}) {
  const { t } = useTranslation('procurement')
  const list = filter ? rows.filter((row) => row.itemType === filter) : rows
  const total = list.reduce(
    (sum, row) => sum.add(new Big(row.unitPricePlan || '0').mul(row.qtyApproved || '0')),
    new Big(0),
  )
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {filter == null && (
          <span className="text-subtle text-[13px]">
            {t('totalPlanRows', { defaultValue: 'Không có dòng nào cần hiển thị' })}
          </span>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                await api.exportDemandSummary(periodId)
                toast.success(t('updated'))
              } catch (error) {
                toast.error(messageFor(error))
              }
            }}
          >
            {t('exportExcel')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                await api.downloadDemandProposal(periodId)
                toast.success(t('updated'))
              } catch (error) {
                toast.error(messageFor(error))
              }
            }}
          >
            {t('proposalPdf')}
          </Button>
        </div>
      </div>
      <SectionCard
        title={t('consolidation')}
        description={
          filter != null
            ? t(`${filter}Hint`, {
                defaultValue: 'Dòng tổng hợp theo loại hàng đã chọn',
              })
            : t('totalPlanHint', { defaultValue: 'Sửa tổng sẽ phân bổ tỷ lệ theo các khoa' })
        }
        flush
        footer={
          <div className="text-muted-foreground flex justify-end gap-3 text-sm">
            {t('totalPlan')}:<strong className="tabular-nums">{formatVnd(total.toString())}</strong>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead className="pl-2">{t('itemName')}</TableHead>
                <TableHead>{t('unit')}</TableHead>
                <TableHead className="text-right">{t('qtyRequested')}</TableHead>
                <TableHead className="text-right">{t('qtyApproved')}</TableHead>
                <TableHead className="text-right">{t('unitPricePlan')}</TableHead>
                <TableHead className="text-right">{t('amountPlan')}</TableHead>
                <TableHead>{t('decision')}</TableHead>
                <TableHead>{t('notes')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((line) => (
                <ConsolidationRow key={line.id} row={line} editable={editable} />
              ))}
              {list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-muted-foreground text-center text-sm">
                    {t('noConsolidation', { defaultValue: 'Chưa có dữ liệu tổng hợp' })}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </div>
  )
}

function RequestsTab({ rows, isStaff }: { rows: DemandRequestSummary[]; isStaff: boolean }) {
  const { t } = useTranslation('procurement')
  const qc = useQueryClient()
  const { confirm, dialog } = useConfirm()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['demand-period-requests'] })
    void qc.invalidateQueries({ queryKey: ['demand-period'] })
  }
  const accept = async (row: DemandRequestSummary) => {
    if ((await confirm({ title: t('acceptConfirm') })) === false) return
    try {
      await api.acceptDemandRequest(row.requestId)
      toast.success(t('updated'))
      invalidate()
    } catch (error) {
      toast.error(messageFor(error))
    }
  }
  const returnRequest = async (row: DemandRequestSummary) => {
    const reason = await confirm({
      title: t('returnConfirm'),
      requireReason: true,
      destructive: true,
    })
    if (reason === false) return
    try {
      await api.returnDemandRequest(row.requestId, reason)
      toast.success(t('updated'))
      invalidate()
    } catch (error) {
      toast.error(messageFor(error))
    }
  }
  return (
    <>
      {dialog}
      <SectionCard flush>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">{t('department')}</TableHead>
                <TableHead>{t('requestStatus')}</TableHead>
                <TableHead className="text-right">{t('lineCount')}</TableHead>
                <TableHead className="text-right">{t('totalMoney')}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.requestId}
                  className={row.status === 'draft' ? 'opacity-60' : undefined}
                >
                  <TableCell className="pl-5 font-medium">
                    {row.departmentName ?? row.departmentId ?? '—'}
                    {row.status === 'draft' && (
                      <p className="text-subtle text-[12px]">{t('notSubmitted')}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={row.status} map={demandRequestStatusMap} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.lineCount}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatVnd(row.totalEstimated)}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Link to={`/procurement/demand/requests/${row.requestId}`}>
                        <Button size="xs" variant="outline">
                          {t('view')}
                        </Button>
                      </Link>
                      {isStaff && row.status === 'dept_approved' && (
                        <Button size="xs" onClick={() => void accept(row)}>
                          {t('accept')}
                        </Button>
                      )}
                      {isStaff && ['submitted', 'dept_approved'].includes(row.status) && (
                        <Button size="xs" variant="outline" onClick={() => void returnRequest(row)}>
                          {t('return')}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground text-center text-sm">
                    {t('noRequests', { defaultValue: 'Chưa có phiếu nào' })}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </>
  )
}

export function Component() {
  const { t } = useTranslation('procurement')
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const isStaff = useCan(STAFF)
  const { confirm, dialog } = useConfirm()
  const [skipOpen, setSkipOpen] = useState(false)
  const [skipUnsubmitted, setSkipUnsubmitted] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  const detail = useQuery({
    queryKey: ['demand-period', id],
    queryFn: () => api.getPeriod(id),
    enabled: !!id,
  })
  const requests = useQuery({
    queryKey: ['demand-period-requests', id],
    queryFn: () => api.listPeriodRequests(id),
    enabled: !!id && isStaff,
  })
  const consolidationVisible = ['consolidating', 'approved', 'closed'].includes(
    detail.data?.status ?? '',
  )
  const consolidation = useQuery({
    queryKey: ['demand-consolidation', id],
    queryFn: () => api.listConsolidation(id),
    enabled: !!id && consolidationVisible,
  })
  const editForm = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { name: '', submitDeadline: '', notes: '' },
  })

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['demand-period', id] })
    void qc.invalidateQueries({ queryKey: ['demand-periods'] })
    void qc.invalidateQueries({ queryKey: ['demand-period-requests', id] })
    void qc.invalidateQueries({ queryKey: ['demand-consolidation', id] })
  }
  const run = async (title: string, action: () => Promise<unknown>) => {
    if ((await confirm({ title })) === false) return
    try {
      await action()
      toast.success(t('updated'))
      invalidate()
    } catch (error) {
      toast.error(messageFor(error))
    }
  }
  const consolidate = async () => {
    try {
      await api.consolidatePeriod(id, skipUnsubmitted)
      toast.success(t('updated'))
      setSkipOpen(false)
      setSkipUnsubmitted(false)
      invalidate()
    } catch (error) {
      toast.error(messageFor(error))
    }
  }
  const cancel = async () => {
    const reason = await confirm({
      title: t('cancelConfirm'),
      requireReason: true,
      destructive: true,
    })
    if (reason === false) return
    try {
      await api.cancelPeriod(id, reason)
      toast.success(t('updated'))
      invalidate()
    } catch (error) {
      toast.error(messageFor(error))
    }
  }
  const rebuild = async () => {
    if ((await confirm({ title: t('rebuildConfirm') })) === false) return
    try {
      await api.rebuildConsolidation(id)
      toast.success(t('updated'))
      void qc.invalidateQueries({ queryKey: ['demand-consolidation', id] })
    } catch (error) {
      toast.error(messageFor(error))
    }
  }

  if (detail.isPending) return <DetailSkeleton label={t('loadingPeriod')} />
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data as DemandPeriod
  const requestsPage = requests.data as DemandRequestSummaryPage | undefined
  const requestRows = requestsPage?.items ?? []
  const progress = requestsPage?.progress ?? row.progress
  const consolidationRows = (consolidation.data ?? []) as DemandConsolidation[]
  const editable = isStaff && row.status === 'consolidating'

  return (
    <>
      {dialog}
      <FormDialog
        open={skipOpen}
        onOpenChange={setSkipOpen}
        title={t('consolidateConfirm')}
        form={undefined as never}
        submitLabel={t('consolidateConfirm')}
        onSubmit={() => void consolidate()}
      >
        <div className="space-y-2">
          <label className="flex items-start gap-2 text-[13.5px]">
            <Checkbox
              checked={skipUnsubmitted}
              onCheckedChange={(checked) => setSkipUnsubmitted(checked === true)}
            />
            {t('consolidateSkip')}
          </label>
          <p className="text-subtle text-[12.5px]">{t('consolidateSkipHint')}</p>
        </div>
      </FormDialog>
      <FormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title={t('editPeriod')}
        form={editForm}
        onSubmit={async (values) => {
          try {
            await api.updatePeriod(id, {
              name: values.name,
              submitDeadline: values.submitDeadline || undefined,
              notes: values.notes || undefined,
            })
            toast.success(t('updated'))
            setEditOpen(false)
            invalidate()
          } catch (error) {
            if (error instanceof Error) toast.error(messageFor(error))
          }
        }}
      >
        <TextField control={editForm.control} name="name" label={t('name')} />
        <DateField control={editForm.control} name="submitDeadline" label={t('submitDeadline')} />
        <TextField control={editForm.control} name="notes" label={t('notes')} />
      </FormDialog>
      <DetailLayout
        code={row.code}
        name={row.name}
        eyebrow={t('title')}
        badge={<StatusBadge value={row.status} map={demandPeriodStatusMap} />}
        meta={
          <>
            <PageMeta icon={<Building2 size={14} />}>
              {t('kind')}: {enumLabel(demandPeriodKindLabels, row.kind)}
            </PageMeta>
            <PageMeta icon={<CalendarClock size={14} />}>
              {t('deadline')}: {row.submitDeadline ? formatDate(row.submitDeadline) : '—'}
            </PageMeta>
            {row.approvedBy && <PageMeta icon={<User size={14} />}>{row.approvedBy}</PageMeta>}
          </>
        }
        actions={
          <ActionMenu
            items={[
              isStaff &&
                row.status === 'draft' && {
                  key: 'open',
                  label: t('openPeriod'),
                  variant: 'primary' as const,
                  onClick: () => void run(t('openConfirm'), () => api.openPeriod(id)),
                },
              isStaff &&
                row.status === 'collecting' && {
                  key: 'consolidate',
                  label: t('consolidateConfirm'),
                  variant: 'primary' as const,
                  onClick: () => setSkipOpen(true),
                },
              isStaff &&
                row.status === 'consolidating' && {
                  key: 'approve',
                  label: t('approveConfirm'),
                  variant: 'primary' as const,
                  onClick: () => void run(t('approveConfirm'), () => api.approvePeriod(id)),
                },
              isStaff &&
                row.status === 'approved' && {
                  key: 'close',
                  label: t('closePeriod'),
                  variant: 'primary' as const,
                  onClick: async () => {
                    if ((await confirm({ title: t('closeConfirm') })) === false) return
                    try {
                      const result = await api.closePeriod(id)
                      toast.success(
                        t('periodClosed', {
                          n: result.createdRequests,
                          defaultValue: 'Đã đóng kỳ, tạo {{n}} phiếu yêu cầu từ kho',
                        }),
                      )
                      invalidate()
                    } catch (error) {
                      toast.error(messageFor(error))
                    }
                  },
                },
              isStaff &&
                !['closed', 'cancelled'].includes(row.status) && {
                  key: 'edit',
                  label: t('editPeriod'),
                  onClick: () => {
                    editForm.reset({
                      name: row.name,
                      submitDeadline: row.submitDeadline ?? '',
                      notes: row.notes ?? '',
                    })
                    setEditOpen(true)
                  },
                },
              !['closed', 'cancelled'].includes(row.status) && {
                key: 'cancel',
                label: t('cancel'),
                variant: 'destructive' as const,
                separator: true,
                onClick: () => void cancel(),
              },
            ]}
          />
        }
        information={
          <div className="space-y-4">
            <DataList
              columns={1}
              items={[
                { label: t('kind'), value: enumLabel(demandPeriodKindLabels, row.kind) },
                {
                  label: t('year'),
                  value:
                    row.kind === 'quarterly' && row.quarter
                      ? `Q${row.quarter}/${row.year}`
                      : String(row.year),
                },
                {
                  label: t('buckets'),
                  value:
                    row.buckets === 12
                      ? '12 tháng (T1..T12)'
                      : row.buckets === 4
                        ? '4 quý'
                        : 'Tổng một cột',
                },
                {
                  label: t('deadline'),
                  value: row.submitDeadline ? formatDate(row.submitDeadline) : null,
                },
                { label: t('approvedBy'), value: row.approvedBy },
                { label: t('closedAt'), value: row.closedAt ? formatDateTime(row.closedAt) : null },
                { label: t('notes'), value: row.notes, full: true },
              ]}
            />
            {isStaff && progress && (
              <SectionCard title={t('summary')}>
                <DataList
                  columns={2}
                  items={[
                    {
                      label: t('deptSubmitProgress', {
                        submitted: progress.submitted,
                        departments: progress.total,
                        defaultValue: '{{submitted}}/{{departments}} khoa đã nộp',
                      }),
                      value: `${progress.submitted}/${progress.total}`,
                    },
                    { label: t('deptApproved'), value: String(progress.deptApproved) },
                    { label: t('accepted'), value: String(progress.accepted) },
                    {
                      label: t('totalRequested'),
                      value: row.totalRequested ? formatVnd(row.totalRequested) : '—',
                    },
                    {
                      label: t('totalApproved'),
                      value: row.totalApproved ? formatVnd(row.totalApproved) : '—',
                    },
                  ]}
                />
              </SectionCard>
            )}
            <SectionCard title={t('history')}>
              <AuditTrail entityType="demand_period" entityId={id} />
            </SectionCard>
          </div>
        }
        tabs={
          [
            {
              value: 'requests',
              label: t('requestsOfPeriod'),
              count: requestRows.length,
              content: <RequestsTab rows={requestRows} isStaff={isStaff} />,
            },
            isStaff &&
              consolidationVisible && {
                value: 'consolidation',
                label: t('consolidation'),
                content: (
                  <div className="space-y-4">
                    {isStaff && row.status === 'consolidating' && (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => void rebuild()}>
                          {t('rebuild')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void api.exportDemandSummary(id)}
                        >
                          {t('exportExcel')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void api.downloadDemandProposal(id)}
                        >
                          {t('proposalPdf')}
                        </Button>
                      </div>
                    )}
                    <ConsolidationTab periodId={id} rows={consolidationRows} editable={editable} />
                  </div>
                ),
              },
            isStaff &&
              consolidationVisible && {
                value: 'equipment',
                label: t('newEquipment'),
                content: (
                  <ConsolidationTab
                    periodId={id}
                    rows={consolidationRows}
                    editable={editable}
                    filter="equipment"
                  />
                ),
              },
            isStaff &&
              consolidationVisible && {
                value: 'service',
                label: t('services'),
                content: (
                  <ConsolidationTab
                    periodId={id}
                    rows={consolidationRows}
                    editable={editable}
                    filter="service"
                  />
                ),
              },
          ].filter(Boolean) as { value: string; label: string; content: React.ReactNode }[]
        }
      />
    </>
  )
}
