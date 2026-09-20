import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { apiBody } from '@/api/client'
import { catalogOptions, equipmentOptions } from '@/api/references'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { dayRangeToIso } from '@/lib/format/date-range'
import { decimalString } from '@/lib/validation/decimal'
import { createCalibration, listCalibrations } from '../api'
import type { components } from '@/api/schema'
import { useTranslation } from 'react-i18next'
import i18n from '@/lib/i18n'

type Row = components['schemas']['CalibrationResponseDto']
const schema = z.object({
  equipmentId: z.string().min(1, i18n.t('common:form.required')),
  type: z.enum(['inspection', 'calibration']),
  mode: z.enum(['schedule', 'result']),
  scheduledAt: z.string(),
  performedAt: z.string(),
  result: z.enum(['pass', 'fail', 'conditional']),
  certificateNo: z.string(),
  cost: decimalString({ maxScale: 0, min: '0' }),
  cycleMonths: z.union([z.literal(''), z.number().int().min(1)]),
  agencyId: z.string().nullable(),
  nextDueAt: z.string(),
})
type Form = z.infer<typeof schema>

export function Component() {
  const { t } = useTranslation('calibrations')

  const canWrite = useCan(STAFF)
  const navigate = useNavigate()
  const qc = useQueryClient()
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
    ...dayRangeToIso(f.from, f.to),
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
      agencyId: null,
      nextDueAt: '',
    },
  })
  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        accessorKey: 'code',
        header: t('code'),
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
        header: t('type'),
        cell: ({ row }) => <StatusBadge value={row.original.type} map={calibrationTypeMap} />,
      },
      {
        accessorKey: 'status',
        header: t('status'),
        cell: ({ row }) => <StatusBadge value={row.original.status} map={calibrationStatusMap} />,
      },
      {
        accessorKey: 'scheduledAt',
        header: t('schedule'),
        cell: ({ getValue }) => formatDateTime(getValue<string | null>()),
      },
      {
        accessorKey: 'result',
        header: t('result'),
        cell: ({ row }) =>
          row.original.result ? (
            <StatusBadge value={row.original.result} map={calibrationResultMap} />
          ) : (
            '—'
          ),
      },
      {
        accessorKey: 'nextDueAt',
        header: t('nextDue'),
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
        header: t('cost'),
        cell: ({ getValue }) => formatVnd(getValue<string>()),
      },
    ],
    [t],
  )
  const plus30 = new Date()
  plus30.setUTCDate(plus30.getUTCDate() + 30)
  return (
    <>
      <PageHeader
        title={t('title')}
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => table.setFilter('dueBefore', plus30.toISOString())}
            >
              {t('dueIn30')}
            </Button>
            {canWrite && <Button onClick={() => setOpen(true)}>{t('create')}</Button>}
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
            aria-label={t('search')}
            value={table.inputQ}
            onChange={(e) => table.setQ(e.target.value)}
          />
        }
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t('typeInspection')}
        width="lg"
        form={form}
        onSubmit={async (values) => {
          try {
            const created = await createCalibration(
              apiBody({
                equipmentId: values.equipmentId,
                type: values.type,
                scheduledAt: values.mode === 'schedule' ? values.scheduledAt : undefined,
                performedAt: values.mode === 'result' ? values.performedAt : undefined,
                result: values.mode === 'result' ? values.result : undefined,
                certificateNo: values.certificateNo || undefined,
                cost: values.cost || undefined,
                cycleMonths: values.cycleMonths === '' ? undefined : values.cycleMonths,
                agencyId: values.agencyId ?? undefined,
                nextDueAt: values.nextDueAt || undefined,
              }),
            )
            toast.success(t('saved'))
            setOpen(false)
            void qc.invalidateQueries({ queryKey: ['calibrations'] })
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
                label={t('equipment')}
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
          label={t('type')}
          options={[
            { value: 'inspection', label: t('typeInspection') },
            { value: 'calibration', label: t('typeCalibration') },
          ]}
        />
        <SelectField
          control={form.control}
          name="mode"
          label={t('mode')}
          options={[
            { value: 'schedule', label: t('modeSchedule') },
            { value: 'result', label: t('modeResult') },
          ]}
        />
        {form.watch('mode') === 'schedule' ? (
          <DatetimeField control={form.control} name="scheduledAt" label={t('schedule')} />
        ) : (
          <>
            <DatetimeField control={form.control} name="performedAt" label={t('performedAt')} />
            <SelectField
              control={form.control}
              name="result"
              label={t('result')}
              options={[
                { value: 'pass', label: t('pass') },
                { value: 'fail', label: t('fail') },
                { value: 'conditional', label: t('conditional') },
              ]}
            />
            <TextField control={form.control} name="certificateNo" label={t('certificateNo')} />
            <MoneyField control={form.control} name="cost" label={t('cost')} />
          </>
        )}
        <NumberField control={form.control} name="cycleMonths" label={t('cycleMonths')} min={1} />
        <FormField
          control={form.control}
          name="agencyId"
          render={({ field }) => (
            <FormItem>
              <AsyncSelect
                label={t('agency')}
                queryKey="calibration-agencies"
                loadOptions={(q) => catalogOptions('calibration-agencies', q)}
                value={field.value}
                onChange={field.onChange}
                clearable
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <DateField control={form.control} name="nextDueAt" label={t('nextDueHint')} />
      </FormDialog>
    </>
  )
}
