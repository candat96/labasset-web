import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { Button } from '@/components/ui/button'
import { Form } from '@/components/ui/form'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { TextField, NumberField } from '@/components/form/fields'
import { DateField } from '@/components/form/date-field'
import { MoneyField } from '@/components/form/money-field'
import { AsyncSelect } from '@/components/form/async-select'
import { AttachmentsPanel } from '@/components/attachments-panel'
import { applyServerErrors, isApiError, messageFor } from '@/api/errors'
import { departmentOptions } from '@/api/references'
import {
  catalogOptions,
  createEquipment,
  emptyToNull,
  updateEquipment,
  userOptions,
  diffUpdate,
} from '../api'
import { useEquipment } from '../hooks'
import { equipmentSchema, type EquipmentForm } from '../schema'
import type { CreateEquipment, UpdateEquipment } from '../types'

const empty: EquipmentForm = {
  code: '',
  name: '',
  model: '',
  serial: '',
  assetCode: '',
  manufacturerId: null,
  supplierId: null,
  countryOfOrigin: '',
  manufactureYear: '',
  receivedAt: '',
  commissionedAt: '',
  fundingSourceId: null,
  originalValue: '',
  warrantyUntil: '',
  purchaseContractNo: '',
  decisionNo: '',
  groupId: null,
  departmentId: null,
  location: '',
  deptContactUserId: null,
  staffInChargeUserId: null,
  testTypes: '',
  throughputPerHour: '',
  notes: '',
  specs: {
    voltage: '',
    power: '',
    dimensions: '',
    weight: '',
    env: { temp: '', humidity: '', ups: '', water: '', gas: '' },
  },
}

function fromDetail(data: NonNullable<ReturnType<typeof useEquipment>['data']>): EquipmentForm {
  return {
    code: data.code,
    name: data.name,
    model: data.model ?? '',
    serial: data.serial ?? '',
    assetCode: data.assetCode ?? '',
    manufacturerId: data.manufacturerId,
    supplierId: data.supplierId,
    countryOfOrigin: data.countryOfOrigin ?? '',
    manufactureYear: data.manufactureYear ?? '',
    receivedAt: data.receivedAt ?? '',
    commissionedAt: data.commissionedAt ?? '',
    fundingSourceId: data.fundingSourceId,
    originalValue: data.originalValue ?? '',
    warrantyUntil: data.warrantyUntil ?? '',
    purchaseContractNo: data.purchaseContractNo ?? '',
    decisionNo: data.decisionNo ?? '',
    groupId: data.groupId,
    departmentId: data.departmentId,
    location: data.location ?? '',
    deptContactUserId: data.deptContactUserId,
    staffInChargeUserId: data.staffInChargeUserId,
    testTypes: data.testTypes.join(', '),
    throughputPerHour: data.throughputPerHour ?? '',
    notes: data.notes ?? '',
    specs: {
      voltage: data.specs?.voltage ?? '',
      power: data.specs?.power ?? '',
      dimensions: data.specs?.dimensions ?? '',
      weight: data.specs?.weight ?? '',
      env: {
        temp: data.specs?.env?.temp ?? '',
        humidity: data.specs?.env?.humidity ?? '',
        ups: data.specs?.env?.ups ?? '',
        water: data.specs?.env?.water ?? '',
        gas: data.specs?.env?.gas ?? '',
      },
    },
  }
}

function toBody(values: EquipmentForm): CreateEquipment {
  const specs = emptyToNull({
    voltage: values.specs.voltage,
    power: values.specs.power,
    dimensions: values.specs.dimensions,
    weight: values.specs.weight,
    env: emptyToNull({ ...values.specs.env }),
  })
  return emptyToNull({
    code: values.code || undefined,
    name: values.name,
    model: values.model,
    serial: values.serial,
    assetCode: values.assetCode,
    manufacturerId: values.manufacturerId,
    supplierId: values.supplierId,
    countryOfOrigin: values.countryOfOrigin,
    manufactureYear: values.manufactureYear === '' ? null : values.manufactureYear,
    receivedAt: values.receivedAt,
    commissionedAt: values.commissionedAt,
    fundingSourceId: values.fundingSourceId,
    originalValue: values.originalValue,
    warrantyUntil: values.warrantyUntil,
    purchaseContractNo: values.purchaseContractNo,
    decisionNo: values.decisionNo,
    groupId: values.groupId,
    departmentId: values.departmentId,
    location: values.location,
    deptContactUserId: values.deptContactUserId,
    staffInChargeUserId: values.staffInChargeUserId,
    testTypes: values.testTypes
      ? values.testTypes
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
    throughputPerHour: values.throughputPerHour === '' ? null : values.throughputPerHour,
    notes: values.notes,
    specs,
  }) as CreateEquipment
}

