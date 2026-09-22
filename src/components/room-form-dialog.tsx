import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { api, apiBody, unwrapAs } from '@/api/client'
import type { components } from '@/api/schema'
import { applyServerErrors, messageFor } from '@/api/errors'
import { FormDialog } from '@/components/form/FormDialog'
import { SelectField, TextField } from '@/components/form/fields'
import { ROOM_TYPES, enumLabel } from '@/lib/enum-labels'

export type RoomRow = components['schemas']['RoomResponseDto']
type CreateRoomBody = components['schemas']['CreateRoomDto']

const schema = z.object({
  code: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(z.union([z.literal(''), z.string().regex(/^[A-Z0-9_-]{1,32}$/, 'Mã A–Z, số, _ hoặc -')])),
  name: z.string().trim().min(1, 'Bắt buộc').max(255),
  building: z.string(),
  floor: z.string(),
  roomType: z.enum(ROOM_TYPES),
})
type RoomForm = z.infer<typeof schema>
const empty: RoomForm = { code: '', name: '', building: '', floor: '', roomType: 'other' }

/**
 * Tạo nhanh một phòng cho Khoa/Phòng ban đã biết (form máy, tab Phòng ở chi tiết khoa).
 * `departmentId = null` → phòng dùng chung. Mã để trống sẽ do API tự sinh.
 */
export function RoomFormDialog({
  open,
  onOpenChange,
  departmentId,
  departmentName,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  departmentId: string | null
  departmentName?: string | null
  onCreated?: (room: RoomRow) => void
}) {
  const { t } = useTranslation('catalogs')
  const qc = useQueryClient()
  const form = useForm<RoomForm>({ resolver: zodResolver(schema), defaultValues: empty })
  useEffect(() => {
    if (open) form.reset(empty)
  }, [open, form])
  const create = (values: RoomForm) =>
    unwrapAs<RoomRow>(
      api.POST('/v1/catalogs/rooms', {
        body: apiBody<CreateRoomBody>({
          // Mã để trống → bỏ khỏi body, server tự sinh (handoff 16).
          ...(values.code ? { code: values.code } : {}),
          name: values.name,
          departmentId,
          building: values.building || null,
          floor: values.floor || null,
          roomType: values.roomType,
        }),
      }),
    )
  const save = useMutation({
    mutationFn: (values: RoomForm) => create(values),
    onSuccess: (room) => {
      void qc.invalidateQueries({ queryKey: ['catalogs', 'rooms'] })
      void qc.invalidateQueries({ queryKey: ['reference'] })
      toast.success(t('createdWithCode', { name: t('titles.rooms'), code: room.code }))
      onCreated?.(room)
      onOpenChange(false)
    },
    onError: (error) => {
      if (!applyServerErrors(form, error)) toast.error(messageFor(error))
    },
  })
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('quickRoom.title', { defaultValue: 'Thêm phòng' })}
      description={
        departmentName
          ? t('quickRoom.forDepartment', {
              defaultValue: 'Phòng mới thuộc {{name}}',
              name: departmentName,
            })
          : t('quickRoom.shared', { defaultValue: 'Phòng dùng chung (không thuộc đơn vị nào)' })
      }
      form={form}
      onSubmit={(values) => save.mutate(values)}
      submitting={save.isPending}
      width="md"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField control={form.control} name="name" label={t('fields.name')} />
        <TextField
          control={form.control}
          name="code"
          label={t('fields.code')}
          placeholder={t('codeAutoExample', { example: 'PH-0001' })}
          transform={(value) => value.toUpperCase()}
        />
        <TextField
          control={form.control}
          name="building"
          label={t('catalogFields.rooms.building')}
        />
        <TextField control={form.control} name="floor" label={t('catalogFields.rooms.floor')} />
        <SelectField
          control={form.control}
          name="roomType"
          label={t('catalogFields.rooms.roomType')}
          options={ROOM_TYPES.map((value) => ({ value, label: enumLabel('roomType', value) }))}
        />
      </div>
    </FormDialog>
  )
}
