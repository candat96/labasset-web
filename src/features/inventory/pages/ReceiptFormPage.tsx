import { useFieldArray, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
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
import { catalogOptions, supplyOptions } from '@/api/references'
import { formatVnd, moneyAdd, moneyMul } from '@/lib/format/money'
import { createReceipt } from '../api'

const schema = z.object({
  type: z.enum(['purchase', 'return_from_dept', 'adjust_in']),
  warehouseId: z.string().min(1, 'Bắt buộc'),
  supplierId: z.string().nullable(),
  invoiceNo: z.string(),
  receivedAt: z.string(),
  items: z
    .array(
      z.object({
        supplyId: z.string().min(1, 'Bắt buộc'),
        lotNo: z.string(),
        expiresAt: z.string(),
        quantity: z.string().min(1, 'Bắt buộc'),
        unitCost: z.string().min(1, 'Bắt buộc'),
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
      const created = await createReceipt({
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
      } as never)
      toast.success('Đã tạo phiếu nhập')
      navigate(`/stock/receipts/${created.id}`)
    } catch (error) {
      if (!applyServerErrors(form, error)) toast.error(messageFor(error))
    }
  }
  return (
    <>
      <PageHeader title="Tạo phiếu nhập" />
      <Form {...form}>
        <form className="max-w-3xl space-y-4" noValidate onSubmit={form.handleSubmit(submit)}>
          <SelectField
            control={form.control}
            name="type"
            label="Loại"
            options={[
              { value: 'purchase', label: 'Mua từ NCC' },
              { value: 'return_from_dept', label: 'Khoa trả lại' },
              { value: 'adjust_in', label: 'Điều chỉnh tăng' },
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
          <TextField control={form.control} name="invoiceNo" label="Số hoá đơn" />
          <DateField control={form.control} name="receivedAt" label="Ngày nhận" />
          {items.fields.map((field, index) => (
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
              <TextField control={form.control} name={`items.${index}.lotNo`} label="Lô" />
              <DateField control={form.control} name={`items.${index}.expiresAt`} label="Hạn" />
              <QtyField control={form.control} name={`items.${index}.quantity`} label="Số lượng" />
              <MoneyField control={form.control} name={`items.${index}.unitCost`} label="Đơn giá" />
              <p className="text-sm">
                Thành tiền:{' '}
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
            Thêm dòng
          </Button>
          <p className="font-medium">Tổng: {formatVnd(total)}</p>
          <Button type="submit">Lưu nháp</Button>
        </form>
      </Form>
    </>
  )
}
