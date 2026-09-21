import { enumLabel, stocktakeScopeLabels, stocktakeTypeLabels } from '@/lib/enum-labels'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar, FilterField } from '@/components/filter-bar'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/status-badge'
import { stocktakeStatusMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { FormDialog } from '@/components/form/FormDialog'
import { TextField, SelectField } from '@/components/form/fields'
import { DateField } from '@/components/form/date-field'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AsyncSelect } from '@/components/form/async-select'
import { catalogOptions, departmentOptions } from '@/api/references'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/date-picker'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { applyServerErrors, messageFor } from '@/api/errors'
import { apiBody } from '@/api/client'
import { dayRangeToIso } from '@/lib/format/date-range'
import { createStocktake, listStocktakes } from '../api'
import type { components } from '@/api/schema'
import { useTranslation } from 'react-i18next'

type Row = components['schemas']['StocktakeSessionResponseDto']

export function Component() {
  const { t } = useTranslation('stocktakes')

  const canWrite = useCan(STAFF)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const table = useServerTable({ filterKeys: ['status', 'type', 'from', 'to'] })
  const f = table.params.filters
  const list = useQuery({
    queryKey: ['stocktakes', table.params],
    queryFn: () =>
      listStocktakes({
        page: table.params.page,
        limit: table.params.limit,
        q: table.params.q || undefined,
        status: f.status,
        type: f.type,
        ...dayRangeToIso(f.from, f.to),
      }),
    placeholderData: (p) => p,
  })
  const [open, setOpen] = useState(false)
  const form = useForm<{
    name: string
    type: 'supply' | 'equipment'
    scopeType: 'all' | 'department' | 'warehouse'
    scopeId: string | null
    notes: string
    plannedAt: string
  }>({
    defaultValues: {
      name: '',
      type: 'supply' as const,
      scopeType: 'all' as const,
      scopeId: null as string | null,
      notes: '',
      plannedAt: '',
    },
  })
  const scopeType = form.watch('scopeType')
  const type = form.watch('type')
  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        accessorKey: 'code',
        header: t('code'),
        cell: ({ row }) => (
          <Link
            className="text-primary font-mono text-xs hover:underline"
            to={`/stocktakes/${row.original.id}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      { accessorKey: 'name', header: t('name') },
      {
        accessorKey: 'type',
        header: t('type'),
        cell: ({ row }) => enumLabel(stocktakeTypeLabels, row.original.type),
      },
      {
        accessorKey: 'scopeType',
        header: t('scope'),
        cell: ({ row }) => enumLabel(stocktakeScopeLabels, row.original.scopeType),
      },
      { accessorKey: 'createdBy', header: t('createdBy') },
      {
        accessorKey: 'status',
        header: t('status'),
        cell: ({ row }) => <StatusBadge value={row.original.status} map={stocktakeStatusMap} />,
      },
      {
        accessorKey: 'plannedAt',
        header: t('plannedAt'),
        cell: ({ getValue }) => formatDateTime(getValue<string | null>()),
      },
      {
        accessorKey: 'closedAt',
        header: t('closedAt'),
        cell: ({ getValue }) => formatDateTime(getValue<string | null>()),
      },
    ],
    [t],
  )
  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('listHint', {
          defaultValue: 'Đợt kiểm kê kho: chụp sổ, phân công đếm, đối chiếu chênh lệch.',
        })}
        actions={canWrite && <Button onClick={() => setOpen(true)}>{t('create')}</Button>}
      />
      <DataTable
        tableId="stocktakes"
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
        onRowClick={(row) => navigate(`/stocktakes/${row.id}`)}
        toolbarLeft={
          <FilterBar>
            <FilterField label={t('search')}>
              <Input
                aria-label={t('search')}
                value={table.inputQ}
                onChange={(e) => table.setQ(e.target.value)}
                placeholder={t('search')}
              />
            </FilterField>
            <FilterField label={t('status')}>
              <Select
                value={f.status ?? 'all'}
                onValueChange={(value) =>
                  table.setFilter('status', value === 'all' ? undefined : value)
                }
              >
                <SelectTrigger aria-label={t('status')} className="w-full">
                  <SelectValue placeholder={t('status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  {Object.entries(stocktakeStatusMap).map(([value, meta]) => (
                    <SelectItem key={value} value={value}>
                      {meta.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label={t('type')}>
              <Select
                value={f.type ?? 'all'}
                onValueChange={(value) =>
                  table.setFilter('type', value === 'all' ? undefined : value)
                }
              >
                <SelectTrigger aria-label={t('type')} className="w-full">
                  <SelectValue placeholder={t('type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  <SelectItem value="supply">{t('typeSupply')}</SelectItem>
                  <SelectItem value="equipment">{t('typeEquipment')}</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label={t('from')}>
              <DatePicker
                ariaLabel={t('from')}
                value={f.from}
                onChange={(value) => table.setFilter('from', value)}
              />
            </FilterField>
            <FilterField label={t('to')}>
              <DatePicker
                ariaLabel={t('to')}
                value={f.to}
                onChange={(value) => table.setFilter('to', value)}
              />
            </FilterField>
          </FilterBar>
        }
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t('createTitle')}
        form={form}
        onSubmit={async (values) => {
          try {
            const created = await createStocktake(
              apiBody({
                name: values.name,
                type: values.type,
                scopeType: values.scopeType,
                scopeId: values.scopeType === 'all' ? undefined : (values.scopeId ?? undefined),
                notes: values.notes || undefined,
                plannedAt: values.plannedAt || undefined,
              }),
            )
            toast.success(t('created'))
            setOpen(false)
            void qc.invalidateQueries({ queryKey: ['stocktakes'] })
            navigate(`/stocktakes/${created.id}`)
          } catch (error) {
            if (!applyServerErrors(form, error)) toast.error(messageFor(error))
          }
        }}
      >
        <TextField control={form.control} name="name" label={t('name')} />
        <SelectField
          control={form.control}
          name="type"
          label={t('type')}
          options={[
            { value: 'supply', label: t('typeSupply') },
            { value: 'equipment', label: t('typeEquipment') },
          ]}
        />
        <SelectField
          control={form.control}
          name="scopeType"
          label={t('scope')}
          options={[
            { value: 'all', label: t('scopeAll') },
            ...(type === 'equipment'
              ? [{ value: 'department', label: 'Khoa/Phòng ban' }]
              : [{ value: 'warehouse', label: 'Kho' }]),
          ]}
        />
        {scopeType !== 'all' && (
          <FormField
            control={form.control}
            name="scopeId"
            render={({ field }) => (
              <FormItem>
                <AsyncSelect
                  label={scopeType === 'department' ? 'Khoa/Phòng ban' : 'Kho'}
                  queryKey={`stocktake-scope-${scopeType}`}
                  loadOptions={
                    scopeType === 'department'
                      ? departmentOptions
                      : (q) => catalogOptions('warehouses', q)
                  }
                  value={field.value}
                  onChange={field.onChange}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <DateField control={form.control} name="plannedAt" label={t('plannedAt')} />
      </FormDialog>
    </>
  )
}
