import { demandPeriodKindLabels, enumLabel } from '@/lib/enum-labels'
import { demandPeriodStatusMap, demandRequestStatusMap } from '@/lib/status-maps'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { Plus, Pencil, Send, Eye } from 'lucide-react'

const isPast = (iso: string) => {
  const value = new Date(iso).getTime()
  return Number.isFinite(value) && value < Date.now()
}

import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar, FilterField } from '@/components/filter-bar'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/form/FormDialog'
import { TextField, SelectField } from '@/components/form/fields'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DateField } from '@/components/form/date-field'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { applyServerErrors, messageFor } from '@/api/errors'
import { formatVnd } from '@/lib/format/money'
import { formatDate, formatDateTime } from '@/lib/format/date'
import { useConfirm } from '@/components/confirm-dialog'
import { ErrorState } from '@/components/page/ErrorState'
import { EmptyState } from '@/components/page/EmptyState'
import * as api from '../api'
import type { DemandPeriod, DemandRequest } from '../paths'
import { useTranslation } from 'react-i18next'

const createPeriodSchema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên kỳ'),
  kind: z.enum(['annual', 'quarterly', 'adhoc']),
  year: z.string().min(4, 'Nhập năm'),
  quarter: z.string().optional(),
  submitDeadline: z.string().optional(),
  notes: z.string().optional(),
})
type CreatePeriodValues = z.infer<typeof createPeriodSchema>

/** Thanh tiến độ "x/y khoa đã nộp". */
function ProgressLine({
  submitted,
  departments,
  label,
}: {
  submitted: number
  departments: number
  label: string
}) {
  const pct = departments > 0 ? Math.min(100, Math.round((submitted / departments) * 100)) : 0
  return (
    <div className="space-y-1">
      <p className="text-subtle text-[12.5px]">{label}</p>
      <div className="bg-surface-2 h-2 w-full overflow-hidden rounded-full">
        <div className="bg-brand-gradient h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function OpenPeriodCard({ row }: { row: DemandPeriod }) {
  const { t } = useTranslation('procurement')
  const qc = useQueryClient()
  const { confirm, dialog } = useConfirm()
  const overdue = !!row.submitDeadline && isPast(row.submitDeadline)
  const invalidate = () => void qc.invalidateQueries({ queryKey: ['demand-periods'] })
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
  const isActive = ['collecting', 'consolidating'].includes(row.status)
  return (
    <>
      {dialog}
      <SectionCard
        className={isActive ? 'ring-primary/30 shadow-primary/10 border-primary/40' : undefined}
        title={
          <Link
            to={`/procurement/demand/periods/${row.id}`}
            className="font-mono text-xs text-primary hover:underline"
          >
            {row.code}
          </Link>
        }
        description={row.name}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge value={row.status} map={demandPeriodStatusMap} />
            {row.status === 'draft' && (
              <Button
                size="sm"
                onClick={() => void run(t('openConfirm'), () => api.openPeriod(row.id))}
              >
                <Send /> {t('openPeriod')}
              </Button>
            )}
            {row.status === 'consolidating' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => void run(t('approveConfirm'), () => api.approvePeriod(row.id))}
              >
                {t('approveConfirm')}
              </Button>
            )}
          </div>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {row.progress && (
            <ProgressLine
              submitted={row.progress.submitted}
              departments={row.progress.total}
              label={t('deptSubmitProgress', {
                submitted: row.progress.submitted,
                departments: row.progress.total,
                defaultValue: '{{submitted}}/{{departments}} khoa đã nộp',
              })}
            />
          )}
          <div>
            <p className="text-subtle text-[12.5px]">{t('deadline')}</p>
            <p className={overdue ? 'text-destructive font-medium' : 'text-[13.5px] font-medium'}>
              {row.submitDeadline ? formatDate(row.submitDeadline) : '—'}
              {overdue && ` · ${t('deadlinePassed', { defaultValue: 'Quá hạn' })}`}
            </p>
          </div>
          <div>
            <p className="text-subtle text-[12.5px]">{t('totalRequested')}</p>
            <p className="text-[13.5px] font-medium tabular-nums">
              {row.totalRequested ? formatVnd(row.totalRequested, { symbol: false }) : '—'}
            </p>
          </div>
          <div>
            <p className="text-subtle text-[12.5px]">{t('totalApproved')}</p>
            <p className="text-[13.5px] font-medium tabular-nums">
              {row.totalApproved ? formatVnd(row.totalApproved, { symbol: false }) : '—'}
            </p>
          </div>
        </div>
      </SectionCard>
    </>
  )
}

function PeriodCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('procurement')
  const qc = useQueryClient()
  const navigate = useNavigate()
  const form = useForm<CreatePeriodValues>({
    resolver: zodResolver(createPeriodSchema),
    defaultValues: {
      name: '',
      kind: 'annual',
      year: String(new Date().getFullYear()),
      quarter: undefined,
      submitDeadline: '',
      notes: '',
    },
  })
  const kind = form.watch('kind')
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('createPeriod')}
      form={form}
      width="md"
      onSubmit={async (values) => {
        try {
          const created = await api.createPeriod({
            name: values.name,
            kind: values.kind,
            year: Number(values.year),
            quarter: values.kind === 'quarterly' ? Number(values.quarter) || undefined : undefined,
            submitDeadline: values.submitDeadline || undefined,
            notes: values.notes || undefined,
          })
          toast.success(t('periodCreated', { defaultValue: 'Đã tạo kỳ' }))
          onOpenChange(false)
          void qc.invalidateQueries({ queryKey: ['demand-periods'] })
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
      <TextField control={form.control} name="year" label="Năm (yyyy)" />
      {kind === 'quarterly' && (
        <SelectField
          control={form.control}
          name="quarter"
          label={t('quarter')}
          options={[1, 2, 3, 4].map((q) => ({ value: String(q), label: `Q${q}` }))}
        />
      )}
      <DateField control={form.control} name="submitDeadline" label={t('submitDeadline')} />
      <TextField control={form.control} name="notes" label={t('notes')} />
    </FormDialog>
  )
}

/** ADM/VT-TBYT: danh sách kỳ + card kỳ đang mở. */
/** Lọc trạng thái kỳ. */
function DemandPeriodStatusSelect({
  value,
  onChange,
}: {
  value?: string
  onChange: (value: string | undefined) => void
}) {
  const { t } = useTranslation('procurement')
  return (
    <Select value={value ?? 'all'} onValueChange={(v) => onChange(v === 'all' ? undefined : v)}>
      <SelectTrigger aria-label={t('status')} className="w-full">
        <SelectValue placeholder={t('status')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t('all')}</SelectItem>
        {Object.entries(demandPeriodStatusMap).map(([value, meta]) => (
          <SelectItem key={value} value={value}>
            {meta.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function DemandAdminView() {
  const { t } = useTranslation('procurement')
  const navigate = useNavigate()
  const table = useServerTable({ filterKeys: ['status', 'year'] })
  const f = table.params.filters
  const list = useQuery({
    queryKey: ['demand-periods', table.params],
    queryFn: () =>
      api.listPeriods({
        page: table.params.page,
        limit: table.params.limit,
        year: f.year ? Number(f.year) : undefined,
        status: f.status,
      }),
    placeholderData: (p) => p,
  })
  const [createOpen, setCreateOpen] = useState(false)

  const columns = useMemo<ColumnDef<DemandPeriod>[]>(
    () => [
      {
        accessorKey: 'code',
        header: t('code'),
        cell: ({ row }) => (
          <Link
            className="text-primary font-mono text-xs hover:underline"
            to={`/procurement/demand/periods/${row.original.id}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      { accessorKey: 'name', header: t('name') },
      {
        accessorKey: 'kind',
        header: t('kind'),
        cell: ({ getValue }) => enumLabel(demandPeriodKindLabels, getValue<string>()),
      },
      {
        accessorKey: 'year',
        header: t('year'),
        cell: ({ row }) =>
          row.original.kind === 'quarterly' && row.original.quarter
            ? `Q${row.original.quarter}/${row.original.year}`
            : String(row.original.year),
      },
      {
        accessorKey: 'status',
        header: t('status'),
        cell: ({ row }) => <StatusBadge value={row.original.status} map={demandPeriodStatusMap} />,
      },
      {
        id: 'submitted',
        header: t('departmentsSubmitted'),
        cell: ({ row }) =>
          row.original.progress
            ? `${row.original.progress.submitted}/${row.original.progress.total}`
            : '—',
        meta: { align: 'right' },
      },
      {
        accessorKey: 'totalApproved',
        header: t('totalApproved'),
        cell: ({ getValue }) => (getValue<string>() ? formatVnd(String(getValue<string>())) : '—'),
        meta: { align: 'right' },
      },
      {
        accessorKey: 'closedAt',
        header: t('closedAt'),
        cell: ({ getValue }) => (getValue<string>() ? formatDateTime(getValue<string>()) : '—'),
      },
    ],
    [t],
  )
  const rows = list.data?.items ?? []
  const activeListRow = rows.find(
    (row) => row.status === 'collecting' || row.status === 'consolidating',
  )
  // Danh sách không kèm progress/totals — tải chi tiết kỳ đang mở để render card.
  const activeDetail = useQuery({
    queryKey: ['demand-period', activeListRow?.id],
    queryFn: () => api.getPeriod(activeListRow!.id),
    enabled: !!activeListRow,
  })
  const activeRow = activeDetail.data ?? activeListRow

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('pageHint', {
          defaultValue: 'Lập phiếu dự trù theo khoa, tổng hợp toàn viện theo kỳ mua sắm.',
        })}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus /> {t('createPeriod')}
          </Button>
        }
      />
      {activeRow && <OpenPeriodCard row={activeRow} />}
      <DataTable
        tableId="demand-periods"
        columns={columns}
        data={list.data?.items}
        total={list.data?.total ?? 0}
        params={table.params}
        onPageChange={table.setPage}
        onLimitChange={table.setLimit}
        isLoading={list.isPending}
        error={list.error}
        onRetry={() => void list.refetch()}
        getRowId={(row) => row.id}
        onRowClick={(row) => navigate(`/procurement/demand/periods/${row.id}`)}
        toolbarLeft={
          <FilterBar>
            <FilterField label={t('searchPeriod')}>
              <Input
                aria-label={t('searchPeriod')}
                value={table.inputQ}
                onChange={(e) => table.setQ(e.target.value)}
                placeholder={t('searchPeriod')}
              />
            </FilterField>
            <FilterField label={t('status')}>
              <DemandPeriodStatusSelect
                value={f.status}
                onChange={(value) => table.setFilter('status', value)}
              />
            </FilterField>
            <FilterField label={t('year')}>
              <Input
                aria-label={t('year')}
                inputMode="numeric"
                value={f.year ?? ''}
                onChange={(e) => table.setFilter('year', e.target.value.replace(/\D/, ''))}
                placeholder="2026"
              />
            </FilterField>
          </FilterBar>
        }
      />
      <PeriodCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  )
}

/** DEPT_USER/DEPT_HEAD: phiếu khoa mình theo /v1/demand/my. */
function MyRequestCard({ request }: { request: DemandRequest }) {
  const { t } = useTranslation('procurement')
  const canEdit = request.status === 'draft' || request.status === 'returned'
  const label = canEdit ? t('open') : t('view')
  return (
    <SectionCard
      title={
        <span className="flex items-center gap-2">
          {request.period ? request.period.name : request.periodId}
        </span>
      }
      description={request.period ? request.period.code : undefined}
      actions={
        <Link to={`/procurement/demand/requests/${request.id}`}>
          <Button size="sm" variant={canEdit ? 'default' : 'outline'}>
            {canEdit ? <Pencil /> : <Eye />} {label}
          </Button>
        </Link>
      }
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
        <StatusBadge value={request.status} map={demandRequestStatusMap} />
        <span className="text-subtle">
          {t('lineCount')}: <strong className="tabular-nums">{request.lines?.length ?? 0}</strong>
        </span>
        <span className="text-subtle">
          {t('totalMoney')}:{' '}
          <strong className="tabular-nums">
            {request.totalEstimated ? formatVnd(request.totalEstimated, { symbol: false }) : '—'}
          </strong>
        </span>
      </div>
    </SectionCard>
  )
}

function DemandMyView() {
  const { t } = useTranslation('procurement')
  const my = useQuery({ queryKey: ['demand-my'], queryFn: () => api.getMyDemand() })
  // T2: GET /my trả trang phẳng phiếu khoa mình (không còn {toSubmit,...} như spec §6)
  const items = useMemo(
    () =>
      [...(my.data?.items ?? [])].sort((a, b) => {
        const order = ['draft', 'returned', 'submitted', 'dept_approved', 'accepted']
        return order.indexOf(a.status) - order.indexOf(b.status)
      }),
    [my.data],
  )
  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('myPageHint', {
          defaultValue: 'Các phiếu dự trù của khoa bạn trong các kỳ đang mở.',
        })}
      />
      {my.isPending && (
        <p className="text-muted-foreground text-sm">
          {t('loading', { defaultValue: 'Đang tải…' })}
        </p>
      )}
      {my.error && <ErrorState error={my.error} onRetry={() => void my.refetch()} />}
      {items.length === 0 && !my.isPending && (
        <EmptyState
          title={t('noMyRequests', { defaultValue: 'Chưa có phiếu dự trù nào của khoa bạn' })}
          description={t('noMyRequestsHint', {
            defaultValue: 'Khi quản trị viện mở kỳ dự trù, phiếu của khoa sẽ xuất hiện tại đây.',
          })}
        />
      )}
      <div className="grid gap-4 xl:grid-cols-2">
        {items.map((request) => (
          <MyRequestCard key={request.id} request={request} />
        ))}
      </div>
    </>
  )
}

export function Component() {
  const isStaff = useCan(STAFF)
  return isStaff ? <DemandAdminView /> : <DemandMyView />
}
