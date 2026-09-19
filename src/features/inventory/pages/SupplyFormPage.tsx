import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { TextField, SwitchField } from '@/components/form/fields'
import { MoneyField } from '@/components/form/money-field'
import { QtyField } from '@/components/form/qty-field'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AsyncSelect } from '@/components/form/async-select'
import { applyServerErrors, messageFor } from '@/api/errors'
import { catalogOptions } from '@/api/references'
import { useQuery } from '@tanstack/react-query'
import { createSupply, getSupply, updateSupply } from '../api'

const schema = z.object({
  code: z.string(),
  name: z.string().trim().min(1, 'Bắt buộc'),
  groupId: z.string().nullable(),
  unitId: z.string().nullable(),
  packaging: z.string(),
  manufacturerId: z.string().nullable(),
  refPrice: z.string(),
  trackLot: z.boolean(),
  trackExpiry: z.boolean(),
  minStock: z.string(),
  maxStock: z.string(),
  isActive: z.boolean(),
  notes: z.string(),
})
type FormValues = z.infer<typeof schema>
const empty: FormValues = {
  code: '',
  name: '',
  groupId: null,
  unitId: null,
  packaging: '',
  manufacturerId: null,
  refPrice: '',
  trackLot: false,
  trackExpiry: false,
  minStock: '',
  maxStock: '',
  isActive: true,
  notes: '',
}

export function Component() {
  const { id = '' } = useParams()
  const editing = !!id
  const navigate = useNavigate()
  const detail = useQuery({
    queryKey: ['supplies', id],
    queryFn: () => getSupply(id),
    enabled: editing,
  })
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: empty })
  useEffect(() => {
    if (!detail.data) return
    form.reset({
      code: detail.data.code,
      name: detail.data.name,
      groupId: detail.data.groupId,
      unitId: detail.data.unitId,
      packaging: detail.data.packaging ?? '',
      manufacturerId: detail.data.manufacturerId,
      refPrice: detail.data.refPrice ?? '',
      trackLot: detail.data.trackLot,
      trackExpiry: detail.data.trackExpiry,
      minStock: detail.data.minStock ?? '',
      maxStock: detail.data.maxStock ?? '',
      isActive: detail.data.isActive,
      notes: detail.data.notes ?? '',
    })
  }, [detail.data, form])
  if (editing && detail.isPending) return <p role="status">Đang tải vật tư…</p>
  if (editing && detail.error)
    return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const submit = async (values: FormValues) => {
    const body = {
      ...values,
      code: values.code.toUpperCase() || undefined,
      packaging: values.packaging || null,
      refPrice: values.refPrice || null,
      minStock: values.minStock || null,
      maxStock: values.maxStock || null,
      notes: values.notes || null,
    }
    try {
      if (editing) {
        await updateSupply(id, body)
        toast.success('Đã lưu vật tư')
        navigate(`/supplies/${id}`)
      } else {
        const created = await createSupply(body)
        toast.success('Đã tạo vật tư')
        navigate(`/supplies/${created.id}`)
      }
    } catch (error) {
      if (!applyServerErrors(form, error)) toast.error(messageFor(error))
    }
  }
  return (
    <>
      <PageHeader title={editing ? 'Sửa vật tư' : 'Thêm vật tư'} />
      <Form {...form}>
        <form className="max-w-xl space-y-4" noValidate onSubmit={form.handleSubmit(submit)}>
          <TextField
            control={form.control}
            name="code"
            label="Mã"
            transform={(v) => v.toUpperCase()}
          />
          <TextField control={form.control} name="name" label="Tên" />
          <FormField
            control={form.control}
            name="groupId"
            render={({ field }) => (
              <FormItem>
                <AsyncSelect
                  label="Nhóm"
                  queryKey="supply-groups"
                  loadOptions={(q) => catalogOptions('supply-groups', q)}
                  value={field.value}
                  onChange={field.onChange}
                  clearable
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="unitId"
            render={({ field }) => (
              <FormItem>
                <AsyncSelect
                  label="ĐVT"
                  queryKey="units"
                  loadOptions={(q) => catalogOptions('units', q)}
                  value={field.value}
                  onChange={field.onChange}
                  clearable
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <MoneyField control={form.control} name="refPrice" label="Giá tham khảo" />
          <SwitchField control={form.control} name="trackLot" label="Theo dõi lô" />
          <SwitchField control={form.control} name="trackExpiry" label="Theo dõi hạn" />
          <QtyField control={form.control} name="minStock" label="Tồn min" />
          <QtyField control={form.control} name="maxStock" label="Tồn max" />
          <SwitchField control={form.control} name="isActive" label="Đang dùng" />
          <TextField control={form.control} name="notes" label="Ghi chú" />
          <Button type="submit">Lưu</Button>
        </form>
      </Form>
    </>
  )
}
