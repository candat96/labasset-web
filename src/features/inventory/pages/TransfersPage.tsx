import { shortId, useUserLookup, useWarehouseNames } from '@/api/lookups'
import { formatDate } from '@/lib/format/date'
import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { FilterPanel, FilterPanelField } from '@/components/page/FilterPanel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormDrawer } from '@/components/form/FormDrawer'
import { QtyField } from '@/components/form/qty-field'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AsyncSelect } from '@/components/form/async-select'
import { DataTable, useServerTable } from '@/components/data-table'
import { StatusBadge } from '@/components/status-badge'
import { stockDocStatusMap } from '@/lib/status-maps'
import { useCan } from '@/app/guards/useCan'
import { ADM, STAFF } from '@/routes/roles'
import { applyServerErrors, messageFor } from '@/api/errors'
import { catalogOptions } from '@/api/references'
import { decimalString } from '@/lib/validation/decimal'
import { cancelTransfer, createTransfer, listIssues, listLots } from '../api'
import type { Issue } from '../types'
import { useTranslation } from 'react-i18next'
import i18n from '@/lib/i18n'

const schema = z
  .object({
    fromWarehouseId: z.string().min(1, i18n.t('common:form.required')),
    toWarehouseId: z.string().min(1, i18n.t('common:form.required')),
    items: z
      .array(
        z.object({
          lotId: z.string().min(1, i18n.t('common:form.required')),
          quantity: decimalString({ maxScale: 3, min: '0.001' }),
        }),
      )
      .min(1),
  })
  .refine((value) => value.fromWarehouseId !== value.toWarehouseId, {
    path: ['toWarehouseId'],
    message: i18n.t('inventory:warehouseSame'),
  })
type FormValues = z.infer<typeof schema>
type TransferRow = Issue & { transferId?: string; transferCode?: string; toWarehouseId?: string }

