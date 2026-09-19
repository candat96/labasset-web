import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/form/FormDialog'
import { QtyField } from '@/components/form/qty-field'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AsyncSelect } from '@/components/form/async-select'
import { useCan } from '@/app/guards/useCan'
import { ADM } from '@/routes/roles'
import { applyServerErrors, messageFor } from '@/api/errors'
import { departmentOptions, supplyOptions } from '@/api/references'
import { createQuota, listQuotas } from '../api'
import type { components } from '@/api/schema'

type Row = components['schemas']['QuotaResponseDto']

export function Component() {
  const canWrite = useCan(ADM)
  const table = useServerTable({ filterKeys: ['departmentId', 'supplyId'] })
  const list = useQuery({
    queryKey: ['requests', 'quotas', table.params],
    queryFn: () =>
      listQuotas({
        page: table.params.page,
        limit: table.params.limit,
        departmentId: table.params.filters.departmentId,
        supplyId: table.params.filters.supplyId,
      }),
  })
  const [open, setOpen] = useState(false)
  const form = useForm({ defaultValues: { departmentId: '', supplyId: '', monthlyQty: '0' } })
  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      { accessorKey: 'departmentId', header: 'Khoa' },
      { accessorKey: 'supplyId', header: 'Vật tư' },
      { accessorKey: 'monthlyQty', header: 'Định mức tháng' },
    ],
    [],
  )
  return (
    <>
      <PageHeader
        title="Định mức khoa"
        actions={canWrite && <Button onClick={() => setOpen(true)}>Thêm định mức</Button>}
      />
      <DataTable
        tableId="quotas"
        columns={columns}
        data={list.data?.items}
        total={list.data?.total ?? 0}
        params={table.params}
        onPageChange={table.setPage}
        onLimitChange={table.setLimit}
        isLoading={list.isPending}
        error={list.error}
        onRetry={() => void list.refetch()}
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Thêm định mức"
        form={form}
        onSubmit={async (values) => {
          try {
            await createQuota(values)
            toast.success('Đã tạo định mức')
            setOpen(false)
            void list.refetch()
          } catch (error) {
            if (!applyServerErrors(form, error)) toast.error(messageFor(error))
          }
        }}
      >
        <FormField
          control={form.control}
          name="departmentId"
          render={({ field }) => (
            <FormItem>
              <AsyncSelect
                label="Khoa"
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
                label="Vật tư"
                queryKey="supplies"
                loadOptions={supplyOptions}
                value={field.value || null}
                onChange={(v) => field.onChange(typeof v === 'string' ? v : '')}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <QtyField control={form.control} name="monthlyQty" label="Định mức tháng" />
      </FormDialog>
    </>
  )
}
