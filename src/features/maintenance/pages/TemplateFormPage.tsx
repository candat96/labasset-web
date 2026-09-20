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
import { apiBody } from '@/api/client'
import { catalogOptions, resolveCatalogItem } from '@/api/references'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { useConfirm } from '@/components/confirm-dialog'
import { cloneTemplate, createTemplate, deleteTemplate, updateTemplate } from '../api'
import { useInvalidateTemplates, useTemplate } from '../hooks'
import { templateSchema, type TemplateForm } from '../schema'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation('maintenance')

  const { id = '' } = useParams()
  const editing = !!id
  const navigate = useNavigate()
  const canWrite = useCan(STAFF)
  const detail = useTemplate(id)
  const invalidate = useInvalidateTemplates()
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
  if (editing && detail.isPending) return <p role="status">{t('loadingTemplate')}</p>
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
        await updateTemplate(id, apiBody(body))
        toast.success(t('templateSaved'))
        void invalidate()
        return
      }
      const created = await createTemplate(apiBody(body))
      toast.success(t('templateCreated'))
      void invalidate()
      navigate(`/maintenance/templates/${created.id}/edit`)
    } catch (error) {
      if (!applyServerErrors(form, error)) toast.error(messageFor(error))
    }
  }
  return (
    <>
      {dialog}
      <PageHeader
        title={editing ? t('editTemplate') : t('createTemplateTitle')}
        actions={
          editing &&
          canWrite && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  const cloned = await cloneTemplate(id)
                  toast.success(t('templateCloned'))
                  void invalidate()
                  navigate(`/maintenance/templates/${cloned.id}/edit`)
                }}
              >
                {t('clone')}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  if (
                    (await confirm({ title: t('deleteTemplateConfirm'), destructive: true })) ===
                    false
                  )
                    return
                  try {
                    await deleteTemplate(id)
                    toast.success(t('templateDeleted'))
                    void invalidate()
                    navigate('/maintenance/templates')
                  } catch (error) {
                    toast.error(
                      isApiError(error) && error.status === 409
                        ? t('templateInUse')
                        : messageFor(error),
                    )
                  }
                }}
              >
                {t('delete')}
              </Button>
            </div>
          )
        }
      />
      <Form {...form}>
        <form className="max-w-3xl space-y-4" noValidate onSubmit={form.handleSubmit(submit)}>
          <TextField control={form.control} name="name" label={t('name')} />
          <FormField
            control={form.control}
            name="groupId"
            render={({ field }) => (
              <FormItem>
                <AsyncSelect
                  label={t('equipmentGroup')}
                  queryKey="equipment-groups"
                  loadOptions={(q) => catalogOptions('equipment-groups', q)}
                  resolveOption={(groupId) => resolveCatalogItem('equipment-groups', groupId)}
                  value={field.value}
                  onChange={field.onChange}
                  clearable
                />
                <FormMessage />
              </FormItem>
            )}
          />
          <TextField control={form.control} name="model" label="Model" />
          <SwitchField control={form.control} name="isActive" label={t('isActive')} />
          <ol className="space-y-3">
            {items.fields.map((field, index) => (
              <li key={field.id} className="space-y-2 rounded border p-3">
                <div className="flex justify-between">
                  <p className="font-medium">
                    {t('item')} {index + 1}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={index === 0}
                      onClick={() => items.move(index, index - 1)}
                    >
                      {t('moveUp')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={index === items.fields.length - 1}
                      onClick={() => items.move(index, index + 1)}
                    >
                      {t('moveDown')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => items.remove(index)}
                    >
                      {t('delete')}
                    </Button>
                  </div>
                </div>
                <TextField
                  control={form.control}
                  name={`items.${index}.label`}
                  label={t('itemLabel')}
                />
                <SelectField
                  control={form.control}
                  name={`items.${index}.type`}
                  label={t('itemType')}
                  options={[
                    { value: 'check', label: t('optionCheck') },
                    { value: 'measure', label: t('optionMeasure') },
                    { value: 'text', label: t('optionText') },
                  ]}
                />
                {form.watch(`items.${index}.type`) === 'measure' && (
                  <>
                    <TextField
                      control={form.control}
                      name={`items.${index}.unit`}
                      label={t('unit')}
                    />
                    <NumberField control={form.control} name={`items.${index}.min`} label="Min" />
                    <NumberField control={form.control} name={`items.${index}.max`} label="Max" />
                  </>
                )}
                <SwitchField
                  control={form.control}
                  name={`items.${index}.optional`}
                  label={t('optional')}
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
            {t('addItem')}
          </Button>
          {canWrite && <Button type="submit">{t('save')}</Button>}
        </form>
      </Form>
    </>
  )
}
