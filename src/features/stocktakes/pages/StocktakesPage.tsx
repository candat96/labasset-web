import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar } from '@/components/filter-bar'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/status-badge'
import { stocktakeStatusMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { FormDialog } from '@/components/form/FormDialog'
import { TextField, SelectField } from '@/components/form/fields'
import { DateField } from '@/components/form/date-field'
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
  const form = useForm({
    defaultValues: {
      name: '',
      type: 'supply' as const,
      scopeType: 'all' as const,
      notes: '',
      plannedAt: '',
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
            to={`/stocktakes/${row.original.id}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      { accessorKey: 'name', header: t('name') },
      { accessorKey: 'type', header: t('type') },
      { accessorKey: 'scopeType', header: t('scope') },
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
    ],
    [t],
  )
  return (
    <>
      <PageHeader
        title={t('title')}
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
            <Input
              aria-label={t('search')}
              value={table.inputQ}
              onChange={(e) => table.setQ(e.target.value)}
              placeholder={t('search')}
            />
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
            { value: 'department', label: 'Khoa' },
            { value: 'warehouse', label: 'Kho' },
          ]}
        />
        <DateField control={form.control} name="plannedAt" label={t('plannedAt')} />
      </FormDialog>
    </>
  )
}
