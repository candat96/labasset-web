import { useNavigate } from 'react-router'
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
import { departmentOptions, equipmentOptions, supplyOptions } from '@/api/references'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { createRequest, submitRequest } from '../api'

const schema = z.object({
  type: z.enum(['supply', 'repair']),
  departmentId: z.string().nullable(),
  equipmentId: z.string().nullable(),
  priority: z.enum(['normal', 'urgent']),
  reason: z.string(),
  neededBy: z.string(),
  items: z.array(z.object({ supplyId: z.string(), qtyRequested: z.string(), note: z.string() })),
})
type FormValues = z.infer<typeof schema>

export function Component() {
  const canPickDept = useCan(STAFF)
  const navigate = useNavigate()
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
      const created = await createRequest({
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
      } as never)
      if (send) await submitRequest(created.id)
      toast.success(send ? 'Đã gửi phiếu' : 'Đã lưu nháp')
      navigate(`/requests/${created.id}`)
    } catch (error) {
      if (!applyServerErrors(form, error)) toast.error(messageFor(error))
    }
  }
  return (
    <>
      <PageHeader title="Tạo phiếu yêu cầu" />
      <Form {...form}>
        <form className="max-w-2xl space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={type === 'supply' ? 'default' : 'outline'}
              onClick={() => form.setValue('type', 'supply')}
            >
              Vật tư/hoá chất
            </Button>
            <Button
              type="button"
              variant={type === 'repair' ? 'default' : 'outline'}
              onClick={() => form.setValue('type', 'repair')}
            >
              Yêu cầu sửa chữa
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
                  label="Máy"
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
            label="Ưu tiên"
            options={[
              { value: 'normal', label: 'Thường' },
              { value: 'urgent', label: 'Khẩn' },
            ]}
          />
          <FormField
            control={form.control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lý do / mô tả</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DateField control={form.control} name="neededBy" label="Cần trước" />
          {type === 'supply' &&
            items.fields.map((field, index) => (
              <div key={field.id} className="grid gap-2 rounded border p-3 sm:grid-cols-2">
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
                <QtyField
                  control={form.control}
                  name={`items.${index}.qtyRequested`}
                  label="Số lượng"
                />
                <TextField control={form.control} name={`items.${index}.note`} label="Ghi chú" />
              </div>
            ))}
          {type === 'supply' && (
            <Button
              type="button"
              variant="outline"
              onClick={() => items.append({ supplyId: '', qtyRequested: '1', note: '' })}
            >
              Thêm dòng
            </Button>
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={form.handleSubmit((v) => save(v, false))}
            >
              Lưu nháp
            </Button>
            <Button type="button" onClick={form.handleSubmit((v) => save(v, true))}>
              Lưu & Gửi
            </Button>
          </div>
        </form>
      </Form>
    </>
  )
}
