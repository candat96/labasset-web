import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { TextField, NumberField, SelectField } from '@/components/form/fields'
import { FileField } from '@/components/form/file-field'
import { AsyncSelect } from '@/components/form/async-select'
import { Textarea } from '@/components/ui/textarea'
import { applyServerErrors, messageFor } from '@/api/errors'
import { catalogOptions, supplyOptions } from '@/api/references'
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
        quantity: part.quantity === '' ? 1 : part.quantity,
        note: part.note,
        componentTypeId: part.componentTypeId,
        supplyId: part.supplyId,
      }),
    ),
  }) as CreateFault
}

function SelectRef({
  control,
  name,
  label,
  queryKey,
  load,
}: {
  control: ReturnType<typeof useForm<FaultForm>>['control']
  name: 'groupId' | 'manufacturerId' | 'faultGroupId'
  label: string
  queryKey: string
  load: (q: string) => Promise<{ id: string; code: string; name: string }[]>
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
            loadOptions={load}
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

export function Component() {
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
    if (detail.data?.status === 'published')
      toast.warning('Sửa lỗi đã ban hành sẽ tạo phiên bản mới')
  }, [detail.data?.status])
  if (editing && detail.isPending) return <p role="status">Đang tải lỗi…</p>
  if (editing && detail.error)
    return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const submit = async (values: FaultForm) => {
    try {
      const body = toBody(values)
      if (editing) {
        const before = toBody(fromDetail(detail.data!))
        const patch = diffUpdate(before as UpdateFault, body as UpdateFault)
        if (Object.keys(patch).length) await updateFault(id, patch)
        toast.success('Đã lưu lỗi')
        navigate(`/faults/${id}`)
      } else {
        const created = await createFault(body)
        toast.success('Đã tạo lỗi')
        navigate(`/faults/${created.id}`)
      }
    } catch (error) {
      if (!applyServerErrors(form, error)) toast.error(messageFor(error))
    }
  }
  return (
    <>
      <PageHeader title={editing ? 'Sửa lỗi' : 'Thêm lỗi'} />
      <Form {...form}>
        <form className="max-w-3xl space-y-4" noValidate onSubmit={form.handleSubmit(submit)}>
          <details open className="rounded-lg border p-4">
            <summary className="cursor-pointer font-medium">Thông tin</summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="scope"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Phạm vi</FormLabel>
                    <div className="flex flex-wrap gap-4">
                      {(
                        [
                          ['model', 'Model'],
                          ['group', 'Nhóm'],
                          ['all', 'Tất cả'],
                        ] as const
                      ).map(([value, label]) => (
                        <label key={value} className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name={field.name}
                            value={value}
                            checked={field.value === value}
                            onChange={() => field.onChange(value)}
                          />
                          {label}
                        </label>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {scope === 'model' && <TextField control={form.control} name="model" label="Model" />}
              {scope === 'group' && (
                <SelectRef
                  control={form.control}
                  name="groupId"
                  label="Nhóm máy"
                  queryKey="equipment-groups"
                  load={(q) => catalogOptions('equipment-groups', q)}
                />
              )}
              <SelectRef
                control={form.control}
                name="manufacturerId"
                label="Hãng"
                queryKey="manufacturers"
                load={(q) => catalogOptions('manufacturers', q)}
              />
              <TextField control={form.control} name="errorCode" label="Mã lỗi" />
              <TextField control={form.control} name="title" label="Tiêu đề" />
              <SelectField
                control={form.control}
                name="severity"
                label="Mức độ"
                options={FAULT_SEVERITIES.map((item) => ({
                  value: item,
                  label: faultSeverityMap[item]?.label ?? item,
                }))}
              />
              <NumberField
                control={form.control}
                name="estMinutes"
                label="Thời gian ước tính (phút)"
                min={0}
              />
              <SelectRef
                control={form.control}
                name="faultGroupId"
                label="Nhóm lỗi"
                queryKey="fault-groups"
                load={(q) => catalogOptions('fault-groups', q)}
              />
              <FormField
                control={form.control}
                name="symptoms"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Triệu chứng</FormLabel>
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
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Nguyên nhân</FormLabel>
                    <FormControl>
                      <Textarea {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </details>
          <details open className="rounded-lg border p-4">
            <summary className="cursor-pointer font-medium">Các bước xử lý</summary>
            <ol className="mt-4 space-y-4">
              {steps.fields.map((field, index) => (
                <li key={field.id} className="space-y-3 rounded-md border p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Bước {index + 1}</p>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={index === 0}
                        onClick={() => steps.move(index, index - 1)}
                      >
                        Lên
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={index === steps.fields.length - 1}
                        onClick={() => steps.move(index, index + 1)}
                      >
                        Xuống
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => steps.remove(index)}
                      >
                        Xoá
                      </Button>
                    </div>
                  </div>
                  <TextField
                    control={form.control}
                    name={`steps.${index}.instruction`}
                    label="Hướng dẫn"
                  />
                  <TextField
                    control={form.control}
                    name={`steps.${index}.expectedResult`}
                    label="Kết quả kỳ vọng"
                  />
                  <TextField
                    control={form.control}
                    name={`steps.${index}.cautions`}
                    label="Lưu ý"
                  />
                  <FormField
                    control={form.control}
                    name={`steps.${index}.imageFileId`}
                    render={({ field }) => (
                      <FormItem>
                        <FileField
                          label="Ảnh bước"
                          accept="image/*"
                          value={field.value}
                          onChange={field.onChange}
                        />
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
              Thêm bước
            </Button>
          </details>
          <details open className="rounded-lg border p-4">
            <summary className="cursor-pointer font-medium">Linh kiện/vật tư thường cần</summary>
            <ul className="mt-4 space-y-4">
              {parts.fields.map((field, index) => (
                <li key={field.id} className="space-y-3 rounded-md border p-3">
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => parts.remove(index)}
                    >
                      Xoá
                    </Button>
                  </div>
                  <TextField control={form.control} name={`parts.${index}.name`} label="Tên" />
                  <NumberField
                    control={form.control}
                    name={`parts.${index}.quantity`}
                    label="Số lượng"
                    min={0}
                    step={0.001}
                  />
                  <FormField
                    control={form.control}
                    name={`parts.${index}.supplyId`}
                    render={({ field: f }) => (
                      <FormItem>
                        <AsyncSelect
                          label="Vật tư"
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
                          label="Loại linh kiện"
                          queryKey="component-types"
                          loadOptions={(q) => catalogOptions('component-types', q)}
                          value={f.value}
                          onChange={f.onChange}
                          clearable
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <TextField control={form.control} name={`parts.${index}.note`} label="Ghi chú" />
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
              Thêm linh kiện
            </Button>
          </details>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => navigate(-1)}>
              Huỷ
            </Button>
            <Button type="submit">Lưu</Button>
          </div>
        </form>
      </Form>
    </>
  )
}
