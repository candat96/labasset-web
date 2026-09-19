import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FormDialog } from '@/components/form/FormDialog'
import { NumberField, SelectField, SwitchField, TextField } from '@/components/form/fields'
import { AsyncSelect } from '@/components/form/async-select'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { applyServerErrors, messageFor } from '@/api/errors'
import { departmentOptions, resolveDepartment, resolveUser, userOptions } from '@/api/references'
import { createCatalog, getCatalog, listCatalog, updateCatalog } from '../api'
import { catalogSchema } from '../schema'
import type { CatalogConfig, CatalogRow, CatalogSlug, CatalogValue } from '../types'

type Values = Record<string, CatalogValue | undefined>

function initial(config: CatalogConfig, row?: CatalogRow): Values {
  const values: Values = {
    code: row?.code ?? '',
    name: row?.name ?? '',
    description: row?.description ?? '',
    isActive: row?.isActive ?? true,
    sortOrder: row?.sortOrder ?? 0,
  }
  for (const field of config.fields)
    values[field.name] = row?.[field.name] ?? (field.type === 'boolean' ? false : '')
  return values
}

function clean(values: Values): Record<string, CatalogValue> {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value === '' ? null : value]),
  ) as Record<string, CatalogValue>
}

export function CatalogFormDialog({
  slug,
  config,
  row,
  open,
  onOpenChange,
}: {
  slug: CatalogSlug
  config: CatalogConfig
  row?: CatalogRow
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const form = useForm<Values>({
    resolver: zodResolver(catalogSchema(config)) as Resolver<Values>,
    defaultValues: initial(config, row),
    mode: 'onBlur',
  })
  const queryClient = useQueryClient()
  useEffect(() => {
    if (open) form.reset(initial(config, row))
  }, [open, row, config, form])
  const save = useMutation({
    mutationFn: async (values: Values) => {
      const after = clean(values)
      if (!row) return createCatalog(slug, after)
      const before = clean(initial(config, row))
      const diff = Object.fromEntries(
        Object.entries(after).filter(
          ([key, value]) => JSON.stringify(value) !== JSON.stringify(before[key]),
        ),
      )
      return Object.keys(diff).length ? updateCatalog(slug, row.id, diff) : row
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalogs', slug] })
      toast.success('Đã lưu danh mục')
      onOpenChange(false)
    },
    onError: (error) => {
      if (!applyServerErrors(form, error)) toast.error(messageFor(error))
    },
  })
  const selfOptions = async (q: string) => {
    const result = await listCatalog(slug, { q, all: true })
    const rows = Array.isArray(result) ? result : result.items
    return rows
      .filter((item) => item.id !== row?.id)
      .map((item) => ({ id: item.id, code: item.code, name: item.name }))
  }
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${row ? 'Sửa' : 'Thêm'} ${config.title.toLowerCase()}`}
      form={form}
      onSubmit={(values) => save.mutate(values)}
      submitting={save.isPending}
      width="lg"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          control={form.control}
          name="code"
          label="Mã"
          disabled={!!row}
          transform={(value) => value.toUpperCase()}
        />
        <TextField control={form.control} name="name" label="Tên" />
      </div>
      <TextField control={form.control} name="description" label="Mô tả" />
      {config.fields.map((field) =>
        field.type === 'boolean' ? (
          <SwitchField
            key={field.name}
            control={form.control}
            name={field.name}
            label={field.label}
          />
        ) : field.type === 'number' ? (
          <NumberField
            key={field.name}
            control={form.control}
            name={field.name}
            label={field.label}
            min={field.min}
          />
        ) : field.type === 'severity' ? (
          <SelectField
            key={field.name}
            control={form.control}
            name={field.name}
            label={field.label}
            options={(
              [
                ['low', 'Thấp'],
                ['medium', 'Trung bình'],
                ['high', 'Cao'],
                ['critical', 'Nghiêm trọng'],
              ] as const
            ).map(([value, label]) => ({ value, label }))}
          />
        ) : field.type === 'user' ? (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name}
            render={({ field: input }) => (
              <FormItem>
                <AsyncSelect
                  label={field.label}
                  queryKey="users"
                  loadOptions={userOptions}
                  resolveOption={resolveUser}
                  value={typeof input.value === 'string' ? input.value : null}
                  onChange={input.onChange}
                  clearable
                />
                <FormMessage />
              </FormItem>
            )}
          />
        ) : field.type === 'reference' ? (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name}
            render={({ field: input }) => (
              <FormItem>
                <AsyncSelect
                  label={field.label}
                  queryKey={field.reference === 'self' ? slug : 'departments'}
                  loadOptions={field.reference === 'self' ? selfOptions : departmentOptions}
                  resolveOption={
                    field.reference === 'self'
                      ? async (id) => {
                          const row = await getCatalog(slug, id)
                          return { id: row.id, code: row.code, name: row.name }
                        }
                      : resolveDepartment
                  }
                  value={typeof input.value === 'string' ? input.value : null}
                  onChange={input.onChange}
                  clearable
                />
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <TextField
            key={field.name}
            control={form.control}
            name={field.name}
            label={field.label}
            type={field.type ?? 'text'}
          />
        ),
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField control={form.control} name="sortOrder" label="Thứ tự" min={0} />
        {row && <SwitchField control={form.control} name="isActive" label="Đang hoạt động" />}
      </div>
    </FormDialog>
  )
}
