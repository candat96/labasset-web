import { useEffect } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FormDialog } from '@/components/form/FormDialog'
import { NumberField, SelectField, SwitchField, TextField } from '@/components/form/fields'
import { AsyncSelect } from '@/components/form/async-select'
import { FormField, FormItem, FormLabel, FormMessage, FormControl } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { applyServerErrors, messageFor } from '@/api/errors'
import { departmentOptions, resolveDepartment, resolveUser, userOptions } from '@/api/references'
import { enumLabel } from '@/lib/enum-labels'
import { createCatalog, getCatalog, listCatalog, updateCatalog } from '../api'
import { catalogCodeExamples } from '../config'
import { catalogSchema } from '../schema'
import type { CatalogConfig, CatalogRow, CatalogSlug, CatalogValue } from '../types'

type Values = Record<string, CatalogValue | undefined>

function initial(config: CatalogConfig, row?: CatalogRow, defaults?: Values): Values {
  const values: Values = {
    code: row?.code ?? '',
    name: row?.name ?? '',
    description: row?.description ?? '',
    isActive: row?.isActive ?? true,
    sortOrder: row?.sortOrder ?? 0,
  }
  for (const field of config.fields)
    values[field.name] =
      row?.[field.name] ??
      defaults?.[field.name] ??
      (field.type === 'boolean' ? false : field.type === 'enum' ? (field.options?.[0] ?? '') : '')
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
  defaults,
  lockedFields = [],
  onSaved,
  width = 'lg',
}: {
  slug: CatalogSlug
  config: CatalogConfig
  row?: CatalogRow
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Giá trị khởi tạo khi thêm mới (vd `departmentId` đã biết) — caller giữ tham chiếu ổn định (useMemo). */
  defaults?: Values
  /** Trường ẩn khỏi form (đã cố định qua `defaults`). */
  lockedFields?: string[]
  onSaved?: (row: CatalogRow) => void
  width?: 'md' | 'lg'
}) {
  const { t } = useTranslation('catalogs')
  const form = useForm<Values>({
    resolver: zodResolver(catalogSchema(config)) as Resolver<Values>,
    defaultValues: initial(config, row, defaults),
    mode: 'onBlur',
  })
  const queryClient = useQueryClient()
  const title = t(`titles.${slug}`)
  useEffect(() => {
    if (open) form.reset(initial(config, row, defaults))
  }, [open, row, config, form, defaults])
  const save = useMutation({
    mutationFn: async (values: Values) => {
      const after = clean(values)
      if (!row) {
        // Mã để trống → bỏ khỏi body, server tự sinh (handoff 16).
        const body = { ...after }
        if (!body.code) delete body.code
        return createCatalog(slug, body)
      }
      const before = clean(initial(config, row))
      const diff = Object.fromEntries(
        Object.entries(after).filter(
          ([key, value]) => JSON.stringify(value) !== JSON.stringify(before[key]),
        ),
      )
      return Object.keys(diff).length ? updateCatalog(slug, row.id, diff) : row
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['catalogs', slug] })
      void queryClient.invalidateQueries({ queryKey: ['reference', slug] })
      toast.success(row ? t('saved') : t('createdWithCode', { name: title, code: saved.code }))
      onSaved?.(saved)
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
      title={t(row ? 'formTitle.edit' : 'formTitle.add', { name: title.toLowerCase() })}
      form={form}
      onSubmit={(values) => save.mutate(values)}
      submitting={save.isPending}
      width={width}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="code"
          render={({ field: input }) => (
            <FormItem>
              <FormLabel>{t('fields.code')}</FormLabel>
              <FormControl>
                <Input
                  {...input}
                  value={(input.value as string) ?? ''}
                  onChange={(event) => input.onChange(event.target.value.toUpperCase())}
                  placeholder={t('codeAutoExample', { example: catalogCodeExamples[slug] })}
                  disabled={!!row}
                />
              </FormControl>
              {!row && <p className="text-muted-foreground text-xs">{t('codeFormatHint')}</p>}
              <FormMessage />
            </FormItem>
          )}
        />
        <TextField control={form.control} name="name" label={t('fields.name')} />
      </div>
      <TextField control={form.control} name="description" label={t('fields.description')} />
      {config.fields.map((field) => {
        if (lockedFields.includes(field.name)) return null
        const label = t(`catalogFields.${slug}.${field.name}`)
        return field.type === 'boolean' ? (
          <SwitchField key={field.name} control={form.control} name={field.name} label={label} />
        ) : field.type === 'number' ? (
          <NumberField
            key={field.name}
            control={form.control}
            name={field.name}
            label={label}
            min={field.min}
          />
        ) : field.type === 'severity' ? (
          <SelectField
            key={field.name}
            control={form.control}
            name={field.name}
            label={label}
            options={(['low', 'medium', 'high', 'critical'] as const).map((value) => ({
              value,
              label: t(`severity.${value}`),
            }))}
          />
        ) : field.type === 'enum' ? (
          <SelectField
            key={field.name}
            control={form.control}
            name={field.name}
            label={label}
            options={(field.options ?? []).map((value) => ({
              value,
              label: field.enumKind ? enumLabel(field.enumKind, value) : value,
            }))}
          />
        ) : field.type === 'user' ? (
          <FormField
            key={field.name}
            control={form.control}
            name={field.name}
            render={({ field: input }) => (
              <FormItem>
                <AsyncSelect
                  label={label}
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
                  label={label}
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
                  placeholder={
                    field.nullLabelKey
                      ? t(`catalogFields.${slug}.${field.nullLabelKey}`)
                      : undefined
                  }
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
            label={label}
            type={field.type ?? 'text'}
          />
        )
      })}
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          control={form.control}
          name="sortOrder"
          label={t('fields.sortOrder')}
          min={0}
        />
        {row && <SwitchField control={form.control} name="isActive" label={t('fields.isActive')} />}
      </div>
    </FormDialog>
  )
}