function SelectRef({
  control,
  name,
  label,
  queryKey,
  load,
}: {
  control: ReturnType<typeof useForm<EquipmentForm>>['control']
  name:
    | 'manufacturerId'
    | 'supplierId'
    | 'fundingSourceId'
    | 'groupId'
    | 'departmentId'
    | 'deptContactUserId'
    | 'staffInChargeUserId'
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
  const editing = Boolean(id)
  const navigate = useNavigate()
  const detail = useEquipment(id)
  const form = useForm<EquipmentForm>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: empty,
    mode: 'onBlur',
  })
  useEffect(() => {
    if (detail.data) form.reset(fromDetail(detail.data))
  }, [detail.data, form])
  if (editing && detail.isPending) return <p role="status">Đang tải máy…</p>
  if (editing && detail.error)
    return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const submit = async (values: EquipmentForm) => {
    try {
      const body = toBody(values)
      if (editing) {
        const before = toBody(fromDetail(detail.data!))
        const after = { ...body }
        const prev = { ...before }
        delete (after as { departmentId?: string | null }).departmentId
        delete (prev as { departmentId?: string | null }).departmentId
        const patch = diffUpdate(prev as UpdateEquipment, after as UpdateEquipment)
        if (Object.keys(patch).length) await updateEquipment(id, patch)
        toast.success('Đã lưu máy')
        navigate(`/equipment/${id}`)
      } else {
        const created = await createEquipment(body)
        toast.success('Đã tạo máy')
        navigate(`/equipment/${created.id}`)
      }
    } catch (error) {
      if (isApiError(error) && error.code === 'EQUIPMENT_CODE_TAKEN')
        form.setError('code', { type: 'server', message: messageFor(error) })
      else if (isApiError(error) && error.code === 'EQUIPMENT_SERIAL_TAKEN')
        form.setError('serial', { type: 'server', message: messageFor(error) })
      else if (!applyServerErrors(form, error)) toast.error(messageFor(error))
    }
  }
  return (
    <>
      <PageHeader title={editing ? 'Sửa máy' : 'Thêm máy'} />
      <Form {...form}>
        <form className="max-w-3xl space-y-4" noValidate onSubmit={form.handleSubmit(submit)}>
          <details open className="rounded-lg border p-4">
            <summary className="cursor-pointer font-medium">Thông tin chung</summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <TextField
                control={form.control}
                name="code"
                label="Mã máy"
                description="Để trống để hệ thống tự sinh TB-YYYY-xxxxx"
                transform={(value) => value.toUpperCase()}
              />
              <TextField control={form.control} name="name" label="Tên" />
              <TextField control={form.control} name="model" label="Model" />
              <TextField control={form.control} name="serial" label="Serial" />
              <TextField control={form.control} name="assetCode" label="Mã tài sản" />
              <SelectRef
                control={form.control}
                name="manufacturerId"
                label="Hãng"
                queryKey="manufacturers"
                load={(q) => catalogOptions('manufacturers', q)}
              />
              <SelectRef
                control={form.control}
                name="supplierId"
                label="Nhà cung cấp"
                queryKey="suppliers"
                load={(q) => catalogOptions('suppliers', q)}
              />
              <TextField control={form.control} name="countryOfOrigin" label="Xuất xứ" />
              <NumberField
                control={form.control}
                name="manufactureYear"
                label="Năm sản xuất"
                min={1900}
              />
              <DateField control={form.control} name="receivedAt" label="Ngày nhận" />
              <DateField
                control={form.control}
                name="commissionedAt"
                label="Ngày đưa vào sử dụng"
              />
              <SelectRef
                control={form.control}
                name="fundingSourceId"
                label="Nguồn vốn"
                queryKey="funding-sources"
                load={(q) => catalogOptions('funding-sources', q)}
              />
              <MoneyField control={form.control} name="originalValue" label="Nguyên giá" />
              <DateField control={form.control} name="warrantyUntil" label="Bảo hành đến" />
              <TextField control={form.control} name="purchaseContractNo" label="Số hợp đồng" />
              <TextField control={form.control} name="decisionNo" label="Số quyết định" />
              <SelectRef
                control={form.control}
                name="groupId"
                label="Nhóm máy"
                queryKey="equipment-groups"
                load={(q) => catalogOptions('equipment-groups', q)}
              />
              {!editing && (
                <SelectRef
                  control={form.control}
                  name="departmentId"
                  label="Khoa"
                  queryKey="departments"
                  load={departmentOptions}
                />
              )}
              <TextField control={form.control} name="location" label="Vị trí" />
              <SelectRef
                control={form.control}
                name="deptContactUserId"
                label="Liên hệ khoa"
                queryKey="dept-users"
                load={userOptions}
              />
              <SelectRef
                control={form.control}
                name="staffInChargeUserId"
                label="Phụ trách VT"
                queryKey="staff"
                load={userOptions}
              />
              <TextField
                control={form.control}
                name="testTypes"
                label="Loại xét nghiệm"
                description="Phân tách bằng dấu phẩy"
              />
              <NumberField
                control={form.control}
                name="throughputPerHour"
                label="Công suất / giờ"
                min={0}
              />
              <div className="sm:col-span-2">
                <TextField control={form.control} name="notes" label="Ghi chú" />
              </div>
            </div>
          </details>
          <details open className="rounded-lg border p-4">
            <summary className="cursor-pointer font-medium">Thông số kỹ thuật</summary>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <TextField control={form.control} name="specs.voltage" label="Điện áp" />
              <TextField control={form.control} name="specs.power" label="Công suất" />
              <TextField control={form.control} name="specs.dimensions" label="Kích thước" />
              <TextField control={form.control} name="specs.weight" label="Khối lượng" />
              <TextField control={form.control} name="specs.env.temp" label="Nhiệt độ môi trường" />
              <TextField control={form.control} name="specs.env.humidity" label="Độ ẩm" />
              <TextField control={form.control} name="specs.env.ups" label="UPS" />
              <TextField control={form.control} name="specs.env.water" label="Nước" />
              <TextField control={form.control} name="specs.env.gas" label="Khí" />
            </div>
          </details>
          {editing && (
            <details open className="rounded-lg border p-4">
              <summary className="cursor-pointer font-medium">Ảnh đại diện</summary>
              <div className="mt-4">
                <AttachmentsPanel
                  entityType="equipment"
                  entityId={id}
                  kinds={[{ value: 'photo', label: 'Ảnh' }]}
                />
              </div>
            </details>
          )}
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
