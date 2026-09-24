import { DetailSkeleton } from '@/components/page/DetailSkeleton'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { FormFooter } from '@/components/page/FormFooter'
import { ErrorState } from '@/components/page/ErrorState'
import { Form } from '@/components/ui/form'
import { TextField, NumberField } from '@/components/form/fields'
import { DateField } from '@/components/form/date-field'
import { MoneyField } from '@/components/form/money-field'
import { AsyncSelectField } from '../components/async-select-field'
import { AttachmentsPanel } from '@/components/attachments-panel'
import {
  resolveCatalogItem,
  resolveDepartment,
  resolveRoom,
  resolveUser,
  departmentOptions,
  roomOptions,
} from '@/api/references'
import { RoomFormDialog } from '@/components/room-form-dialog'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import type { ReferenceOption } from '@/components/form/async-select'
import { applyServerErrors, isApiError, messageFor } from '@/api/errors'
import {
  catalogOptions,
  createEquipment,
  emptyToNull,
  updateEquipment,
  userOptions,
  diffUpdate,
} from '../api'
import { useEquipment, useInvalidateEquipment } from '../hooks'
import { equipmentCreateSchema, equipmentSchema, type EquipmentForm } from '../schema'
import type { CreateEquipment } from '../types'

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
  circulationNo: '',
  groupId: null,
  departmentId: null,
  roomId: null,
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
    circulationNo: data.circulationNo ?? '',
    groupId: data.groupId,
    departmentId: data.departmentId,
    roomId: data.roomId,
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

/** `includeIdentity=false` khi PATCH: `UpdateEquipmentDto` không nhận `code`/`departmentId`. */
function toBody(values: EquipmentForm, includeIdentity = true): CreateEquipment {
  const body: Record<string, unknown> = {
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
    circulationNo: values.circulationNo,
    groupId: values.groupId,
    roomId: values.roomId,
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
    specs: emptyToNull({
      voltage: values.specs.voltage,
      power: values.specs.power,
      dimensions: values.specs.dimensions,
      weight: values.specs.weight,
      env: emptyToNull({ ...values.specs.env }),
    }),
  }
  if (includeIdentity) {
    body.code = values.code || undefined
    body.departmentId = values.departmentId
  }
  return emptyToNull(body) as CreateEquipment
}

const catalogOption = (
  row?: { id: string; code: string; name: string } | null,
): ReferenceOption[] => (row ? [row] : [])
const userOption = (
  row?: { id: string; username: string; fullName: string } | null,
): ReferenceOption[] => (row ? [{ id: row.id, code: row.username, name: row.fullName }] : [])

