import { useFieldArray, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { TextField, SelectField } from '@/components/form/fields'
import { DateField } from '@/components/form/date-field'
import { MoneyField } from '@/components/form/money-field'
import { QtyField } from '@/components/form/qty-field'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AsyncSelect } from '@/components/form/async-select'
import { applyServerErrors, messageFor } from '@/api/errors'
import { apiBody } from '@/api/client'
import { catalogOptions, supplyOptions } from '@/api/references'
import { formatVnd, moneyAdd, moneyMul } from '@/lib/format/money'
import { decimalString } from '@/lib/validation/decimal'
import { createReceipt } from '../api'
import { useTranslation } from 'react-i18next'
import i18n from '@/lib/i18n'

const schema = z.object({
  type: z.enum(['purchase', 'return_from_dept', 'adjust_in']),
  warehouseId: z.string().min(1, i18n.t('common:form.required')),
  supplierId: z.string().nullable(),
  invoiceNo: z.string(),
  receivedAt: z.string(),
  items: z
    .array(
      z.object({
        supplyId: z.string().min(1, i18n.t('common:form.required')),
        lotNo: z.string(),
        expiresAt: z.string(),
        quantity: decimalString({ maxScale: 3, min: '0' }),
        unitCost: decimalString({ maxScale: 0, min: '0' }),
      }),
    )
    .min(1),
})
type FormValues = z.infer<typeof schema>

export function Component() {
  const { t } = useTranslation('inventory')

  const navigate = useNavigate()
  const qc = useQueryClient()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'purchase',
      warehouseId: '',
      supplierId: null,
      invoiceNo: '',
      receivedAt: new Date().toISOString().slice(0, 10),
      items: [{ supplyId: '', lotNo: '', expiresAt: '', quantity: '1', unitCost: '0' }],
    },
  })
  const items = useFieldArray({ control: form.control, name: 'items' })
  const watched = form.watch('items')
  const total = moneyAdd(
    watched.map((item) => moneyMul(item.quantity || '0', item.unitCost || '0')),
  )
  const submit = async (values: FormValues) => {
    try {
      const created = await createReceipt(
        apiBody({
          type: values.type,
          warehouseId: values.warehouseId,
          supplierId: values.supplierId ?? undefined,
          invoiceNo: values.invoiceNo || undefined,
          receivedAt: values.receivedAt,
          items: values.items.map((item) => ({
            supplyId: item.supplyId,
            lotNo: item.lotNo || undefined,
            expiresAt: item.expiresAt || undefined,
            quantity: item.quantity,
            unitCost: item.unitCost,
          })),
        }),
      )
      toast.success(t('receiptCreated'))
      void qc.invalidateQueries({ queryKey: ['stock', 'receipts'] })
      void qc.invalidateQueries({ queryKey: ['stock', 'balances'] })
      void qc.invalidateQueries({ queryKey: ['stock', 'lots'] })
      navigate(`/stock/receipts/${created.id}`)
    } catch (error) {
      if (!applyServerErrors(form, error)) toast.error(messageFor(error))
    }
  }
  return (
    <>
      <PageHeader title={t('createReceipt')} />
      <Form {...form}>
        <form className="max-w-3xl space-y-4" noValidate onSubmit={form.handleSubmit(submit)}>
          <SelectField
            control={form.control}
            name="type"
            label={t('type')}
            options={[
              { value: 'purchase', label: t('receiptTypePurchase') },
              { value: 'return_from_dept', label: t('receiptTypeReturn') },
              { value: 'adjust_in', label: t('receiptTypeAdjustIn') },
            ]}
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
          <TextField control={form.control} name="invoiceNo" label={t('invoiceNo')} />
          <DateField control={form.control} name="receivedAt" label={t('receivedAt')} />
          {items.fields.map((field, index) => (
            <div key={field.id} className="grid gap-2 rounded border p-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name={`items.${index}.supplyId`}
                render={({ field: f }) => (
                  <FormItem>
                    <AsyncSelect
                      label={t('supply')}
                      queryKey="supplies"
                      loadOptions={supplyOptions}
                      value={f.value || null}
                      onChange={(v) => f.onChange(typeof v === 'string' ? v : '')}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <TextField control={form.control} name={`items.${index}.lotNo`} label={t('lot')} />
              <DateField
                control={form.control}
                name={`items.${index}.expiresAt`}
                label={t('expiry')}
              />
              <QtyField
                control={form.control}
                name={`items.${index}.quantity`}
                label={t('quantity')}
              />
              <MoneyField
                control={form.control}
                name={`items.${index}.unitCost`}
                label={t('unitCost')}
              />
              <p className="text-sm">
                {t('lineTotal')}{' '}
                {formatVnd(
                  moneyMul(watched[index]?.quantity ?? '0', watched[index]?.unitCost ?? '0'),
                )}
              </p>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              items.append({ supplyId: '', lotNo: '', expiresAt: '', quantity: '1', unitCost: '0' })
            }
          >
            {t('addLine')}
          </Button>
          <p className="font-medium">
            {t('total')} {formatVnd(total)}
          </p>
          <Button type="submit">{t('saveDraft')}</Button>
        </form>
      </Form>
    </>
  )
}
