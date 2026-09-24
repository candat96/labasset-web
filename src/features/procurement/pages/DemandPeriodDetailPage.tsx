import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Big from 'big.js'
import { toast } from 'sonner'
import { Building2, CalendarClock, Copy, User } from 'lucide-react'
import { DetailLayout } from '@/components/detail-layout'
import { PageMeta } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { DataList } from '@/components/page/DataList'
import { DetailSkeleton } from '@/components/page/DetailSkeleton'
import { ErrorState } from '@/components/page/ErrorState'
import { ActionMenu } from '@/components/page/ActionMenu'
import { StatusBadge } from '@/components/status-badge'
import { AuditTrail } from '@/components/audit-trail'
import { Badge } from '@/components/ui/badge'
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
import { TextField, SelectField } from '@/components/form/fields'
import { DateField } from '@/components/form/date-field'
import { useConfirm } from '@/components/confirm-dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { applyServerErrors, messageFor, isApiError } from '@/api/errors'
import { useDepartmentLookup } from '@/api/lookups'
import { formatVnd } from '@/lib/format/money'
import { formatQty } from '@/lib/format/number'
import { formatDate, formatDateTime } from '@/lib/format/date'
import { demandDecisionLabels, demandPeriodKindLabels, enumLabel } from '@/lib/enum-labels'
import { demandPeriodStatusMap, demandRequestStatusMap, demandDecisionMap } from '@/lib/status-maps'
import { useCan } from '@/app/guards/useCan'
import { ADM, STAFF } from '@/routes/roles'
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

const cloneSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên kỳ'),
  kind: z.enum(['annual', 'quarterly', 'adhoc']),
  year: z.string().min(4, 'Nhập năm'),
  quarter: z.string().optional(),
  submitDeadline: z.string().optional(),
})
type CloneValues = z.infer<typeof cloneSchema>

/** Ngày `yyyy-MM-dd` của DatePicker từ ISO; `+months` theo lịch (giữ ngày trong tháng). */
function shiftDate(iso: string, months: number): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  date.setMonth(date.getMonth() + months)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Mặc định "kỳ hiện tại + 1 năm (hoặc + 1 quý)" cho form Sao chép sang kỳ mới. */
function cloneDefaults(row: DemandPeriod): CloneValues {
  const isQuarterly = row.kind === 'quarterly'
  const quarter = row.quarter ?? 1
  const nextQuarter = isQuarterly ? (quarter === 4 ? 1 : quarter + 1) : undefined
  const nextYear = isQuarterly && nextQuarter !== 1 ? row.year : row.year + 1
  const name =
    row.kind === 'annual'
      ? `Dự trù năm ${nextYear}`
      : row.kind === 'quarterly'
        ? `Dự trù Q${nextQuarter}/${nextYear}`
        : `${row.name} (bản sao)`
  return {
    name,
    kind: row.kind,
    year: String(nextYear),
    quarter: nextQuarter == null ? undefined : String(nextQuarter),
    // "kỳ hiện tại +1 năm (hoặc +1 quý)" — chỉ dời khi kỳ nguồn có hạn nộp.
    submitDeadline: row.submitDeadline
      ? shiftDate(row.submitDeadline, isQuarterly ? 3 : 12)
      : undefined,
  }
}

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
  // Decimal(19,4) "12.0000" hiển thị gọn "12" (dữ liệu gửi lên vẫn chuỗi thô)
  const shown = draft ?? (value.includes('.') ? value.replace(/0+$/, '').replace(/\.$/, '') : value)
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

