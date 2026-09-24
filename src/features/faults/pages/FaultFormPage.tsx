import { DetailSkeleton } from '@/components/page/DetailSkeleton'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useForm, useFieldArray, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { FormFooter } from '@/components/page/FormFooter'
import { ErrorState } from '@/components/page/ErrorState'
import { DeleteIconButton } from '@/components/icon-action'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { TextField, NumberField, SelectField } from '@/components/form/fields'
import { FileField } from '@/components/form/file-field'
import { AsyncSelect } from '@/components/form/async-select'
import { Textarea } from '@/components/ui/textarea'
import { applyServerErrors, messageFor } from '@/api/errors'
import { catalogOptions, resolveCatalogItem, supplyOptions } from '@/api/references'
import { getFileUrl } from '@/api/files'
import { faultSeverityMap } from '@/lib/status-maps'
import { createFault, diffUpdate, emptyToNull, updateFault } from '../api'
import { useFault } from '../hooks'
import { faultSchema, type FaultForm } from '../schema'
import type { CreateFault, FaultDetail, UpdateFault } from '../types'
import { FAULT_SEVERITIES } from '../types'

const empty: FaultForm = {
  scope: 'all',
  model: '',
  groupId: null,
  manufacturerId: null,
  errorCode: '',
  title: '',
  symptoms: '',
  causes: '',
  severity: 'medium',
  estMinutes: '',
  faultGroupId: null,
  steps: [],
  parts: [],
}

function fromDetail(data: FaultDetail): FaultForm {
  return {
    scope: data.scope,
    model: data.model ?? '',
    groupId: data.groupId,
    manufacturerId: data.manufacturerId,
    errorCode: data.errorCode ?? '',
    title: data.title,
    symptoms: data.symptoms ?? '',
    causes: data.causes ?? '',
    severity: data.severity,
    estMinutes: data.estMinutes ?? '',
    faultGroupId: data.faultGroupId,
    steps: data.steps
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((step) => ({
        order: step.order,
        instruction: step.instruction,
        expectedResult: step.expectedResult ?? '',
        cautions: step.cautions ?? '',
        imageFileId: step.imageFileId ?? null,
      })),
    parts: data.parts.map((part) => ({
      name: part.name,
      quantity: part.quantity,
      note: part.note ?? '',
      componentTypeId: part.componentTypeId ?? null,
      supplyId: part.supplyId ?? null,
    })),
  }
}

function toBody(values: FaultForm): CreateFault {
  return emptyToNull({
    scope: values.scope,
    model: values.scope === 'model' ? values.model : null,
    groupId: values.scope === 'group' ? values.groupId : null,
    manufacturerId: values.manufacturerId,
    errorCode: values.errorCode,
    title: values.title,
    symptoms: values.symptoms,
    causes: values.causes,
    severity: values.severity,
    estMinutes: values.estMinutes === '' ? null : values.estMinutes,
    faultGroupId: values.faultGroupId,
    steps: values.steps.map((step, index) =>
      emptyToNull({
        order: index + 1,
        instruction: step.instruction,
        expectedResult: step.expectedResult,
        cautions: step.cautions,
        imageFileId: step.imageFileId,
      }),
    ),
    parts: values.parts.map((part) =>
      emptyToNull({
        name: part.name,
        quantity: part.quantity,
        note: part.note,
        componentTypeId: part.componentTypeId,
        supplyId: part.supplyId,
      }),
    ),
  }) as CreateFault
}

type CatalogSlug = Parameters<typeof resolveCatalogItem>[0]

function SelectRef({
  control,
  name,
  label,
  queryKey,
  slug,
}: {
  control: Control<FaultForm>
  name: 'groupId' | 'manufacturerId' | 'faultGroupId'
  label: string
  queryKey: string
  slug: CatalogSlug
}) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <AsyncSelect
            label={label}
            queryKey={queryKey}
            loadOptions={(q) => catalogOptions(slug, q)}
            resolveOption={(id) => resolveCatalogItem(slug, id)}
            value={field.value}
            onChange={field.onChange}
            clearable
          />
          <FormMessage />
        </FormItem>
      )}
    />
  )
}

