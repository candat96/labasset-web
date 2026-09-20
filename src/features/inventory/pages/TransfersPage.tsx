import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/form/FormDialog'
import { QtyField } from '@/components/form/qty-field'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AsyncSelect } from '@/components/form/async-select'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { applyServerErrors, messageFor } from '@/api/errors'
import { catalogOptions } from '@/api/references'
import { decimalString } from '@/lib/validation/decimal'
import { Component as IssuesPage } from './IssuesPage'
import { createTransfer, listLots } from '../api'
import { useTranslation } from 'react-i18next'
import i18n from '@/lib/i18n'

const schema = z
  .object({
    fromWarehouseId: z.string().min(1, i18n.t('common:form.required')),
    toWarehouseId: z.string().min(1, i18n.t('common:form.required')),
    lotId: z.string().min(1, i18n.t('common:form.required')),
    quantity: decimalString({ maxScale: 3, min: '0.001' }),
  })
  .refine((value) => value.fromWarehouseId !== value.toWarehouseId, {
    path: ['toWarehouseId'],
    message: i18n.t('inventory:warehouseSame'),
  })
type FormValues = z.infer<typeof schema>

export function Component() {
  const { t } = useTranslation('inventory')

  const canWrite = useCan(STAFF)
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fromWarehouseId: '', toWarehouseId: '', lotId: '', quantity: '1' },
  })
  return (
    <>
      <PageHeader
        title={t('transferTitle')}
        actions={canWrite && <Button onClick={() => setOpen(true)}>{t('createTransfer')}</Button>}
      />
      <p className="text-muted-foreground mb-3 text-sm">{t('transfersDesc')}</p>
      <IssuesPage />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t('createTransfer')}
        form={form}
        onSubmit={async (values) => {
          try {
            await createTransfer({
              fromWarehouseId: values.fromWarehouseId,
              toWarehouseId: values.toWarehouseId,
              items: [{ lotId: values.lotId, quantity: values.quantity }],
            })
            toast.success(t('transferCreated'))
            setOpen(false)
            void qc.invalidateQueries({ queryKey: ['stock', 'issues'] })
            void qc.invalidateQueries({ queryKey: ['stock', 'lots'] })
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
                onChange={(v) => field.onChange(typeof v === 'string' ? v : '')}
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
                onChange={(v) => field.onChange(typeof v === 'string' ? v : '')}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="lotId"
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
                    name: `${lot.supplyId} · ${t('available')}: ${lot.available}`,
                  }))
                }}
                value={field.value || null}
                onChange={(value) => field.onChange(typeof value === 'string' ? value : '')}
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
