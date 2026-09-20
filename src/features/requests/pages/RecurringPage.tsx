import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar } from '@/components/filter-bar'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/form/FormDialog'
import { SelectField, SwitchField } from '@/components/form/fields'
import { QtyField } from '@/components/form/qty-field'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AsyncSelect } from '@/components/form/async-select'
import { formatDateTime } from '@/lib/format/date'
import { decimalString } from '@/lib/validation/decimal'
import { useCan } from '@/app/guards/useCan'
import { ADM, HEADS } from '@/routes/roles'
import { applyServerErrors, messageFor } from '@/api/errors'
import { departmentOptions, supplyOptions } from '@/api/references'
import { createRecurring, deleteRecurring, listRecurring, updateRecurring } from '../api'
import type { components } from '@/api/schema'
import { useTranslation } from 'react-i18next'

type Row = components['schemas']['RecurringResponseDto']
const schema = z.object({
  departmentId: z.string().nullable(),
  dayOfMonth: z.string().regex(/^(?:[1-9]|1\d|2[0-8])$/),
  priority: z.enum(['normal', 'urgent']),
  isActive: z.boolean(),
  items: z
    .array(
      z.object({
        supplyId: z.string().min(1, 'Bắt buộc'),
        qty: decimalString({ maxScale: 3, min: '0.001' }),
        note: z.string(),
      }),
    )
    .min(1),
})
type Values = z.infer<typeof schema>

export function Component() {
  const { t } = useTranslation('requests')
  const canWrite = useCan(HEADS)
  const isAdm = useCan(ADM)
  const qc = useQueryClient()
  const table = useServerTable()
  const list = useQuery({
    queryKey: ['requests', 'recurring', table.params],
    queryFn: () => listRecurring({ page: table.params.page, limit: table.params.limit }),
  })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Row | null>(null)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      departmentId: null,
      dayOfMonth: '1',
      priority: 'normal',
      isActive: true,
      items: [{ supplyId: '', qty: '1', note: '' }],
    },
  })
  const fields = useFieldArray({ control: form.control, name: 'items' })
  const startCreate = () => {
    setEditing(null)
    form.reset({
      departmentId: null,
      dayOfMonth: '1',
      priority: 'normal',
      isActive: true,
      items: [{ supplyId: '', qty: '1', note: '' }],
    })
    setOpen(true)
  }
  const startEdit = (row: Row) => {
    setEditing(row)
    form.reset({
      departmentId: row.departmentId,
      dayOfMonth: String(row.dayOfMonth),
      priority: row.priority as 'normal' | 'urgent',
      isActive: row.isActive,
      items: row.items.map((item) => ({
        supplyId: item.supplyId,
        qty: item.qty,
        note: typeof item.note === 'string' ? item.note : '',
      })),
    })
    setOpen(true)
  }
  const columns: ColumnDef<Row>[] = [
    { accessorKey: 'name', header: t('name') },
    { accessorKey: 'departmentId', header: 'Khoa' },
    { accessorKey: 'dayOfMonth', header: t('dayOfMonth') },
    { accessorKey: 'priority', header: t('priority') },
    {
      accessorKey: 'isActive',
      header: t('status'),
      cell: ({ row }) => (row.original.isActive ? t('active') : t('inactive')),
    },
    {
      accessorKey: 'lastGeneratedAt',
      header: t('lastGeneratedAt'),
      cell: ({ getValue }) => formatDateTime(getValue<string | null>()),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) =>
        canWrite ? (
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => startEdit(row.original)}>
              {t('edit')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  await deleteRecurring(row.original.id)
                  toast.success(t('deleted'))
                  void qc.invalidateQueries({ queryKey: ['requests', 'recurring'] })
                } catch (error) {
                  toast.error(messageFor(error))
                }
              }}
            >
              {t('delete')}
            </Button>
          </div>
        ) : null,
    },
  ]
  return (
    <>
      <PageHeader
        title={t('recurring')}
        description={t('recurringDesc')}
        actions={canWrite && <Button onClick={startCreate}>{t('createRecurring')}</Button>}
      />
      <DataTable
        tableId="recurring"
        columns={columns}
        data={list.data?.items}
        total={list.data?.total ?? 0}
        params={table.params}
        onPageChange={table.setPage}
        onLimitChange={table.setLimit}
        isLoading={list.isPending}
        error={list.error}
        onRetry={() => void list.refetch()}
        toolbarLeft={<FilterBar>{null}</FilterBar>}
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? t('editRecurring') : t('createRecurring')}
        form={form}
        onSubmit={async (values) => {
          try {
            const body = {
              dayOfMonth: Number(values.dayOfMonth),
              priority: values.priority,
              departmentId: isAdm ? (values.departmentId ?? undefined) : undefined,
              items: values.items.map((item) => ({
                supplyId: item.supplyId,
                qty: item.qty,
                note: item.note || undefined,
              })),
            }
            if (editing) await updateRecurring(editing.id, { ...body, isActive: values.isActive })
            else await createRecurring(body)
            toast.success(t('saved'))
            setOpen(false)
            void qc.invalidateQueries({ queryKey: ['requests', 'recurring'] })
          } catch (error) {
            if (!applyServerErrors(form, error)) toast.error(messageFor(error))
          }
        }}
      >
        {isAdm && (
          <FormField
            control={form.control}
            name="departmentId"
            render={({ field }) => (
              <FormItem>
                <AsyncSelect
                  label="Khoa"
                  queryKey="recurring-departments"
                  loadOptions={departmentOptions}
                  value={field.value}
                  onChange={field.onChange}
                  clearable
                />
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <SelectField
          control={form.control}
          name="dayOfMonth"
          label={t('dayOfMonth')}
          options={Array.from({ length: 28 }, (_, index) => ({
            value: String(index + 1),
            label: String(index + 1),
          }))}
        />
        <SelectField
          control={form.control}
          name="priority"
          label={t('priority')}
          options={[
            { value: 'normal', label: t('normal') },
            { value: 'urgent', label: t('urgent') },
          ]}
        />
        {editing && <SwitchField control={form.control} name="isActive" label={t('active')} />}
        {fields.fields.map((item, index) => (
          <div key={item.id} className="space-y-2 rounded border p-3">
            <FormField
              control={form.control}
              name={`items.${index}.supplyId`}
              render={({ field }) => (
                <FormItem>
                  <AsyncSelect
                    label={t('supply')}
                    queryKey="recurring-supplies"
                    loadOptions={supplyOptions}
                    value={field.value || null}
                    onChange={(value) => field.onChange(typeof value === 'string' ? value : '')}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <QtyField control={form.control} name={`items.${index}.qty`} label={t('quantity')} />
            <Button type="button" variant="ghost" onClick={() => fields.remove(index)}>
              {t('removeLine')}
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => fields.append({ supplyId: '', qty: '1', note: '' })}
        >
          {t('addLine')}
        </Button>
      </FormDialog>
    </>
  )
}
