import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { SelectField } from '@/components/form/fields'
import { QtyField } from '@/components/form/qty-field'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AsyncSelect } from '@/components/form/async-select'
import { applyServerErrors, messageFor } from '@/api/errors'
import { apiBody } from '@/api/client'
import { catalogOptions, departmentOptions, supplyOptions } from '@/api/references'
import { decimalString } from '@/lib/validation/decimal'
import { createIssue, suggestLots } from '../api'
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
  reason: z.string(),
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
  const qc = useQueryClient()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'to_department',
      warehouseId: '',
      toDepartmentId: null,
      reason: '',
      items: [{ supplyId: '', quantity: '1', lotId: null }],
    },
  })
  const items = useFieldArray({ control: form.control, name: 'items' })
  return (
    <>
      <PageHeader title={t('createIssue')} />
      <Form {...form}>
        <form
          className="max-w-3xl space-y-4"
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            try {
              const created = await createIssue(
                apiBody({
                  type: values.type,
                  warehouseId: values.warehouseId,
                  toDepartmentId: values.toDepartmentId ?? undefined,
                  reason: values.reason || undefined,
                  items: values.items.map((item) => ({
                    supplyId: item.supplyId,
                    quantity: item.quantity,
                    lotId: item.lotId ?? undefined,
                  })),
                }),
              )
              toast.success(t('issueCreated'))
              void qc.invalidateQueries({ queryKey: ['stock', 'issues'] })
              void qc.invalidateQueries({ queryKey: ['stock', 'balances'] })
              void qc.invalidateQueries({ queryKey: ['stock', 'lots'] })
              navigate(`/stock/issues/${created.id}`)
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
              { value: 'dispose', label: t('cancel') },
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
                  if (first && 'lotId' in first && first.lotId)
                    form.setValue(`items.${index}.lotId`, first.lotId)
                  toast.success(t('suggestedLot'))
                }}
              >
                {t('suggestLotFefo')}
              </Button>
            </div>
          ))}
          <Button type="submit">{t('saveDraft')}</Button>
        </form>
      </Form>
    </>
  )
}
