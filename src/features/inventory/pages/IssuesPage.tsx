import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar, FilterField } from '@/components/filter-bar'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/status-badge'
import { stockDocStatusMap } from '@/lib/status-maps'
import { FormDialog } from '@/components/form/FormDialog'
import { SelectField } from '@/components/form/fields'
import { QtyField } from '@/components/form/qty-field'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AsyncSelect } from '@/components/form/async-select'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { applyServerErrors, messageFor } from '@/api/errors'
import { apiBody } from '@/api/client'
import { catalogOptions, departmentOptions, supplyOptions } from '@/api/references'
import { dayRangeToIso } from '@/lib/format/date-range'
import { decimalString } from '@/lib/validation/decimal'
import { listIssues, postIssue, quickIssue } from '../api'
import type { Issue } from '../types'
import { useTranslation } from 'react-i18next'
import i18n from '@/lib/i18n'

const quickSchema = z.object({
  type: z.enum(['to_department']),
  warehouseId: z.string().min(1, i18n.t('common:form.required')),
  toDepartmentId: z.string().min(1, i18n.t('common:form.required')),
  supplyId: z.string().min(1, i18n.t('common:form.required')),
  quantity: decimalString({ maxScale: 3, min: '0.001' }),
})
type QuickForm = z.infer<typeof quickSchema>

export function Component() {
  const { t } = useTranslation('inventory')

  const canWrite = useCan(STAFF)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['stock', 'issues'] })
    void qc.invalidateQueries({ queryKey: ['stock', 'balances'] })
    void qc.invalidateQueries({ queryKey: ['stock', 'lots'] })
  }, [qc])
  const table = useServerTable({ filterKeys: ['status', 'type', 'warehouseId', 'from', 'to'] })
  const f = table.params.filters
  const params = {
    page: table.params.page,
    limit: table.params.limit,
    q: table.params.q || undefined,
    status: f.status,
    type: f.type,
    warehouseId: f.warehouseId,
    ...dayRangeToIso(f.from, f.to),
  }
  const list = useQuery({
    queryKey: ['stock', 'issues', params],
    queryFn: () => listIssues(params),
    placeholderData: (p) => p,
  })
  const [quick, setQuick] = useState(false)
  const form = useForm<QuickForm>({
    resolver: zodResolver(quickSchema),
    defaultValues: {
      type: 'to_department',
      warehouseId: '',
      toDepartmentId: '',
      supplyId: '',
      quantity: '1',
    },
  })
  const columns = useMemo<ColumnDef<Issue>[]>(
    () => [
      {
        accessorKey: 'code',
        header: t('code'),
        cell: ({ row }) => (
          <Link
            className="text-primary font-mono text-xs hover:underline"
            to={`/stock/issues/${row.original.id}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      { accessorKey: 'type', header: t('type') },
      {
        accessorKey: 'status',
        header: t('status'),
        cell: ({ row }) => <StatusBadge value={row.original.status} map={stockDocStatusMap} />,
      },
      {
        id: 'fefo',
        header: 'FEFO',
        cell: ({ row }) => (row.original.fefoWarning ? '⚠' : ''),
      },
      {
        id: 'post',
        header: '',
        cell: ({ row }) =>
          canWrite && row.original.status === 'draft' ? (
            <Button
              size="sm"
              onClick={async (event) => {
                event.stopPropagation()
                try {
                  await postIssue(row.original.id)
                  toast.success(t('posted'))
                  invalidate()
                } catch (error) {
                  toast.error(messageFor(error))
                }
              }}
            >
              {t('post')}
            </Button>
          ) : null,
      },
    ],
    [canWrite, invalidate, t],
  )
  return (
    <>
      <PageHeader
        title={t('issuesTitle')}
        description={t('issuesHint', {
          defaultValue: 'Phiếu xuất kho cho khoa, sửa chữa, bảo dưỡng; ghi sổ để trừ tồn.',
        })}
        actions={
          canWrite && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setQuick(true)}>
                {t('quickIssue')}
              </Button>
              <Button asChild>
                <Link to="/stock/issues/new">{t('createIssue')}</Link>
              </Button>
            </div>
          )
        }
      />
      <DataTable
        tableId="stock-issues"
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
        onRowClick={(row) => navigate(`/stock/issues/${row.id}`)}
        toolbarLeft={
          <FilterBar>
            <FilterField label={t('searchIssue')}>
              <Input
                aria-label={t('searchIssue')}
                value={table.inputQ}
                onChange={(e) => table.setQ(e.target.value)}
                placeholder={t('searchIssue')}
              />
            </FilterField>
          </FilterBar>
        }
      />
      <FormDialog
        open={quick}
        onOpenChange={setQuick}
        title={t('quickIssue')}
        form={form}
        onSubmit={async (values) => {
          try {
            const created = await quickIssue(
              apiBody({
                type: values.type,
                warehouseId: values.warehouseId,
                toDepartmentId: values.toDepartmentId || undefined,
                items: [{ supplyId: values.supplyId, quantity: values.quantity }],
              }),
            )
            toast.success(t('issued'))
            invalidate()
            setQuick(false)
            form.reset({
              type: 'to_department',
              warehouseId: '',
              toDepartmentId: '',
              supplyId: '',
              quantity: '1',
            })
            navigate(`/stock/issues/${created.id}`)
          } catch (error) {
            if (!applyServerErrors(form, error)) toast.error(messageFor(error))
          }
        }}
      >
        <SelectField
          control={form.control}
          name="type"
          label={t('type')}
          options={[{ value: 'to_department', label: t('issueTypeToDepartment') }]}
        />
        <FormField
          control={form.control}
          name="warehouseId"
          render={({ field }) => (
            <FormItem>
              <AsyncSelect
                label={t('warehouse')}
                queryKey="warehouses"
                loadOptions={(q) => catalogOptions('warehouses', q)}
                value={field.value || null}
                onChange={(v) => field.onChange(typeof v === 'string' ? v : '')}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="toDepartmentId"
          render={({ field }) => (
            <FormItem>
              <AsyncSelect
                label={t('toDepartment')}
                queryKey="departments"
                loadOptions={departmentOptions}
                value={field.value || null}
                onChange={(v) => field.onChange(typeof v === 'string' ? v : '')}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="supplyId"
          render={({ field }) => (
            <FormItem>
              <AsyncSelect
                label={t('supply')}
                queryKey="supplies"
                loadOptions={supplyOptions}
                value={field.value || null}
                onChange={(v) => field.onChange(typeof v === 'string' ? v : '')}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <QtyField control={form.control} name="quantity" label={t('quantity')} />
      </FormDialog>
    </>
  )
}
