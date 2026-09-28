import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import { FormDialog } from '@/components/form/FormDialog'
import { NumberField, SwitchField, TextField } from '@/components/form/fields'
import { AsyncSelect } from '@/components/form/async-select'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { applyServerErrors, messageFor } from '@/api/errors'
import {
  catalogOptions,
  resolveCatalogItem,
  resolveStorageLocation,
  storageLocationOptions,
} from '@/api/references'
import { createStorageLocation, updateStorageLocation } from '../api'
import type { StorageLocation } from '../types'

const schema = z.object({
  warehouseId: z.string().min(1, 'Bắt buộc'),
  name: z.string().trim().min(1, 'Bắt buộc').max(255),
  code: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(z.union([z.literal(''), z.string().regex(/^[A-Z0-9_-]{1,32}$/, 'Mã A–Z, số, _ hoặc -')])),
  zone: z.string().max(64),
  parentId: z.string().nullable(),
  sortOrder: z.union([z.literal(''), z.number().int().min(0)]),
  description: z.string(),
  isActive: z.boolean(),
})
type Form = z.infer<typeof schema>

function initial(row?: StorageLocation): Form {
  return {
    warehouseId: row?.warehouseId ?? '',
    name: row?.name ?? '',
    code: row?.code ?? '',
    zone: row?.zone ?? '',
    parentId: row?.parentId ?? null,
    sortOrder: row?.sortOrder ?? 0,
    description: row?.description ?? '',
    isActive: row?.isActive ?? true,
  }
}

function toBody(values: Form) {
  return {
    warehouseId: values.warehouseId,
    name: values.name,
    zone: values.zone || null,
    parentId: values.parentId,
    sortOrder: values.sortOrder === '' ? 0 : values.sortOrder,
    description: values.description || null,
    isActive: values.isActive,
  }
}

/** Thêm/Sửa vị trí lưu trữ ở `/admin/storage-locations` (theo kho, cây 2 cấp). */
export function StorageLocationDialog({
  row,
  open,
  onOpenChange,
}: {
  row?: StorageLocation
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation('catalogs')
  const qc = useQueryClient()
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: initial(row),
    mode: 'onBlur',
  })
  useEffect(() => {
    if (open) form.reset(initial(row))
  }, [open, row, form])
  const warehouseId = form.watch('warehouseId')
  const save = useMutation({
    mutationFn: async (values: Form) => {
      const code = values.code
      if (!row) return createStorageLocation({ ...toBody(values), ...(code ? { code } : {}) })
      const body: Record<string, unknown> = { ...toBody(values) }
      delete body.warehouseId // không đổi kho của vị trí
      return updateStorageLocation(row.id, body)
    },
    onSuccess: (saved) => {
      void qc.invalidateQueries({ queryKey: ['storage-locations'] })
      void qc.invalidateQueries({ queryKey: ['reference'] })
      toast.success(row ? t('saved') : t('storageLocations.created', { code: saved.code }))
      onOpenChange(false)
    },
    onError: (error) => {
      if (!applyServerErrors(form, error)) toast.error(messageFor(error))
    },
  })
  const f = (key: string) => t(`storageLocations.fields.${key}`)
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t(row ? 'formTitle.edit' : 'formTitle.add', {
        name: t('storageLocations.title').toLowerCase(),
      })}
      form={form}
      onSubmit={(values) => save.mutate(values)}
      submitting={save.isPending}
      width="lg"
    >
      <FormField
        control={form.control}
        name="warehouseId"
        render={({ field }) => (
          <FormItem>
            <AsyncSelect
              label={f('warehouseId')}
              queryKey="warehouses"
              loadOptions={(q) => catalogOptions('warehouses', q)}
              resolveOption={(id) => resolveCatalogItem('warehouses', id)}
              value={field.value || null}
              onChange={(value) => {
                const next = typeof value === 'string' ? value : ''
                field.onChange(next)
                // Đổi kho → bỏ cha cũ (cha phải cùng kho).
                if (next !== row?.warehouseId) form.setValue('parentId', null)
              }}
              disabled={!!row}
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <TextField control={form.control} name="name" label={t('fields.name')} />
      <FormField
        control={form.control}
        name="parentId"
        render={({ field }) => (
          <FormItem>
            <AsyncSelect
              label={f('parentId')}
              queryKey={`storage-location-parents-${warehouseId || 'none'}`}
              loadOptions={async (q) =>
                (await storageLocationOptions(warehouseId, q)).filter(
                  (option) => option.id !== row?.id,
                )
              }
              resolveOption={resolveStorageLocation}
              value={field.value}
              onChange={(value) => field.onChange(typeof value === 'string' ? value : null)}
              disabled={!warehouseId}
              clearable
              placeholder={f('parentNone')}
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <TextField control={form.control} name="zone" label={f('zone')} />
      <TextField
        control={form.control}
        name="code"
        label={t('fields.code')}
        placeholder={t('storageLocations.codePlaceholder')}
        disabled={!!row}
        transform={(value) => value.toUpperCase()}
      />
      <NumberField control={form.control} name="sortOrder" label={t('fields.sortOrder')} min={0} />
      {row && <SwitchField control={form.control} name="isActive" label={t('fields.isActive')} />}
      <div className="sm:col-span-full">
        <TextField control={form.control} name="description" label={t('fields.description')} />
      </div>
    </FormDialog>
  )
}
