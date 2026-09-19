import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FormDialog } from '@/components/form/FormDialog'
import {
  FieldGrid,
  NumberField,
  SelectField,
  SwitchField,
  TextField,
} from '@/components/form/fields'
import { applyServerErrors, messageFor } from '@/api/errors'
import { useActiveUsers } from '@/features/users/hooks'
import { useCreateDepartment, useUpdateDepartment } from '../hooks'
import { departmentSchema, type DepartmentFormOutput, type DepartmentFormValues } from '../schema'
import { DEPARTMENT_TYPES, type Department, type UpdateDepartmentDto } from '../types'

const toValues = (d?: Department | null): DepartmentFormValues => ({
  code: d?.code ?? '',
  name: d?.name ?? '',
  type: d?.type ?? 'lab',
  headUserId: d?.headUserId ?? null,
  phone: d?.phone ?? '',
  location: d?.location ?? '',
  sortOrder: d?.sortOrder ?? 0,
  isActive: d?.isActive ?? true,
})

/** Chỉ gửi các field thay đổi khi sửa. */
function diff(before: Department, after: DepartmentFormOutput): UpdateDepartmentDto {
  const out: UpdateDepartmentDto = {}
  if (after.name !== before.name) out.name = after.name
  if (after.type !== before.type) out.type = after.type
  if ((after.headUserId ?? null) !== before.headUserId)
    out.headUserId = after.headUserId ?? undefined
  const phone = after.phone ? after.phone : null
  if (phone !== before.phone) out.phone = phone as string | undefined
  const location = after.location ? after.location : null
  if (location !== before.location) out.location = location as string | undefined
  if (after.sortOrder !== before.sortOrder) out.sortOrder = after.sortOrder
  if (after.isActive !== before.isActive) out.isActive = after.isActive
  return out
}

export function DepartmentFormDialog({
  open,
  onOpenChange,
  department,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  department?: Department | null
}) {
  const { t } = useTranslation('departments')
  const { t: tc } = useTranslation()
  const isEdit = !!department
  const users = useActiveUsers()
  const create = useCreateDepartment()
  const update = useUpdateDepartment()

  const form = useForm<DepartmentFormValues, unknown, DepartmentFormOutput>({
    resolver: zodResolver(departmentSchema()),
    defaultValues: toValues(department),
  })
  useEffect(() => {
    if (open) form.reset(toValues(department))
  }, [open, department, form])

  const userOptions = useMemo(
    () => (users.data ?? []).map((u) => ({ value: u.id, label: `${u.fullName} (${u.username})` })),
    [users.data],
  )
  const typeOptions = DEPARTMENT_TYPES.map((v) => ({ value: v, label: t(`types.${v}`) }))

  const onSubmit = async (v: DepartmentFormOutput) => {
    try {
      if (isEdit) {
        const body = diff(department, v)
        if (Object.keys(body).length > 0) await update.mutateAsync({ id: department.id, body })
      } else {
        await create.mutateAsync({
          code: v.code,
          name: v.name,
          type: v.type,
          headUserId: v.headUserId ?? undefined,
          phone: v.phone || undefined,
          location: v.location || undefined,
          sortOrder: v.sortOrder,
        })
      }
      onOpenChange(false)
    } catch (e) {
      if (!applyServerErrors(form, e)) toast.error(messageFor(e))
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t('edit') : t('create')}
      form={form}
      onSubmit={onSubmit}
      submitting={create.isPending || update.isPending}
    >
      <FieldGrid>
        <TextField
          control={form.control}
          name="code"
          label={t('fields.code')}
          description={t('codeHint')}
          disabled={isEdit}
          transform={(s) => s.toUpperCase()}
          autoFocus={!isEdit}
        />
        <SelectField
          control={form.control}
          name="type"
          label={t('fields.type')}
          options={typeOptions}
        />
      </FieldGrid>
      <TextField control={form.control} name="name" label={t('fields.name')} autoFocus={isEdit} />
      <SelectField
        control={form.control}
        name="headUserId"
        label={t('fields.headUserId')}
        options={userOptions}
        emptyLabel={tc('form.none')}
        placeholder={users.isPending ? tc('page.loading') : undefined}
      />
      <FieldGrid>
        <TextField control={form.control} name="phone" label={t('fields.phone')} inputMode="tel" />
        <TextField control={form.control} name="location" label={t('fields.location')} />
      </FieldGrid>
      <FieldGrid>
        <NumberField
          control={form.control}
          name="sortOrder"
          label={t('fields.sortOrder')}
          min={0}
        />
        {isEdit && (
          <SwitchField control={form.control} name="isActive" label={t('fields.isActiveSwitch')} />
        )}
      </FieldGrid>
    </FormDialog>
  )
}