/** Ảnh bước đã tải: hiện thumbnail nhỏ cạnh FileField. */
function StepImagePreview({ fileId }: { fileId: string | null }) {
  const url = useQuery({
    queryKey: ['file-url', fileId, true],
    queryFn: () => getFileUrl(fileId!, true),
    enabled: !!fileId,
    staleTime: 600_000,
  })
  if (!fileId || !url.data) return null
  return <img src={url.data.url} alt="" className="mt-1 size-20 rounded object-cover" />
}

export function Component() {
  const { t } = useTranslation('faults')
  const { id = '' } = useParams()
  const editing = !!id
  const navigate = useNavigate()
  const detail = useFault(id)
  const form = useForm<FaultForm>({
    resolver: zodResolver(faultSchema),
    defaultValues: empty,
  })
  const steps = useFieldArray({ control: form.control, name: 'steps' })
  const parts = useFieldArray({ control: form.control, name: 'parts' })
  const scope = form.watch('scope')
  useEffect(() => {
    if (detail.data) form.reset(fromDetail(detail.data))
  }, [detail.data, form])
  useEffect(() => {
    if (detail.data?.status === 'published') toast.warning(t('form.publishedWarning'))
  }, [detail.data?.status, t])
  if (editing && detail.isPending) return <DetailSkeleton label={t('form.loading')} />
  if (editing && detail.error)
    return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const submit = async (values: FaultForm) => {
    try {
      const body = toBody(values)
      if (editing) {
        const before = toBody(fromDetail(detail.data!))
        const patch = diffUpdate(before as UpdateFault, body as UpdateFault)
        if (Object.keys(patch).length) await updateFault(id, patch)
        toast.success(t('form.saved'))
        navigate(`/faults/${id}`)
      } else {
        const created = await createFault(body)
        toast.success(t('form.created'))
        navigate(`/faults/${created.id}`)
      }
    } catch (error) {
      if (!applyServerErrors(form, error)) toast.error(messageFor(error))
    }
  }
  return (
    <>
      <PageHeader
        eyebrow={t('title', { defaultValue: 'Thư viện lỗi' })}
        title={editing ? t('edit') : t('create')}
        description={t('form.hint', {
          defaultValue: 'Mô tả triệu chứng, nguyên nhân và các bước xử lý để tra cứu về sau.',
        })}
      />
      <Form {...form}>
        <form className="space-y-5" noValidate onSubmit={form.handleSubmit(submit)}>
          <SectionCard title={t('form.info')}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FormField
                control={form.control}
                name="scope"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>{t('form.scope')}</FormLabel>
                    <div className="flex flex-wrap gap-4">
                      {(['model', 'group', 'all'] as const).map((value) => (
                        <label key={value} className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name={field.name}
                            value={value}
                            checked={field.value === value}
                            onChange={() => field.onChange(value)}
                          />
                          {t(`scope.${value}`)}
                        </label>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {scope === 'model' && (
                <TextField control={form.control} name="model" label={t('form.model')} />
              )}
              {scope === 'group' && (
                <SelectRef
                  control={form.control}
                  name="groupId"
                  label={t('form.group')}
                  queryKey="equipment-groups"
                  slug="equipment-groups"
                />
              )}
              <SelectRef
                control={form.control}
                name="manufacturerId"
                label={t('form.manufacturer')}
                queryKey="manufacturers"
                slug="manufacturers"
              />
              <TextField control={form.control} name="errorCode" label={t('form.errorCode')} />
              <TextField control={form.control} name="title" label={t('form.title')} />
              <SelectField
                control={form.control}
                name="severity"
                label={t('form.severity')}
                options={FAULT_SEVERITIES.map((item) => ({
                  value: item,
                  label: faultSeverityMap[item]?.label ?? item,
                }))}
              />
              <NumberField
                control={form.control}
                name="estMinutes"
                label={t('form.estMinutes')}
                min={0}
              />
              <SelectRef
                control={form.control}
                name="faultGroupId"
                label={t('form.faultGroup')}
                queryKey="fault-groups"
                slug="fault-groups"
              />
              <FormField
                control={form.control}
                name="symptoms"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>{t('form.symptoms')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="causes"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>{t('form.causes')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </SectionCard>
          <SectionCard title={t('form.steps')}>
            <ol className="space-y-4">
              {steps.fields.map((field, index) => (
                <li key={field.id} className="border-divider space-y-3 rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{t('form.step', { n: index + 1 })}</p>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={index === 0}
                        onClick={() => steps.move(index, index - 1)}
                      >
                        {t('form.up')}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={index === steps.fields.length - 1}
                        onClick={() => steps.move(index, index + 1)}
                      >
                        {t('form.down')}
                      </Button>
                      <DeleteIconButton onClick={() => steps.remove(index)} />
                    </div>
                  </div>
                  <TextField
                    control={form.control}
                    name={`steps.${index}.instruction`}
                    label={t('form.instruction')}
                  />
                  <TextField
                    control={form.control}
                    name={`steps.${index}.expectedResult`}
                    label={t('form.expectedResult')}
                  />
                  <TextField
                    control={form.control}
                    name={`steps.${index}.cautions`}
                    label={t('form.cautions')}
                  />
                  <FormField
                    control={form.control}
                    name={`steps.${index}.imageFileId`}
                    render={({ field }) => (
                      <FormItem>
                        <FileField
                          label={t('form.stepImage')}
                          accept="image/*"
                          value={field.value}
                          onChange={field.onChange}
                        />
                        <StepImagePreview fileId={field.value} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </li>
              ))}
            </ol>
            <Button
              type="button"
              className="mt-3"
              variant="outline"
              onClick={() =>
                steps.append({
                  order: steps.fields.length + 1,
                  instruction: '',
                  expectedResult: '',
                  cautions: '',
                  imageFileId: null,
                })
              }
            >
              {t('form.addStep')}
            </Button>
          </SectionCard>
          <SectionCard title={t('form.parts')}>
            <ul className="mt-4 space-y-4">
              {parts.fields.map((field, index) => (
                <li key={field.id} className="border-divider space-y-3 rounded-xl border p-4">
                  <div className="flex justify-end">
                    <DeleteIconButton onClick={() => parts.remove(index)} />
                  </div>
                  <TextField
                    control={form.control}
                    name={`parts.${index}.name`}
                    label={t('form.partName')}
                  />
                  <NumberField
                    control={form.control}
                    name={`parts.${index}.quantity`}
                    label={t('form.quantity')}
                    min={1}
                    step={1}
                  />
                  <FormField
                    control={form.control}
                    name={`parts.${index}.supplyId`}
                    render={({ field: f }) => (
                      <FormItem>
                        <AsyncSelect
                          label={t('form.supply')}
                          queryKey="supplies"
                          loadOptions={supplyOptions}
                          value={f.value}
                          onChange={f.onChange}
                          clearable
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`parts.${index}.componentTypeId`}
                    render={({ field: f }) => (
                      <FormItem>
                        <AsyncSelect
                          label={t('form.componentType')}
                          queryKey="component-types"
                          loadOptions={(q) => catalogOptions('component-types', q)}
                          resolveOption={(id) => resolveCatalogItem('component-types', id)}
                          value={f.value}
                          onChange={f.onChange}
                          clearable
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <TextField
                    control={form.control}
                    name={`parts.${index}.note`}
                    label={t('form.note')}
                  />
                </li>
              ))}
            </ul>
            <Button
              type="button"
              className="mt-3"
              variant="outline"
              onClick={() =>
                parts.append({
                  name: '',
                  quantity: 1,
                  note: '',
                  componentTypeId: null,
                  supplyId: null,
                })
              }
            >
              {t('form.addPart')}
            </Button>
          </SectionCard>
          <FormFooter onCancel={() => navigate(-1)} submitting={form.formState.isSubmitting} />
        </form>
      </Form>
    </>
  )
}
