import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { TextField, SelectField } from '@/components/form/fields'
import { DateField } from '@/components/form/date-field'
import { QtyField } from '@/components/form/qty-field'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { AsyncSelect } from '@/components/form/async-select'
import { applyServerErrors, messageFor } from '@/api/errors'
import { apiBody } from '@/api/client'
import { departmentOptions, equipmentOptions, supplyOptions } from '@/api/references'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { decimalString } from '@/lib/validation/decimal'
import { createRequest, submitRequest } from '../api'
import { useTranslation } from 'react-i18next'

const schema = z.object({
  type: z.enum(['supply', 'repair']),
  departmentId: z.string().nullable(),
  equipmentId: z.string().nullable(),
  priority: z.enum(['normal', 'urgent']),
  reason: z.string(),
  neededBy: z.string(),
  items: z.array(
    z.object({
      supplyId: z.string(),
      qtyRequested: decimalString({ maxScale: 3, min: '0.001' }),
      note: z.string(),
    }),
  ),
})
type FormValues = z.infer<typeof schema>

export function Component() {
  const { t } = useTranslation('requests')

  const canPickDept = useCan(STAFF)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'supply',
      departmentId: null,
      equipmentId: null,
      priority: 'normal',
      reason: '',
      neededBy: '',
      items: [{ supplyId: '', qtyRequested: '1', note: '' }],
    },
  })
  const items = useFieldArray({ control: form.control, name: 'items' })
  const type = form.watch('type')
  const save = async (values: FormValues, send: boolean) => {
    try {
      const created = await createRequest(
        apiBody({
          type: values.type,
          departmentId: canPickDept ? (values.departmentId ?? undefined) : undefined,
          equipmentId: values.equipmentId ?? undefined,
          priority: values.priority,
          reason: values.reason || undefined,
          neededBy: values.neededBy || undefined,
          items:
            values.type === 'supply'
              ? values.items
                  .filter((item) => item.supplyId)
                  .map((item) => ({
                    supplyId: item.supplyId,
                    qtyRequested: item.qtyRequested,
                    note: item.note || undefined,
                  }))
              : undefined,
        }),
      )
      if (send) await submitRequest(created.id)
      toast.success(send ? t('submitted') : t('draftSaved'))
      void qc.invalidateQueries({ queryKey: ['requests'] })
      navigate(`/requests/${created.id}`)
    } catch (error) {
      if (!applyServerErrors(form, error)) toast.error(messageFor(error))
    }
  }
  return (
    <>
      <PageHeader title={t('createTitle')} />
      <Form {...form}>
        <form className="max-w-2xl space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={type === 'supply' ? 'default' : 'outline'}
              onClick={() => form.setValue('type', 'supply')}
            >
              {t('typeSupply')}
            </Button>
            <Button
              type="button"
              variant={type === 'repair' ? 'default' : 'outline'}
              onClick={() => form.setValue('type', 'repair')}
            >
              {t('typeRepair')}
            </Button>
          </div>
          {canPickDept && (
            <FormField
              control={form.control}
              name="departmentId"
              render={({ field }) => (
                <FormItem>
                  <AsyncSelect
                    label="Khoa"
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
          <SelectField
            control={form.control}
            name="priority"
            label={t('priority')}
            options={[
              { value: 'normal', label: t('normal') },
              { value: 'urgent', label: t('urgent') },
            ]}
          />
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('reason')}</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DateField control={form.control} name="neededBy" label={t('neededBy')} />
          {type === 'supply' &&
            items.fields.map((field, index) => (
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
                <QtyField
                  control={form.control}
                  name={`items.${index}.qtyRequested`}
                  label={t('quantity')}
                />
                <TextField control={form.control} name={`items.${index}.note`} label={t('notes')} />
              </div>
            ))}
          {type === 'supply' && (
            <Button
              type="button"
              variant="outline"
              onClick={() => items.append({ supplyId: '', qtyRequested: '1', note: '' })}
            >
              {t('addLine')}
            </Button>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit((v) => save(v, false))}
            >
              {t('saveDraft')}
            </Button>
            <Button type="button" onClick={form.handleSubmit((v) => save(v, true))}>
              {t('saveAndSubmit')}
            </Button>
          </div>
        </form>
      </Form>
    </>
  )
}
