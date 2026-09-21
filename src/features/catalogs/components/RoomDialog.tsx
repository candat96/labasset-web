import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormDialog } from '@/components/form/FormDialog'
import { NumberField, SelectField, SwitchField, TextField } from '@/components/form/fields'
import { AsyncSelect } from '@/components/form/async-select'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { applyServerErrors, isApiError, messageFor } from '@/api/errors'
import { departmentOptions, resolveDepartment } from '@/api/references'
import { suggestRoomCode, withCodeSuffix } from '@/lib/room-code'
import { ROOM_TYPES, enumLabel } from '@/lib/enum-labels'
import { createCatalog, updateCatalog } from '../api'
import type { CatalogRow, CatalogValue } from '../types'

const schema = z.object({
  name: z.string().trim().min(1, 'Bắt buộc').max(255),
  departmentId: z.string().nullable(),
  building: z.string(),
  floor: z.string(),
  roomType: z.enum(ROOM_TYPES),
  // Mã không bắt buộc (API tự sinh); chỉ kiểm tra định dạng khi có nhập.
  code: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(z.union([z.literal(''), z.string().regex(/^[A-Z0-9_-]{1,32}$/, 'Mã A–Z, số, _ hoặc -')])),
  sortOrder: z.union([z.literal(''), z.number().int().min(0)]),
  description: z.string(),
  isActive: z.boolean(),
})
type RoomForm = z.infer<typeof schema>

function initial(row?: CatalogRow): RoomForm {
  const roomType = row?.roomType
  return {
    name: row?.name ?? '',
    departmentId: typeof row?.departmentId === 'string' ? row.departmentId : null,
    building: typeof row?.building === 'string' ? row.building : '',
    floor: typeof row?.floor === 'string' ? row.floor : '',
    roomType: ROOM_TYPES.find((value) => value === roomType) ?? 'other',
    code: row?.code ?? '',
    sortOrder: row?.sortOrder ?? 0,
    description: row?.description ?? '',
    isActive: row?.isActive ?? true,
  }
}

function toBody(values: RoomForm): Record<string, CatalogValue> {
  return {
    name: values.name,
    departmentId: values.departmentId,
    building: values.building || null,
    floor: values.floor || null,
    roomType: values.roomType,
    code: values.code || null,
    sortOrder: values.sortOrder === '' ? 0 : values.sortOrder,
    description: values.description || null,
    isActive: values.isActive,
  }
}

/** Thêm/Sửa phòng ở `/admin/rooms`: Tên · Khoa/Phòng ban (trống = Dùng chung) / Toà · Tầng · Loại / Mã · Thứ tự / Mô tả. */
export function RoomDialog({
  row,
  open,
  onOpenChange,
}: {
  row?: CatalogRow
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('catalogs')
  const qc = useQueryClient()
  const form = useForm<RoomForm>({
    resolver: zodResolver(schema),
    defaultValues: initial(row),
    mode: 'onBlur',
  })
  useEffect(() => {
    if (open) form.reset(initial(row))
  }, [open, row, form])
  const save = useMutation({
    mutationFn: async (values: RoomForm) => {
      const after = toBody(values)
      if (!row) {
        if (after.code === null) {
          const department = values.departmentId
            ? await resolveDepartment(values.departmentId)
            : null
          after.code = suggestRoomCode(department?.code, values.name)
          try {
            return await createCatalog('rooms', after)
          } catch (error) {
            // Mã tự sinh trùng → thử lại một lần với hậu tố ngắn.
            if (!isApiError(error) || (error.status !== 409 && error.status !== 400)) throw error
            return createCatalog('rooms', { ...after, code: withCodeSuffix(String(after.code)) })
          }
        }
        return createCatalog('rooms', after)
      }
      const before = toBody(initial(row))
      const diff = Object.fromEntries(
        Object.entries(after).filter(
          ([key, value]) => key !== 'code' && JSON.stringify(value) !== JSON.stringify(before[key]),
        ),
      )
      return Object.keys(diff).length ? updateCatalog('rooms', row.id, diff) : row
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['catalogs', 'rooms'] })
      void qc.invalidateQueries({ queryKey: ['reference'] })
      toast.success(t('saved'))
      onOpenChange(false)
    },
    onError: (error) => {
      if (!applyServerErrors(form, error)) toast.error(messageFor(error))
    },
  })
  const f = (key: string) => t(`catalogFields.rooms.${key}`)
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t(row ? 'formTitle.edit' : 'formTitle.add', { name: t('titles.rooms').toLowerCase() })}
      form={form}
      onSubmit={(values) => save.mutate(values)}
      submitting={save.isPending}
      width="lg"
    >
      <div className="col-span-full grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <TextField control={form.control} name="name" label={t('fields.name')} />
        </div>
        <FormField
          control={form.control}
          name="departmentId"
          render={({ field }) => (
            <FormItem>
              <AsyncSelect
                label={f('departmentId')}
                queryKey="departments"
                loadOptions={departmentOptions}
                resolveOption={resolveDepartment}
                value={field.value}
                onChange={(value) => field.onChange(typeof value === 'string' ? value : null)}
                placeholder={f('shared')}
                clearable
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <TextField control={form.control} name="building" label={f('building')} />
        <TextField control={form.control} name="floor" label={f('floor')} />
        <SelectField
          control={form.control}
          name="roomType"
          label={f('roomType')}
          options={ROOM_TYPES.map((value) => ({ value, label: enumLabel('roomType', value) }))}
        />
        <TextField
          control={form.control}
          name="code"
          label={t('fields.code')}
          placeholder={t('codeAuto', { defaultValue: 'Để trống để tự sinh' })}
          disabled={!!row}
          transform={(value) => value.toUpperCase()}
        />
        <NumberField
          control={form.control}
          name="sortOrder"
          label={t('fields.sortOrder')}
          min={0}
        />
        {row && <SwitchField control={form.control} name="isActive" label={t('fields.isActive')} />}
        <div className="md:col-span-3">
          <TextField control={form.control} name="description" label={t('fields.description')} />
        </div>
      </div>
    </FormDialog>
  )
}
