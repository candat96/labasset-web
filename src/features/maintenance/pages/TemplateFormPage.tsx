import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { TextField, SelectField, SwitchField, NumberField } from '@/components/form/fields'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AsyncSelect } from '@/components/form/async-select'
import { applyServerErrors, isApiError, messageFor } from '@/api/errors'
import { catalogOptions } from '@/api/references'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { useConfirm } from '@/components/confirm-dialog'
import { cloneTemplate, createTemplate, deleteTemplate, updateTemplate } from '../api'
import { useInvalidateMaint, useTemplate } from '../hooks'
import { templateSchema, type TemplateForm } from '../schema'

function slugify(label: string) {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const empty: TemplateForm = {
  name: '',
  groupId: null,
  model: '',
  isActive: true,
  items: [{ key: '', label: '', type: 'check', unit: '', min: '', max: '', optional: false }],
}

export function Component() {
  const { id = '' } = useParams()
  const editing = !!id
  const navigate = useNavigate()
  const canWrite = useCan(STAFF)
  const detail = useTemplate(id)
  const invalidate = useInvalidateMaint()
  const { confirm, dialog } = useConfirm()
  const form = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: empty,
  })
  const items = useFieldArray({ control: form.control, name: 'items' })
  useEffect(() => {
    if (!detail.data) return
    form.reset({
      name: detail.data.name,
      groupId: detail.data.groupId,
      model: detail.data.model ?? '',
      isActive: detail.data.isActive,
      items: detail.data.items.map((item) => ({
        key: item.key,
        label: item.label,
        type: item.type,
        unit: item.unit ?? '',
        min: item.min ?? '',
        max: item.max ?? '',
        optional: !!item.optional,
      })),
    })
  }, [detail.data, form])
  if (editing && detail.isPending) return <p role="status">Đang tải mẫu…</p>
  if (editing && detail.error)
    return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const submit = async (values: TemplateForm) => {
    const used = new Set<string>()
    const body = {
      name: values.name,
      groupId: values.groupId,
      model: values.model || null,
      isActive: values.isActive,
      items: values.items.map((item, index) => {
        let key = item.key || slugify(item.label) || `item-${index + 1}`
        while (used.has(key)) key = `${key}-${index + 1}`
        used.add(key)
        return {
          key,
          label: item.label,
          type: item.type,
          unit: item.type === 'measure' ? item.unit || undefined : undefined,
          min: item.type === 'measure' && item.min !== '' ? item.min : undefined,
          max: item.type === 'measure' && item.max !== '' ? item.max : undefined,
          optional: item.optional,
        }
      }),
    }
    try {
      if (editing) {
        await updateTemplate(id, body as never)
        toast.success('Đã lưu mẫu')
      } else {
        const created = await createTemplate(body as never)
        toast.success('Đã tạo mẫu')
        navigate(`/maintenance/templates/${created.id}/edit`)
        return
      }
      void invalidate()
    } catch (error) {
      if (!applyServerErrors(form, error)) toast.error(messageFor(error))
    }
  }
  return (
    <>
      {dialog}
      <PageHeader
        title={editing ? 'Sửa checklist' : 'Thêm checklist'}
        actions={
          editing &&
          canWrite && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  const cloned = await cloneTemplate(id)
                  toast.success('Đã nhân bản mẫu')
                  void invalidate()
                  navigate(`/maintenance/templates/${cloned.id}/edit`)
                }}
              >
                Nhân bản
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  if ((await confirm({ title: 'Xoá mẫu?', destructive: true })) === false) return
                  try {
                    await deleteTemplate(id)
                    toast.success('Đã xoá mẫu')
                    void invalidate()
                    navigate('/maintenance/templates')
                  } catch (error) {
                    toast.error(
                      isApiError(error) && error.status === 409
                        ? 'Mẫu đang dùng. Hãy chuyển ngừng hoạt động.'
                        : messageFor(error),
                    )
                  }
                }}
              >
                Xoá
              </Button>
            </div>
          )
        }
      />
      <Form {...form}>
        <form className="max-w-3xl space-y-4" noValidate onSubmit={form.handleSubmit(submit)}>
          <TextField control={form.control} name="name" label="Tên" />
          <FormField
            control={form.control}
            name="groupId"
            render={({ field }) => (
              <FormItem>
                <AsyncSelect
                  label="Nhóm máy"
                  queryKey="equipment-groups"
                  loadOptions={(q) => catalogOptions('equipment-groups', q)}
                  value={field.value}
                  onChange={field.onChange}
                  clearable
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <TextField control={form.control} name="model" label="Model" />
          <SwitchField control={form.control} name="isActive" label="Đang dùng" />
          <ol className="space-y-3">
            {items.fields.map((field, index) => (
              <li key={field.id} className="space-y-2 rounded border p-3">
                <div className="flex justify-between">
                  <p className="font-medium">Mục {index + 1}</p>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={index === 0}
                      onClick={() => items.move(index, index - 1)}
                    >
                      Lên
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={index === items.fields.length - 1}
                      onClick={() => items.move(index, index + 1)}
                    >
                      Xuống
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => items.remove(index)}
                    >
                      Xoá
                    </Button>
                  </div>
                </div>
                <TextField control={form.control} name={`items.${index}.label`} label="Nhãn" />
                <SelectField
                  control={form.control}
                  name={`items.${index}.type`}
                  label="Kiểu"
                  options={[
                    { value: 'check', label: 'Đạt/Không đạt' },
                    { value: 'measure', label: 'Đo' },
                    { value: 'text', label: 'Văn bản' },
                  ]}
                />
                {form.watch(`items.${index}.type`) === 'measure' && (
                  <>
                    <TextField control={form.control} name={`items.${index}.unit`} label="Đơn vị" />
                    <NumberField control={form.control} name={`items.${index}.min`} label="Min" />
                    <NumberField control={form.control} name={`items.${index}.max`} label="Max" />
                  </>
                )}
                <SwitchField
                  control={form.control}
                  name={`items.${index}.optional`}
                  label="Không bắt buộc"
                />
              </li>
            ))}
          </ol>
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              items.append({
                key: '',
                label: '',
                type: 'check',
                unit: '',
                min: '',
                max: '',
                optional: false,
              })
            }
          >
            Thêm mục
          </Button>
          {canWrite && <Button type="submit">Lưu</Button>}
        </form>
      </Form>
    </>
  )
}
