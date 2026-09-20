import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/form/FormDialog'
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
  const table = useServerTable({ filterKeys: [] })
  const list = useQuery({
    queryKey: ['stock', 'transfers', table.params.page, table.params.limit],
    queryFn: () =>
      listIssues({ type: 'transfer_out', page: table.params.page, limit: table.params.limit }),
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
  const columns = useMemo<ColumnDef<TransferRow>[]>(
    () => [
      {
        accessorKey: 'code',
        header: t('code'),
        cell: ({ row }) => (
          <Link className="text-primary hover:underline" to={`/stock/issues/${row.original.id}`}>
            {row.original.transferCode ?? row.original.code}
          </Link>
        ),
      },
      { accessorKey: 'warehouseId', header: t('fromWarehouse') },
      { accessorKey: 'toWarehouseId', header: t('toWarehouse') },
      {
        accessorKey: 'status',
        header: t('status'),
        cell: ({ row }) => <StatusBadge value={row.original.status} map={stockDocStatusMap} />,
      },
      {
        id: 'actions',
        header: '',
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
    [invalidate, isAdm, t],
  )
  return (
    <>
      <PageHeader
        title={t('transferTitle')}
        actions={canWrite && <Button onClick={() => setOpen(true)}>{t('createTransfer')}</Button>}
      />
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
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t('createTransfer')}
        form={form}
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
        {items.fields.map((item, index) => (
          <div key={item.id} className="space-y-2 rounded border p-3">
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
              <Button type="button" variant="ghost" onClick={() => items.remove(index)}>
                {t('removeLine')}
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => items.append({ lotId: '', quantity: '1' })}
        >
          {t('addLine')}
        </Button>
      </FormDialog>
    </>
  )
}
