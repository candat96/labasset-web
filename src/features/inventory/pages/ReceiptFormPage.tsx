import { useEffect } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { catalogOptions, departmentOptions, supplyOptions } from '@/api/references'
import { formatVnd, moneyAdd, moneyMul } from '@/lib/format/money'
import { decimalString } from '@/lib/validation/decimal'
import { createReceipt, getReceipt, getSupply, updateReceipt } from '../api'
import { useTranslation } from 'react-i18next'
import i18n from '@/lib/i18n'

const schema = z.object({
  type: z.enum(['purchase', 'return_from_dept', 'adjust_in']),
  warehouseId: z.string().min(1, i18n.t('common:form.required')),
  supplierId: z.string().nullable(),
  fromDepartmentId: z.string().nullable(),
  invoiceNo: z.string(),
  invoiceDate: z.string(),
  receivedAt: z.string(),
  qcStatus: z.enum(['pending', 'passed', 'failed']),
  qcNote: z.string(),
  notes: z.string(),
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
  const { id = '' } = useParams()
  const editing = !!id
  const qc = useQueryClient()
  const detail = useQuery({
    queryKey: ['stock', 'receipts', id],
    queryFn: () => getReceipt(id),
    enabled: editing,
  })
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'purchase',
      warehouseId: '',
      supplierId: null,
      fromDepartmentId: null,
      invoiceNo: '',
      invoiceDate: '',
      receivedAt: new Date().toISOString().slice(0, 10),
      qcStatus: 'pending',
      qcNote: '',
      notes: '',
      items: [{ supplyId: '', lotNo: '', expiresAt: '', quantity: '1', unitCost: '0' }],
    },
  })
  useEffect(() => {
    const row = detail.data
    if (!row) return
    const stringValue = (value: unknown) => (typeof value === 'string' ? value : '')
    form.reset({
      type: row.type,
      warehouseId: row.warehouseId,
      supplierId: stringValue(row.supplierId) || null,
      fromDepartmentId: stringValue(row.fromDepartmentId) || null,
      invoiceNo: stringValue(row.invoiceNo),
      invoiceDate: stringValue(row.invoiceDate),
      receivedAt: row.receivedAt?.slice(0, 10) ?? '',
      qcStatus: row.qcStatus ?? 'pending',
      qcNote: stringValue(row.qcNote),
      notes: stringValue(row.notes),
      items: row.items.map((item) => ({
        supplyId: item.supplyId,
        lotNo: item.lotNo ?? '',
        expiresAt: item.expiresAt ?? '',
        quantity: item.quantity,
        unitCost: item.unitCost,
      })),
    })
  }, [detail.data, form])
  const items = useFieldArray({ control: form.control, name: 'items' })
  const watched = form.watch('items')
  const total = moneyAdd(
    watched.map((item) => moneyMul(item.quantity || '0', item.unitCost || '0')),
  )
  const submit = async (values: FormValues) => {
    if (values.type === 'purchase' && !values.supplierId) {
      form.setError('supplierId', { message: t('requiredSupplier') })
      return
    }
    if (values.type === 'return_from_dept' && !values.fromDepartmentId) {
      form.setError('fromDepartmentId', { message: t('requiredDepartment') })
      return
    }
    const supplies = await Promise.all(values.items.map((item) => getSupply(item.supplyId)))
    let invalidTracking = false
    supplies.forEach((supply, index) => {
      const item = values.items[index]
      if (!item) return
      if (supply.trackLot && !item.lotNo) {
        form.setError(`items.${index}.lotNo`, { message: t('requiredLot') })
        invalidTracking = true
      }
      if (supply.trackExpiry && !item.expiresAt) {
        form.setError(`items.${index}.expiresAt`, { message: t('requiredExpiry') })
        invalidTracking = true
      }
    })
    if (invalidTracking) return
    try {
      const body = apiBody({
        type: values.type,
        warehouseId: values.warehouseId,
        supplierId: values.supplierId ?? undefined,
        fromDepartmentId: values.fromDepartmentId ?? undefined,
        invoiceNo: values.invoiceNo || undefined,
        invoiceDate: values.invoiceDate || undefined,
        receivedAt: values.receivedAt,
        qcStatus: values.qcStatus,
        qcNote: values.qcNote || undefined,
        notes: values.notes || undefined,
        items: values.items.map((item) => ({
          supplyId: item.supplyId,
          lotNo: item.lotNo || undefined,
          expiresAt: item.expiresAt || undefined,
          quantity: item.quantity,
          unitCost: item.unitCost,
        })),
      })
      const saved = editing ? await updateReceipt(id, body) : await createReceipt(body)
      toast.success(editing ? t('receiptSaved') : t('receiptCreated'))
      const warnings = (saved as typeof saved & { warnings?: string[] }).warnings
      if (warnings?.length) toast.warning(warnings.join('\n'))
      void qc.invalidateQueries({ queryKey: ['stock', 'receipts'] })
      void qc.invalidateQueries({ queryKey: ['stock', 'balances'] })
      void qc.invalidateQueries({ queryKey: ['stock', 'lots'] })
      navigate(`/stock/receipts/${editing ? id : saved.id}`)
    } catch (error) {
      if (!applyServerErrors(form, error)) toast.error(messageFor(error))
    }
  }
  return (
    <>
      <PageHeader title={editing ? t('editReceipt') : t('createReceipt')} />
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
          {form.watch('type') === 'purchase' && (
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <AsyncSelect
                    label={t('supplier')}
                    queryKey="suppliers"
                    loadOptions={(q) => catalogOptions('suppliers', q)}
                    value={field.value}
                    onChange={field.onChange}
                    clearable
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          {form.watch('type') === 'return_from_dept' && (
            <FormField
              control={form.control}
              name="fromDepartmentId"
              render={({ field }) => (
                <FormItem>
                  <AsyncSelect
                    label={t('fromDepartment')}
                    queryKey="departments"
                    loadOptions={departmentOptions}
                    value={field.value}
                    onChange={field.onChange}
                    clearable
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <TextField control={form.control} name="invoiceNo" label={t('invoiceNo')} />
          <DateField control={form.control} name="invoiceDate" label={t('invoiceDate')} />
          <DateField control={form.control} name="receivedAt" label={t('receivedAt')} />
          <SelectField
            control={form.control}
            name="qcStatus"
            label="QC"
            options={[
              { value: 'pending', label: t('qcPending') },
              { value: 'passed', label: t('qcPassed') },
              { value: 'failed', label: t('qcFailed') },
            ]}
          />
          <TextField control={form.control} name="qcNote" label={t('qcNote')} />
          <TextField control={form.control} name="notes" label={t('notes')} />
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
              <Button type="button" variant="ghost" onClick={() => items.remove(index)}>
                {t('removeLine')}
              </Button>
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
