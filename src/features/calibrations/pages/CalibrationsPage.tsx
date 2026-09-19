import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/status-badge'
import { calibrationResultMap, calibrationStatusMap, calibrationTypeMap } from '@/lib/status-maps'
import { formatDate, formatDateTime } from '@/lib/format/date'
import { formatVnd } from '@/lib/format/money'
import { FormDialog } from '@/components/form/FormDialog'
import { TextField, SelectField, NumberField } from '@/components/form/fields'
import { DateField } from '@/components/form/date-field'
import { DatetimeField } from '@/components/form/datetime-field'
import { MoneyField } from '@/components/form/money-field'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AsyncSelect } from '@/components/form/async-select'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { applyServerErrors, messageFor } from '@/api/errors'
import { catalogOptions, equipmentOptions } from '@/api/references'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { createCalibration, listCalibrations } from '../api'
import type { components } from '@/api/schema'

type Row = components['schemas']['CalibrationResponseDto']
const schema = z.object({
  equipmentId: z.string().min(1, 'Bắt buộc'),
  type: z.enum(['inspection', 'calibration']),
  mode: z.enum(['schedule', 'result']),
  scheduledAt: z.string(),
  performedAt: z.string(),
  result: z.enum(['pass', 'fail', 'conditional']),
  certificateNo: z.string(),
  cost: z.string(),
  cycleMonths: z.union([z.literal(''), z.number().int().min(1)]),
})
type Form = z.infer<typeof schema>

export function Component() {
  const canWrite = useCan(STAFF)
  const navigate = useNavigate()
  const table = useServerTable({
    filterKeys: [
      'equipmentId',
      'departmentId',
      'type',
      'status',
      'result',
      'dueBefore',
      'from',
      'to',
    ],
  })
  const f = table.params.filters
  const params = {
    page: table.params.page,
    limit: table.params.limit,
    equipmentId: f.equipmentId,
    departmentId: f.departmentId,
    type: f.type,
    status: f.status,
    result: f.result,
    dueBefore: f.dueBefore,
    from: f.from,
    to: f.to,
  }
  const list = useQuery({
    queryKey: ['calibrations', params],
    queryFn: () => listCalibrations(params),
    placeholderData: (p) => p,
  })
  const [open, setOpen] = useState(false)
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: {
      equipmentId: '',
      type: 'inspection',
      mode: 'schedule',
      scheduledAt: new Date().toISOString(),
      performedAt: new Date().toISOString(),
      result: 'pass',
      certificateNo: '',
      cost: '',
      cycleMonths: '',
    },
  })
  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã',
        cell: ({ row }) => (
          <Link
            className="text-primary font-mono text-xs hover:underline"
            to={`/calibrations/${row.original.id}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Loại',
        cell: ({ row }) => <StatusBadge value={row.original.type} map={calibrationTypeMap} />,
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => <StatusBadge value={row.original.status} map={calibrationStatusMap} />,
      },
      {
        accessorKey: 'scheduledAt',
        header: 'Lịch',
        cell: ({ getValue }) => formatDateTime(getValue<string | null>()),
      },
      {
        accessorKey: 'result',
        header: 'Kết quả',
        cell: ({ row }) =>
          row.original.result ? (
            <StatusBadge value={row.original.result} map={calibrationResultMap} />
          ) : (
            '—'
          ),
      },
      {
        accessorKey: 'nextDueAt',
        header: 'Hạn kế tiếp',
        cell: ({ row }) => (
          <span
            className={
              row.original.nextDueAt && row.original.nextDueAt < new Date().toISOString()
                ? 'text-destructive'
                : undefined
            }
          >
            {formatDate(row.original.nextDueAt) || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'cost',
        header: 'Chi phí',
        cell: ({ getValue }) => formatVnd(getValue<string>()),
      },
    ],
    [],
  )
  const plus30 = new Date()
  plus30.setUTCDate(plus30.getUTCDate() + 30)
  return (
    <>
      <PageHeader
        title="Kiểm định – hiệu chuẩn"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => table.setFilter('dueBefore', plus30.toISOString())}
            >
              Đến hạn 30 ngày
            </Button>
            {canWrite && <Button onClick={() => setOpen(true)}>Lên lịch / Ghi kết quả</Button>}
          </div>
        }
      />
      <DataTable
        tableId="calibrations"
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
        onRowClick={(row) => navigate(`/calibrations/${row.id}`)}
        toolbarLeft={
          <Input
            aria-label="Tìm"
            value={table.inputQ}
            onChange={(e) => table.setQ(e.target.value)}
          />
        }
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Kiểm định"
        width="lg"
        form={form}
        onSubmit={async (values) => {
          try {
            const created = await createCalibration({
              equipmentId: values.equipmentId,
              type: values.type,
              scheduledAt: values.mode === 'schedule' ? values.scheduledAt : undefined,
              performedAt: values.mode === 'result' ? values.performedAt : undefined,
              result: values.mode === 'result' ? values.result : undefined,
              certificateNo: values.certificateNo || undefined,
              cost: values.cost || undefined,
              cycleMonths: values.cycleMonths === '' ? undefined : values.cycleMonths,
            } as never)
            toast.success('Đã lưu phiếu kiểm định')
            setOpen(false)
            navigate(`/calibrations/${created.id}`)
          } catch (error) {
            if (!applyServerErrors(form, error)) toast.error(messageFor(error))
          }
        }}
      >
        <FormField
          control={form.control}
          name="equipmentId"
          render={({ field }) => (
            <FormItem>
              <AsyncSelect
                label="Máy"
                queryKey="equipment"
                loadOptions={equipmentOptions}
                value={field.value || null}
                onChange={(v) => field.onChange(typeof v === 'string' ? v : '')}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <SelectField
          control={form.control}
          name="type"
          label="Loại"
          options={[
            { value: 'inspection', label: 'Kiểm định' },
            { value: 'calibration', label: 'Hiệu chuẩn' },
          ]}
        />
        <SelectField
          control={form.control}
          name="mode"
          label="Hình thức"
          options={[
            { value: 'schedule', label: 'Lên lịch' },
            { value: 'result', label: 'Ghi kết quả ngay' },
          ]}
        />
        {form.watch('mode') === 'schedule' ? (
          <DatetimeField control={form.control} name="scheduledAt" label="Lịch" />
        ) : (
          <>
            <DatetimeField control={form.control} name="performedAt" label="Thực hiện" />
            <SelectField
              control={form.control}
              name="result"
              label="Kết quả"
              options={[
                { value: 'pass', label: 'Đạt' },
                { value: 'fail', label: 'Không đạt' },
                { value: 'conditional', label: 'Có điều kiện' },
              ]}
            />
            <TextField control={form.control} name="certificateNo" label="Số chứng nhận" />
            <MoneyField control={form.control} name="cost" label="Chi phí" />
          </>
        )}
        <NumberField control={form.control} name="cycleMonths" label="Chu kỳ (tháng)" min={1} />
        <FormField
          control={form.control}
          name="equipmentId"
          render={() => (
            <FormItem>
              <AsyncSelect
                label="Đơn vị kiểm định"
                queryKey="calibration-agencies"
                loadOptions={(q) => catalogOptions('calibration-agencies', q)}
                value={null}
                onChange={() => undefined}
                clearable
              />
            </FormItem>
          )}
        />
        <DateField control={form.control} name="scheduledAt" label="Gợi ý hạn kế tiếp" />
      </FormDialog>
    </>
  )
}