function ConsolidationRow({
  row,
  editable,
  deptNames,
}: {
  row: DemandConsolidation
  editable: boolean
  deptNames: Record<string, string>
}) {
  const deptName = (id: string | null) => (id ? (deptNames[id] ?? id) : '—')
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
          {/* onHand = tồn toàn viện (mọi kho, đã trừ giữ chỗ) — API tính, web chỉ hiển thị */}
          <div className="flex flex-col items-end gap-1">
            <span
              className={
                row.suggestedDecision === 'from_stock' ? 'font-medium tabular-nums' : 'tabular-nums'
              }
            >
              {row.onHand == null || row.onHand === '' ? '—' : formatQty(row.onHand)}
            </span>
            {row.suggestedDecision === 'from_stock' &&
              (editable ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => void patch({ decision: 'from_stock' })}
                    >
                      {t('suggestFromStock', { defaultValue: 'Nên lấy từ kho' })}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('suggestFromStockHint', {
                      defaultValue: 'Tồn kho đủ đáp ứng nhu cầu cả kỳ — bấm để chọn "Lấy từ kho"',
                    })}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Badge variant="info">
                  {t('suggestFromStock', { defaultValue: 'Nên lấy từ kho' })}
                </Badge>
              ))}
          </div>
        </TableCell>
        <TableCell className="text-right">
          {/* Đơn giá kế hoạch do API tính (trung vị) — PATCH /consolidation không nhận sửa */}
          <span className="tabular-nums" title={row.unitPricePlan ?? ''}>
            {formatVnd(row.unitPricePlan ?? '')}
          </span>
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
          <TableCell colSpan={10}>
            <div className="space-y-1 py-1">
              {row.breakdown.map((item) => (
                <div key={item.lineId} className="flex items-center gap-4 text-[13px]">
                  <span className="min-w-40 font-medium">{deptName(item.departmentId)}</span>
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
                        ariaLabel={`${row.itemName} — ${deptName(item.departmentId)} SL duyệt`}
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

/** "Sao chép sang kỳ mới" (spec §5) — chỉ ADM, kỳ `approved|closed`. */
function ClonePeriodDialog({ source, onClose }: { source: DemandPeriod; onClose: () => void }) {
  const { t } = useTranslation('procurement')
  const navigate = useNavigate()
  const qc = useQueryClient()
  const form = useForm<CloneValues>({
    resolver: zodResolver(cloneSchema),
    defaultValues: cloneDefaults(source),
  })
  const kind = form.watch('kind')
  return (
    <FormDialog
      open
      onOpenChange={(value) => !value && onClose()}
      title={t('clonePeriod', { defaultValue: 'Sao chép sang kỳ mới' })}
      description={t('cloneHint', {
        defaultValue:
          'Tạo kỳ mới ở trạng thái Nháp, phiếu khoa nháp được sao chép dòng và tính lại gợi ý số lượng.',
      })}
      form={form}
      width="md"
      submitting={form.formState.isSubmitting}
      submitLabel={t('cloneSubmit', { defaultValue: 'Tạo kỳ mới' })}
      onSubmit={async (values) => {
        try {
          const created = await api.clonePeriod(source.id, {
            name: values.name,
            kind: values.kind,
            year: Number(values.year),
            quarter: values.kind === 'quarterly' ? Number(values.quarter) || undefined : undefined,
            submitDeadline: values.submitDeadline || undefined,
          })
          toast.success(t('periodCloned', { defaultValue: 'Đã sao chép sang kỳ mới' }))
          void qc.invalidateQueries({ queryKey: ['demand-periods'] })
          onClose()
          navigate(`/procurement/demand/periods/${created.id}`)
        } catch (error) {
          if (!applyServerErrors(form, error)) toast.error(messageFor(error))
        }
      }}
    >
      <TextField control={form.control} name="name" label={t('name')} />
      <SelectField
        control={form.control}
        name="kind"
        label={t('kind')}
        options={[
          { value: 'annual', label: t('kindAnnual', { defaultValue: 'Kỳ năm' }) },
          { value: 'quarterly', label: t('kindQuarterly', { defaultValue: 'Kỳ quý' }) },
          { value: 'adhoc', label: t('kindAdhoc', { defaultValue: 'Đột xuất' }) },
        ]}
      />
      <TextField control={form.control} name="year" label="Năm (yyyy)" inputMode="numeric" />
      {kind === 'quarterly' && (
        <SelectField
          control={form.control}
          name="quarter"
          label={t('quarter')}
          options={[1, 2, 3, 4].map((q) => ({ value: String(q), label: `Q${q}` }))}
        />
      )}
      <DateField control={form.control} name="submitDeadline" label={t('submitDeadline')} />
    </FormDialog>
  )
}

/** Bảng tổng hợp dùng chung cho Tổng hợp / Thiết bị mới / Dịch vụ. */
function ConsolidationTab({
  periodId,
  rows,
  editable,
  filter,
  deptNames,
}: {
  periodId: string
  rows: DemandConsolidation[]
  editable: boolean
  filter?: DemandItemType
  deptNames: Record<string, string>
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
            {t('totalPlanRows', {
              defaultValue: 'Gộp theo vật tư × khoa — sửa tổng sẽ phân bổ tỷ lệ theo khoa',
            })}
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
                <TableHead className="text-right">{t('onHand')}</TableHead>
                <TableHead className="text-right">{t('unitPricePlan')}</TableHead>
                <TableHead className="text-right">{t('amountPlan')}</TableHead>
                <TableHead>{t('decision')}</TableHead>
                <TableHead>{t('notes')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((line) => (
                <ConsolidationRow
                  key={line.id}
                  row={line}
                  editable={editable}
                  deptNames={deptNames}
                />
              ))}
              {list.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-muted-foreground text-center text-sm">
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
  const isAdmin = useCan(ADM)
  const { confirm, dialog } = useConfirm()
  const [skipOpen, setSkipOpen] = useState(false)
  const [skipUnsubmitted, setSkipUnsubmitted] = useState(false)
  const [unsubmitted, setUnsubmitted] = useState<string[] | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [cloneOpen, setCloneOpen] = useState(false)
  const allDeptNames = useDepartmentLookup()

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
  const deptNames = useMemo(() => {
    const out: Record<string, string> = {}
    for (const r of requests.data?.items ?? []) {
      if (r.departmentId)
        out[r.departmentId] = r.departmentName ?? r.departmentCode ?? r.departmentId
    }
    return out
  }, [requests.data])
  const consolidationVisible = ['consolidating', 'approved', 'closed'].includes(
    detail.data?.status ?? '',
  )
  const consolidation = useQuery({
    queryKey: ['demand-consolidation', id],
    queryFn: () => api.listConsolidation(id),
    enabled: !!id && consolidationVisible,
  })
  const summary = useQuery({
    queryKey: ['demand-summary', id],
    queryFn: () => api.getPeriodSummary(id),
    enabled: !!id && isStaff && consolidationVisible,
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
  const consolidate = async (skip?: boolean) => {
    try {
      await api.consolidatePeriod(id, skip ?? skipUnsubmitted)
      toast.success(t('updated'))
      setSkipOpen(false)
      setSkipUnsubmitted(false)
      setUnsubmitted(null)
      invalidate()
    } catch (error) {
      // 409 DEMAND_UNSUBMITTED_DEPARTMENTS — chi tiết là id khoa chưa nộp,
      // dialog liệt kê + nút "Bỏ qua khoa chưa nộp" (gửi lại query skipUnsubmitted=true).
      if (isApiError(error) && error.code === 'DEMAND_UNSUBMITTED_DEPARTMENTS') {
        const details = error.details as { departmentIds?: string[] } | undefined
        setSkipOpen(false)
        setUnsubmitted(details?.departmentIds ?? [])
        return
      }
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
  // B2 (review E1a): rebuild dựng lại TOÀN BỘ bảng từ dòng phiếu ⇒ mất SL duyệt /
  // quyết định / ghi chú đã sửa ở cấp tổng hợp — dialog phải nói rõ + nút destructive.
  const rebuild = async () => {
    if (
      (await confirm({
        title: t('rebuildConfirm'),
        description: t('rebuildWarning'),
        destructive: true,
        confirmLabel: t('rebuild'),
      })) === false
    )
      return
    try {
      await api.rebuildConsolidation(id)
      toast.success(t('updated'))
      void qc.invalidateQueries({ queryKey: ['demand-consolidation', id] })
    } catch (error) {
      toast.error(messageFor(error))
    }
  }

  // FormDialog yêu cầu form — dialog tổng hợp chỉ có checkbox, không dùng RHF fields.
  const skipForm = useForm()
  if (detail.isPending) return <DetailSkeleton label={t('loadingPeriod')} />
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data as DemandPeriod
  const requestsPage = requests.data as DemandRequestSummaryPage | undefined
  const requestRows = requestsPage?.items ?? []
  const progress = requestsPage?.progress ?? row.progress
  const consolidationRows = consolidation.data?.items ?? []
  const editable = isStaff && row.status === 'consolidating'

  return (
    <>
      {dialog}
      <FormDialog
        open={skipOpen}
        onOpenChange={setSkipOpen}
        title={t('consolidateConfirm')}
        form={skipForm}
        submitLabel={t('consolidateAction')}
        onSubmit={() => void consolidate(skipUnsubmitted)}
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
        open={unsubmitted != null}
        onOpenChange={(open) => !open && setUnsubmitted(null)}
        title={t('unsubmittedTitle', { defaultValue: 'Còn khoa chưa nộp phiếu' })}
        form={skipForm}
        submitLabel={t('unsubmittedSkip', { defaultValue: 'Bỏ qua khoa chưa nộp' })}
        onSubmit={() => {
          setUnsubmitted(null)
          setSkipUnsubmitted(true)
          void consolidate(true)
        }}
      >
        <div className="space-y-2 text-[13.5px]">
          <p>
            {t('unsubmittedHint', {
              defaultValue:
                'Vẫn còn khoa chưa nộp phiếu. Chọn "Bỏ qua" để tổng hợp ngay — phiếu chưa nộp của các khoa này không góp vào Σ duyệt.',
            })}
          </p>
          <ul className="text-subtle ml-4 list-disc">
            {(unsubmitted ?? []).map((depId) => (
              <li key={depId}>{allDeptNames.get(depId) ?? depId}</li>
            ))}
          </ul>
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
      {cloneOpen && <ClonePeriodDialog source={row} onClose={() => setCloneOpen(false)} />}
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
                  label: t('consolidateAction'),
                  variant: 'primary' as const,
                  onClick: () => setSkipOpen(true),
                },
              isStaff &&
                row.status === 'consolidating' && {
                  key: 'approve',
                  label: t('approveAction'),
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
              // B1: "Sao chép sang kỳ mới" — chỉ ADM, khi kỳ đã chốt (approved|closed).
              isAdmin &&
                ['approved', 'closed'].includes(row.status) && {
                  key: 'clone',
                  label: t('clonePeriod', { defaultValue: 'Sao chép sang kỳ mới' }),
                  icon: <Copy aria-hidden />,
                  onClick: () => setCloneOpen(true),
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
                      value: summary.data?.totalRequested
                        ? formatVnd(summary.data.totalRequested)
                        : '—',
                    },
                    {
                      label: t('totalApproved'),
                      value: summary.data?.totalApproved
                        ? formatVnd(summary.data.totalApproved)
                        : '—',
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
                      </div>
                    )}
                    <ConsolidationTab
                      periodId={id}
                      rows={consolidationRows}
                      editable={editable}
                      deptNames={deptNames}
                    />
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
                    deptNames={deptNames}
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
                    deptNames={deptNames}
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
