import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { SelectField, TextField } from '@/components/form/fields'
import { DateField } from '@/components/form/date-field'
import { QtyField } from '@/components/form/qty-field'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AsyncSelect } from '@/components/form/async-select'
import { applyServerErrors, messageFor } from '@/api/errors'
import { apiBody } from '@/api/client'
import {
  catalogOptions,
  departmentOptions,
  equipmentOptions,
  supplyOptions,
  userOptions,
} from '@/api/references'
import { decimalString } from '@/lib/validation/decimal'
import { createIssue, getIssue, getSupplyStock, suggestLots, updateIssue } from '../api'
import { useTranslation } from 'react-i18next'
import i18n from '@/lib/i18n'

const schema = z.object({
  type: z.enum([
    'to_department',
    'for_repair',
    'for_maintenance',
    'dispose',
    'return_to_supplier',
    'adjust_out',
  ]),
  warehouseId: z.string().min(1, i18n.t('common:form.required')),
  toDepartmentId: z.string().nullable(),
  equipmentId: z.string().nullable(),
  reason: z.string(),
  receiverName: z.string(),
  receiverUserId: z.string().nullable(),
  issuedAt: z.string(),
  notes: z.string(),
  items: z
    .array(
      z.object({
        supplyId: z.string().min(1, i18n.t('common:form.required')),
        quantity: decimalString({ maxScale: 3, min: '0.001' }),
        lotId: z.string().nullable(),
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
  const [suggestedLots, setSuggestedLots] = useState<Record<string, string>>({})
  const detail = useQuery({
    queryKey: ['stock', 'issues', id],
    queryFn: () => getIssue(id),
    enabled: editing,
  })
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'to_department',
      warehouseId: '',
      toDepartmentId: null,
      equipmentId: null,
      reason: '',
      receiverName: '',
      receiverUserId: null,
      issuedAt: new Date().toISOString().slice(0, 10),
      notes: '',
      items: [{ supplyId: '', quantity: '1', lotId: null }],
    },
  })
  const items = useFieldArray({ control: form.control, name: 'items' })
  useEffect(() => {
    const row = detail.data
    if (!row) return
    const stringValue = (value: unknown) => (typeof value === 'string' ? value : '')
    form.reset({
      type: row.type,
      warehouseId: row.warehouseId,
      toDepartmentId: stringValue(row.toDepartmentId) || null,
      equipmentId: stringValue(row.equipmentId) || null,
      reason: stringValue(row.reason),
      receiverName: stringValue(row.receiverName),
      receiverUserId: stringValue(row.receiverUserId) || null,
      issuedAt: row.issuedAt?.slice(0, 10) ?? '',
      notes: stringValue(row.notes),
      items: row.items.map((item) => ({
        supplyId: item.supplyId,
        quantity: item.quantity,
        lotId: typeof item.lotId === 'string' ? item.lotId : null,
      })),
    })
  }, [detail.data, form])
  return (
    <>
      <PageHeader title={editing ? t('editIssue') : t('createIssue')} />
      <Form {...form}>
        <form
          className="max-w-3xl space-y-4"
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            if (values.type === 'to_department' && !values.toDepartmentId) {
              form.setError('toDepartmentId', { message: t('requiredDepartment') })
              return
            }
            if (['dispose', 'return_to_supplier'].includes(values.type) && !values.reason.trim()) {
              form.setError('reason', { message: t('requiredReason') })
              return
            }
            try {
              const body = apiBody({
                type: values.type,
                warehouseId: values.warehouseId,
                toDepartmentId: values.toDepartmentId ?? undefined,
                equipmentId: values.equipmentId ?? undefined,
                reason: values.reason || undefined,
                receiverName: values.receiverName || undefined,
                receiverUserId: values.receiverUserId ?? undefined,
                issuedAt: values.issuedAt || undefined,
                notes: values.notes || undefined,
                items: values.items.map((item) => ({
                  supplyId: item.supplyId,
                  quantity: item.quantity,
                  lotId: item.lotId ?? undefined,
                })),
              })
              const saved = editing ? await updateIssue(id, body) : await createIssue(body)
              toast.success(editing ? t('issueSaved') : t('issueCreated'))
              void qc.invalidateQueries({ queryKey: ['stock', 'issues'] })
              void qc.invalidateQueries({ queryKey: ['stock', 'balances'] })
              void qc.invalidateQueries({ queryKey: ['stock', 'lots'] })
              navigate(`/stock/issues/${editing ? id : saved.id}`)
            } catch (error) {
              if (!applyServerErrors(form, error)) toast.error(messageFor(error))
            }
          })}
        >
          <SelectField
            control={form.control}
            name="type"
            label={t('type')}
            options={[
              { value: 'to_department', label: t('issueTypeToDepartment') },
              { value: 'for_repair', label: t('issueTypeRepair') },
              { value: 'for_maintenance', label: t('issueTypeMaintenance') },
              { value: 'dispose', label: t('issueTypeDispose') },
              { value: 'return_to_supplier', label: t('issueTypeReturnSupplier') },
              { value: 'adjust_out', label: t('issueTypeAdjustOut') },
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
          <FormField
            control={form.control}
            name="equipmentId"
            render={({ field }) => (
              <FormItem>
                <AsyncSelect
                  label={t('equipment')}
                  queryKey="equipment"
                  loadOptions={equipmentOptions}
                  value={field.value}
                  onChange={field.onChange}
                  clearable
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <TextField control={form.control} name="reason" label={t('reason')} />
          <TextField control={form.control} name="receiverName" label={t('receiverName')} />
          <FormField
            control={form.control}
            name="receiverUserId"
            render={({ field }) => (
              <FormItem>
                <AsyncSelect
                  label={t('receiverUser')}
                  queryKey="users"
                  loadOptions={(q) => userOptions(q)}
                  value={field.value}
                  onChange={field.onChange}
                  clearable
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <DateField control={form.control} name="issuedAt" label={t('issuedAt')} />
          <TextField control={form.control} name="notes" label={t('notes')} />
          <FormField
            control={form.control}
            name="toDepartmentId"
            render={({ field }) => (
              <FormItem>
                <AsyncSelect
                  label={t('toDepartment')}
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
          {items.fields.map((field, index) => (
            <div key={field.id} className="space-y-2 rounded border p-3">
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
              <QtyField
                control={form.control}
                name={`items.${index}.quantity`}
                label={t('quantity')}
              />
              <FormField
                control={form.control}
                name={`items.${index}.lotId`}
                render={({ field: lotField }) => (
                  <FormItem>
                    <AsyncSelect
                      label={t('lot')}
                      queryKey={`supply-lots-${form.watch(`items.${index}.supplyId`)}-${form.watch('warehouseId')}`}
                      loadOptions={async () => {
                        const supplyId = form.getValues(`items.${index}.supplyId`)
                        if (!supplyId) return []
                        const stock = await getSupplyStock(supplyId)
                        const allowRestricted = ['dispose', 'return_to_supplier'].includes(
                          form.getValues('type'),
                        )
                        return (stock.lots ?? [])
                          .filter(
                            (lot) =>
                              (!lot.warehouseId ||
                                lot.warehouseId === form.getValues('warehouseId')) &&
                              (allowRestricted || lot.status === 'available'),
                          )
                          .map((lot) => ({
                            id: lot.id,
                            code: lot.lotNo ?? lot.id,
                            name: `${t('available')}: ${lot.available ?? lot.qtyOnHand ?? '0'}`,
                          }))
                      }}
                      value={lotField.value}
                      onChange={lotField.onChange}
                      clearable
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              {suggestedLots[field.id] &&
                form.watch(`items.${index}.lotId`) !== suggestedLots[field.id] && (
                  <p className="text-warning text-sm">{t('nonFefoWarning')}</p>
                )}
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const supplyId = form.getValues(`items.${index}.supplyId`)
                  const warehouseId = form.getValues('warehouseId')
                  const quantity = form.getValues(`items.${index}.quantity`)
                  if (!supplyId || !warehouseId) return
                  const lots = await suggestLots({ supplyId, warehouseId, quantity })
                  const first = Array.isArray(lots)
                    ? lots[0]
                    : (lots as { items?: { lotId?: string }[] }).items?.[0]
                  if (first && 'lotId' in first && first.lotId) {
                    form.setValue(`items.${index}.lotId`, first.lotId)
                    setSuggestedLots((current) => ({ ...current, [field.id]: first.lotId! }))
                  }
                  toast.success(t('suggestedLot'))
                }}
              >
                {t('suggestLotFefo')}
              </Button>
              <Button type="button" variant="ghost" onClick={() => items.remove(index)}>
                {t('removeLine')}
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => items.append({ supplyId: '', quantity: '1', lotId: null })}
          >
            {t('addLine')}
          </Button>
          <Button type="submit">{t('saveDraft')}</Button>
        </form>
      </Form>
    </>
  )
}