export function Component() {
  const { t } = useTranslation('inventory')
  const canWrite = useCan(STAFF)
  const isAdm = useCan(ADM)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const table = useServerTable({ filterKeys: ['warehouseId'] })
  const f = table.params.filters
  const list = useQuery({
    queryKey: [
      'stock',
      'transfers',
      table.params.page,
      table.params.limit,
      table.params.q,
      f.warehouseId,
    ],
    queryFn: () =>
      listIssues({
        type: 'transfer_out',
        page: table.params.page,
        limit: table.params.limit,
        q: table.params.q || undefined,
        warehouseId: f.warehouseId,
      }),
    placeholderData: (previous) => previous,
  })
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fromWarehouseId: '',
      toWarehouseId: '',
      items: [{ lotId: '', quantity: '1' }],
    },
  })
  const items = useFieldArray({ control: form.control, name: 'items' })
  const invalidate = useCallback(() => {
    for (const queryKey of [
      ['stock', 'transfers'],
      ['stock', 'issues'],
      ['stock', 'receipts'],
      ['stock', 'balances'],
      ['stock', 'lots'],
    ]) {
      void qc.invalidateQueries({ queryKey })
    }
  }, [qc])
  const warehouseNames = useWarehouseNames()
  const userNames = useUserLookup(isAdm)
  const columns = useMemo<ColumnDef<TransferRow>[]>(
    () => [
      {
        accessorKey: 'code',
        header: t('code'),
        meta: { label: t('code'), className: 'sticky left-0 z-[1] bg-card' },
        cell: ({ row }) => (
          <Link className="text-primary font-mono text-xs" to={`/stock/issues/${row.original.id}`}>
            {row.original.transferCode ?? row.original.code}
          </Link>
        ),
      },
      {
        accessorKey: 'warehouseId',
        header: t('fromWarehouse'),
        cell: ({ row }) =>
          warehouseNames.get(row.original.warehouseId) ?? shortId(row.original.warehouseId),
      },
      {
        accessorKey: 'toWarehouseId',
        header: t('toWarehouse'),
        cell: ({ row }) => {
          const r = row.original as TransferRow & { toDepartmentId?: string | null }
          const id = r.toWarehouseId ?? null
          return id ? (warehouseNames.get(id) ?? shortId(id)) : '—'
        },
      },
      {
        accessorKey: 'issuedAt',
        header: t('date', { defaultValue: 'Ngày' }),
        cell: ({ row }) =>
          formatDate(row.original.issuedAt ?? row.original.postedAt ?? undefined) || '—',
      },
      {
        id: 'createdBy',
        header: t('createdBy', { defaultValue: 'Người tạo' }),
        cell: ({ row }) => {
          const r = row.original as TransferRow & {
            createdBy?: string | null
            issuedBy?: string | null
            createdByName?: string | null
          }
          const uid = r.createdBy ?? r.issuedBy
          return r.createdByName ?? (uid ? (userNames.get(uid) ?? shortId(uid)) : '—')
        },
      },
      {
        id: 'lines',
        header: t('lineCount', { defaultValue: 'Số dòng' }),
        cell: ({ row }) => {
          const r = row.original as { items?: unknown[]; itemCount?: number }
          const n = r.itemCount ?? r.items?.length
          return n == null ? '—' : <span className="tabular-nums">{n}</span>
        },
      },
      {
        accessorKey: 'status',
        header: t('status'),
        cell: ({ row }) => <StatusBadge value={row.original.status} map={stockDocStatusMap} />,
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        cell: ({ row }) =>
          isAdm && row.original.transferId && row.original.status === 'posted' ? (
            <Button
              size="sm"
              variant="outline"
              onClick={async (event) => {
                event.stopPropagation()
                try {
                  await cancelTransfer(row.original.transferId!)
                  toast.success(t('transferCancelled'))
                  invalidate()
                } catch (error) {
                  toast.error(messageFor(error))
                }
              }}
            >
              {t('cancelPair')}
            </Button>
          ) : null,
      },
    ],
    [invalidate, isAdm, t, warehouseNames, userNames],
  )
  const activeFilters = f.warehouseId
    ? [
        {
          key: 'warehouseId',
          label: warehouseNames.get(f.warehouseId) ?? shortId(f.warehouseId),
          onRemove: () => table.setFilter('warehouseId', undefined),
        },
      ]
    : []
  return (
    <>
      <PageHeader
        title={t('transferTitle')}
        description={t('stockTransfersHint', {
          defaultValue: 'Chuyển vật tư giữa các kho theo lô.',
        })}
        actions={canWrite && <Button onClick={() => setOpen(true)}>{t('createTransfer')}</Button>}
      />
      <FilterPanel
        storageKey="stock-transfers"
        onReset={table.reset}
        activeFilters={activeFilters}
        fields={
          <FilterPanelField label={t('fromWarehouse')}>
            <AsyncSelect
              label={t('fromWarehouse')}
              queryKey="warehouses-filter"
              loadOptions={(q) => catalogOptions('warehouses', q)}
              value={f.warehouseId ?? null}
              onChange={(value) =>
                table.setFilter('warehouseId', typeof value === 'string' ? value : undefined)
              }
              clearable
              showLabel={false}
            />
          </FilterPanelField>
        }
        toolbar={
          <Input
            aria-label={t('searchTransfer', { defaultValue: 'Tìm phiếu chuyển' })}
            placeholder={t('searchTransfer', { defaultValue: 'Tìm phiếu chuyển' })}
            value={table.inputQ}
            onChange={(e) => table.setQ(e.target.value)}
            className="h-9 w-56"
          />
        }
      >
        <DataTable
          tableId="stock-transfers"
          columns={columns}
          data={(list.data?.items ?? []) as TransferRow[]}
          total={list.data?.total ?? 0}
          params={table.params}
          onPageChange={table.setPage}
          onLimitChange={table.setLimit}
          isLoading={list.isPending}
          error={list.error}
          onRetry={() => void list.refetch()}
          getRowId={(row) => row.id}
          onRowClick={(row) => navigate(`/stock/issues/${row.id}`)}
        />
      </FilterPanel>
      <FormDrawer
        open={open}
        onOpenChange={setOpen}
        title={t('createTransfer')}
        form={form}
        submitting={form.formState.isSubmitting}
        onSubmit={async (values) => {
          try {
            await createTransfer(values)
            toast.success(t('transferCreated'))
            setOpen(false)
            form.reset({
              fromWarehouseId: '',
              toWarehouseId: '',
              items: [{ lotId: '', quantity: '1' }],
            })
            invalidate()
          } catch (error) {
            if (!applyServerErrors(form, error)) toast.error(messageFor(error))
          }
        }}
      >
        <SectionCard title={t('info', { defaultValue: 'Thông tin phiếu' })}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FormField
              control={form.control}
              name="fromWarehouseId"
              render={({ field }) => (
                <FormItem>
                  <AsyncSelect
                    label={t('fromWarehouse')}
                    queryKey="warehouses-from"
                    loadOptions={(q) => catalogOptions('warehouses', q)}
                    value={field.value || null}
                    onChange={(value) => {
                      field.onChange(typeof value === 'string' ? value : '')
                      form.setValue('items', [{ lotId: '', quantity: '1' }])
                    }}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="toWarehouseId"
              render={({ field }) => (
                <FormItem>
                  <AsyncSelect
                    label={t('toWarehouse')}
                    queryKey="warehouses-to"
                    loadOptions={(q) => catalogOptions('warehouses', q)}
                    value={field.value || null}
                    onChange={(value) => field.onChange(typeof value === 'string' ? value : '')}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </SectionCard>
        <SectionCard
          title={t('items', { defaultValue: 'Dòng vật tư' })}
          actions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => items.append({ lotId: '', quantity: '1' })}
            >
              {t('addLine')}
            </Button>
          }
          bodyClassName="space-y-3"
        >
          {items.fields.map((item, index) => (
            <div key={item.id} className="border-divider grid gap-3 rounded-xl border p-4">
              <FormField
                control={form.control}
                name={`items.${index}.lotId`}
                render={({ field }) => (
                  <FormItem>
                    <AsyncSelect
                      label={t('lot')}
                      queryKey={`transfer-lots-${form.watch('fromWarehouseId')}`}
                      loadOptions={async (q) => {
                        const data = await listLots({
                          warehouseId: form.getValues('fromWarehouseId'),
                          q,
                          page: 1,
                          limit: 50,
                        })
                        return data.items.map((lot) => ({
                          id: lot.id,
                          code: lot.lotNo,
                          name: `${lot.supplyId.slice(0, 8)} · ${t('available')}: ${lot.available}`,
                        }))
                      }}
                      value={field.value || null}
                      onChange={(value) => field.onChange(typeof value === 'string' ? value : '')}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <QtyField
                control={form.control}
                name={`items.${index}.quantity`}
                label={t('quantity')}
              />
              {items.fields.length > 1 && (
                <div className="flex justify-end">
                  <Button type="button" variant="ghost" onClick={() => items.remove(index)}>
                    {t('removeLine')}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </SectionCard>
      </FormDrawer>
    </>
  )
}
