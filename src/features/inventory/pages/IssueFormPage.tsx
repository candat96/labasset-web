import { useNavigate } from 'react-router'
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
import { catalogOptions, departmentOptions, supplyOptions } from '@/api/references'
import { createIssue, suggestLots } from '../api'

const schema = z.object({
  type: z.enum([
    'to_department',
    'for_repair',
    'for_maintenance',
    'dispose',
    'return_to_supplier',
    'adjust_out',
  ]),
  warehouseId: z.string().min(1, 'Bắt buộc'),
  toDepartmentId: z.string().nullable(),
  reason: z.string(),
  items: z
    .array(
      z.object({
        supplyId: z.string().min(1),
        quantity: z.string().min(1),
        lotId: z.string().nullable(),
      }),
    )
    .min(1),
})
type FormValues = z.infer<typeof schema>

export function Component() {
  const navigate = useNavigate()
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
      <PageHeader title="Tạo phiếu xuất" />
      <Form {...form}>
        <form
          className="max-w-3xl space-y-4"
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            try {
              const created = await createIssue({
                type: values.type,
                warehouseId: values.warehouseId,
                toDepartmentId: values.toDepartmentId ?? undefined,
                reason: values.reason || undefined,
                items: values.items.map((item) => ({
                  supplyId: item.supplyId,
                  quantity: item.quantity,
                  name: 'Vật tư',
                  lotId: item.lotId ?? undefined,
                })),
              } as never)
              toast.success('Đã tạo phiếu xuất')
              navigate(`/stock/issues/${created.id}`)
            } catch (error) {
              if (!applyServerErrors(form, error)) toast.error(messageFor(error))
            }
          })}
        >
          <SelectField
            control={form.control}
            name="type"
            label="Loại"
            options={[
              { value: 'to_department', label: 'Cấp cho khoa' },
              { value: 'for_repair', label: 'Sửa chữa' },
              { value: 'dispose', label: 'Huỷ' },
            ]}
          />
          <FormField
            control={form.control}
            name="warehouseId"
            render={({ field }) => (
              <FormItem>
                <AsyncSelect
                  label="Kho"
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
                  label="Khoa nhận"
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
                      label="Vật tư"
                      queryKey="supplies"
                      loadOptions={supplyOptions}
                      value={f.value || null}
                      onChange={(v) => f.onChange(typeof v === 'string' ? v : '')}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <QtyField control={form.control} name={`items.${index}.quantity`} label="Số lượng" />
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
                  toast.success('Đã gợi ý lô FEFO')
                }}
              >
                Gợi ý lô (FEFO)
              </Button>
            </div>
          ))}
          <Button type="submit">Lưu nháp</Button>
        </form>
      </Form>
    </>
  )
}
