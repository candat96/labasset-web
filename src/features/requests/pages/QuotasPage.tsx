import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { z } from 'zod'
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
import { decimalString } from '@/lib/validation/decimal'
import { createQuota, listQuotas } from '../api'
import type { components } from '@/api/schema'
import { useTranslation } from 'react-i18next'
import i18n from '@/lib/i18n'

type Row = components['schemas']['QuotaResponseDto']

const schema = z.object({
  departmentId: z.string().min(1, i18n.t('common:form.required')),
  supplyId: z.string().min(1, i18n.t('common:form.required')),
  monthlyQty: decimalString({ maxScale: 3, min: '0' }),
})
type FormValues = z.infer<typeof schema>

export function Component() {
  const { t } = useTranslation('requests')

  const canWrite = useCan(ADM)
  const qc = useQueryClient()
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
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { departmentId: '', supplyId: '', monthlyQty: '0' },
  })
  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      { accessorKey: 'departmentId', header: 'Khoa' },
      { accessorKey: 'supplyId', header: t('supply') },
      { accessorKey: 'monthlyQty', header: t('monthlyQty') },
    ],
    [t],
  )
  return (
    <>
      <PageHeader
        title={t('quotasTitle')}
        actions={canWrite && <Button onClick={() => setOpen(true)}>{t('createQuota')}</Button>}
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
        title={t('createQuota')}
        form={form}
        onSubmit={async (values) => {
          try {
            await createQuota(values)
            toast.success(t('quotaCreated'))
            setOpen(false)
            void qc.invalidateQueries({ queryKey: ['requests', 'quotas'] })
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
        <QtyField control={form.control} name="monthlyQty" label={t('monthlyQty')} />
      </FormDialog>
    </>
  )
}