export function Component() {
  const { t } = useTranslation('equipment')
  const { id = '' } = useParams()
  const editing = Boolean(id)
  const navigate = useNavigate()
  const detail = useEquipment(id)
  const invalidate = useInvalidateEquipment(editing ? id : undefined)
  const canQuickRoom = useCan(STAFF)
  const form = useForm<EquipmentForm>({
    resolver: zodResolver(editing ? equipmentSchema : equipmentCreateSchema),
    defaultValues: empty,
    mode: 'onBlur',
  })
  useEffect(() => {
    if (detail.data) form.reset(fromDetail(detail.data))
  }, [detail.data, form])
  // Phòng phụ thuộc Khoa/Phòng ban: đổi khoa (chỉ có khi tạo mới) → xoá phòng đã chọn.
  const departmentId = form.watch('departmentId')
  useEffect(() => {
    if (!editing && form.getValues('roomId')) form.setValue('roomId', null, { shouldDirty: true })
  }, [departmentId, editing, form])
  const [roomDialog, setRoomDialog] = useState(false)
  if (editing && detail.isPending) return <DetailSkeleton label={t('loading')} />
  if (editing && detail.error)
    return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const company = detail.data
  const submit = async (values: EquipmentForm) => {
    try {
      if (editing) {
        const before = toBody(fromDetail(detail.data!), false)
        const patch = diffUpdate(before, toBody(values, false))
        if (Object.keys(patch).length) await updateEquipment(id, patch)
        invalidate()
        toast.success(t('toasts.saved'))
        navigate(`/equipment/${id}`)
      } else {
        const created = await createEquipment(toBody(values))
        invalidate()
        toast.success(t('toasts.createdWithCode', { code: created.code }))
        navigate(`/equipment/${created.id}`)
      }
    } catch (error) {
      if (isApiError(error) && error.code === 'EQUIPMENT_CODE_TAKEN')
        form.setError('code', { type: 'server', message: messageFor(error) })
      else if (isApiError(error) && error.code === 'EQUIPMENT_SERIAL_TAKEN')
        form.setError('serial', { type: 'server', message: messageFor(error) })
      else if (isApiError(error) && error.code === 'ROOM_DEPARTMENT_MISMATCH')
        form.setError('roomId', { type: 'server', message: messageFor(error) })
      else if (!applyServerErrors(form, error)) toast.error(messageFor(error))
    }
  }
  return (
    <>
      <PageHeader
        eyebrow={t('title', { defaultValue: 'Hồ sơ thiết bị' })}
        title={editing ? t('editTitle') : t('create')}
        description={t('formHint', {
          defaultValue: 'Nhập thông tin chung, thông số kỹ thuật; các trường có * là bắt buộc.',
        })}
      />
      <Form {...form}>
        <form className="space-y-5" noValidate onSubmit={form.handleSubmit(submit)}>
          <SectionCard title={t('sections.general')}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <TextField
                control={form.control}
                name="code"
                label={t('fields.equipmentCode')}
                description={editing ? t('fields.codeLocked') : t('fields.codeHint')}
                disabled={editing}
                transform={(value) => value.toUpperCase()}
              />
              <TextField control={form.control} name="name" label={t('fields.name')} />
              <TextField control={form.control} name="model" label={t('fields.model')} />
              <TextField control={form.control} name="serial" label={t('fields.serial')} />
              <TextField control={form.control} name="assetCode" label={t('fields.assetCode')} />
              <AsyncSelectField
                control={form.control}
                name="manufacturerId"
                label={t('fields.manufacturer')}
                queryKey="manufacturers"
                loadOptions={(q) => catalogOptions('manufacturers', q)}
                selectedOptions={catalogOption(company?.manufacturer)}
                resolveOption={(value) => resolveCatalogItem('manufacturers', value)}
                clearable
              />
              <AsyncSelectField
                control={form.control}
                name="supplierId"
                label={t('fields.supplier')}
                queryKey="suppliers"
                loadOptions={(q) => catalogOptions('suppliers', q)}
                selectedOptions={catalogOption(company?.supplier)}
                resolveOption={(value) => resolveCatalogItem('suppliers', value)}
                clearable
              />
              <TextField
                control={form.control}
                name="countryOfOrigin"
                label={t('fields.countryOfOrigin')}
              />
              <NumberField
                control={form.control}
                name="manufactureYear"
                label={t('fields.manufactureYear')}
                min={1900}
              />
              <DateField control={form.control} name="receivedAt" label={t('fields.receivedAt')} />
              <DateField
                control={form.control}
                name="commissionedAt"
                label={t('fields.commissionedAt')}
              />
              <AsyncSelectField
                control={form.control}
                name="fundingSourceId"
                label={t('fields.fundingSource')}
                queryKey="funding-sources"
                loadOptions={(q) => catalogOptions('funding-sources', q)}
                selectedOptions={catalogOption(company?.fundingSource)}
                clearable
              />
              <MoneyField
                control={form.control}
                name="originalValue"
                label={t('fields.originalValue')}
              />
              <DateField
                control={form.control}
                name="warrantyUntil"
                label={t('fields.warrantyUntil')}
              />
              <TextField
                control={form.control}
                name="purchaseContractNo"
                label={t('fields.purchaseContractNo')}
              />
              <TextField control={form.control} name="decisionNo" label={t('fields.decisionNo')} />
              <TextField
                control={form.control}
                name="circulationNo"
                label={t('fields.circulationNo')}
              />
              <AsyncSelectField
                control={form.control}
                name="groupId"
                label={t('fields.groupEquipment')}
                queryKey="equipment-groups"
                loadOptions={(q) => catalogOptions('equipment-groups', q)}
                selectedOptions={catalogOption(company?.group)}
                resolveOption={(value) => resolveCatalogItem('equipment-groups', value)}
                clearable
              />
              {!editing && (
                <AsyncSelectField
                  control={form.control}
                  name="departmentId"
                  label={t('fields.department')}
                  queryKey="departments"
                  loadOptions={departmentOptions}
                  selectedOptions={catalogOption(company?.department)}
                  resolveOption={resolveDepartment}
                  clearable
                />
              )}
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1">
                  <AsyncSelectField
                    control={form.control}
                    name="roomId"
                    label={t('fields.room')}
                    queryKey={`rooms:${departmentId ?? ''}`}
                    loadOptions={(q) => roomOptions(q, departmentId)}
                    selectedOptions={catalogOption(company?.room)}
                    resolveOption={resolveRoom}
                    disabled={!departmentId}
                    clearable
                  />
                </div>
                {canQuickRoom && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={t('fields.roomAdd')}
                    title={t('fields.roomAdd')}
                    disabled={!departmentId}
                    onClick={() => setRoomDialog(true)}
                  >
                    <Plus />
                  </Button>
                )}
              </div>
              <TextField control={form.control} name="location" label={t('fields.location')} />
              <AsyncSelectField
                control={form.control}
                name="deptContactUserId"
                label={t('fields.deptContact')}
                queryKey="dept-users"
                loadOptions={(q) => userOptions(q)}
                selectedOptions={userOption(company?.deptContact)}
                resolveOption={resolveUser}
                clearable
              />
              <AsyncSelectField
                control={form.control}
                name="staffInChargeUserId"
                label={t('fields.staffInCharge')}
                queryKey="staff"
                loadOptions={(q) => userOptions(q)}
                selectedOptions={userOption(company?.staffInCharge)}
                resolveOption={resolveUser}
                clearable
              />
              <TextField
                control={form.control}
                name="testTypes"
                label={t('fields.testTypes')}
                description={t('fields.testTypesHint')}
              />
              <NumberField
                control={form.control}
                name="throughputPerHour"
                label={t('fields.throughputPerHour')}
                min={0}
              />
              <div className="col-span-full">
                <TextField control={form.control} name="notes" label={t('fields.notes')} />
              </div>
            </div>
          </SectionCard>
          <SectionCard title={t('sections.specs')}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <TextField control={form.control} name="specs.voltage" label={t('fields.voltage')} />
              <TextField control={form.control} name="specs.power" label={t('fields.power')} />
              <TextField
                control={form.control}
                name="specs.dimensions"
                label={t('fields.dimensions')}
              />
              <TextField control={form.control} name="specs.weight" label={t('fields.weight')} />
              <TextField control={form.control} name="specs.env.temp" label={t('fields.envTemp')} />
              <TextField
                control={form.control}
                name="specs.env.humidity"
                label={t('fields.envHumidity')}
              />
              <TextField control={form.control} name="specs.env.ups" label={t('fields.envUps')} />
              <TextField
                control={form.control}
                name="specs.env.water"
                label={t('fields.envWater')}
              />
              <TextField control={form.control} name="specs.env.gas" label={t('fields.envGas')} />
            </div>
          </SectionCard>
          {editing && (
            <SectionCard title={t('sections.photo')}>
              <div>
                <AttachmentsPanel
                  entityType="equipment"
                  entityId={id}
                  kinds={[{ value: 'photo', label: t('sections.photoKind') }]}
                />
              </div>
            </SectionCard>
          )}
          <FormFooter onCancel={() => navigate(-1)} submitting={form.formState.isSubmitting} />
        </form>
      </Form>
      <RoomFormDialog
        open={roomDialog}
        onOpenChange={setRoomDialog}
        departmentId={departmentId ?? null}
        departmentName={company?.department?.name}
        onCreated={(room) =>
          form.setValue('roomId', room.id, { shouldDirty: true, shouldValidate: true })
        }
      />
    </>
  )
}
