import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar, FilterField, FilterPreset, MoreFilters } from '@/components/filter-bar'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MultiSelect } from '@/components/multi-select'
import { DatePicker } from '@/components/date-picker'
import { StatusBadge } from '@/components/status-badge'
import { taskStatusMap, taskTypeMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { FormDialog } from '@/components/form/FormDialog'
import { TextField } from '@/components/form/fields'
import { DatetimeField } from '@/components/form/datetime-field'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AsyncSelect } from '@/components/form/async-select'
import { useCan } from '@/app/guards/useCan'
import { ADM, STAFF } from '@/routes/roles'
import { applyServerErrors, messageFor } from '@/api/errors'
import { equipmentOptions, staffUserOptions } from '@/api/references'
import { dayRangeToIso } from '@/lib/format/date-range'
import { useAuthStore } from '@/stores/auth.store'
import { createTask } from '../api'
import { useInvalidateTasks, useTasks, useTemplates } from '../hooks'
import { adhocSchema, type AdhocForm } from '../schema'
import type { Task } from '../types'
import { useTranslation } from 'react-i18next'

export function Component() {
  const { t } = useTranslation('maintenance')

  const canWrite = useCan(STAFF)
  const navigate = useNavigate()
  const table = useServerTable({
    filterKeys: ['status', 'type', 'assigneeId', 'equipmentId', 'from', 'to', 'planId'],
  })
  const canListUsers = useCan(ADM)
  const myId = useAuthStore((s) => s.user?.id)
  const f = table.params.filters
  const params = {
    page: table.params.page,
    limit: table.params.limit,
    status: f.status,
    type: f.type as Task['type'] | undefined,
    assigneeId: f.assigneeId,
    equipmentId: f.equipmentId,
    ...dayRangeToIso(f.from, f.to),
    planId: f.planId,
  }
  const list = useTasks(params)
  const templates = useTemplates()
  const invalidate = useInvalidateTasks()
  const [open, setOpen] = useState(false)
  const form = useForm<AdhocForm>({
    resolver: zodResolver(adhocSchema),
    defaultValues: {
      equipmentId: '',
      scheduledAt: new Date().toISOString(),
      assigneeId: null,
      templateId: null,
      notes: '',
    },
  })
  const columns = useMemo<ColumnDef<Task>[]>(
    () => [
      {
        accessorKey: 'code',
        header: t('code'),
        cell: ({ row }) => (
          <Link
            className="text-primary font-mono text-xs hover:underline"
            to={`/maintenance/tasks/${row.original.id}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      {
        accessorKey: 'type',
        header: t('type'),
        cell: ({ row }) => <StatusBadge value={row.original.type} map={taskTypeMap} />,
      },
      {
        accessorKey: 'scheduledAt',
        header: t('schedule'),
        cell: ({ getValue }) => formatDateTime(getValue<string>()),
      },
      {
        accessorKey: 'dueAt',
        header: t('due'),
        cell: ({ getValue }) => formatDateTime(getValue<string>()),
      },
      {
        accessorKey: 'status',
        header: t('status'),
        cell: ({ row }) => <StatusBadge value={row.original.status} map={taskStatusMap} />,
      },
      {
        accessorKey: 'overallPass',
        header: t('result'),
        cell: ({ row }) =>
          row.original.overallPass == null ? '—' : row.original.overallPass ? '✓' : '✗',
      },
    ],
    [t],
  )
  return (
    <>
      <PageHeader
        title={t('tasksTitle')}
        description={t('tasksHint', {
          defaultValue:
            'Công việc bảo dưỡng định kỳ và đột xuất; theo dõi hạn và kết quả checklist.',
        })}
        actions={canWrite && <Button onClick={() => setOpen(true)}>{t('createAdhoc')}</Button>}
      />
      <DataTable
        tableId="maint-tasks"
        columns={columns}
        data={list.data?.items}
        total={list.data?.total ?? 0}
        params={table.params}
        onPageChange={table.setPage}
        onLimitChange={table.setLimit}
        isLoading={list.isPending}
        error={list.error}
        onRetry={() => void list.refetch()}
        getRowId={(row) => row.id}
        onRowClick={(row) => navigate(`/maintenance/tasks/${row.id}`)}
        toolbarLeft={
          <FilterBar
            presets={
              <>
                <FilterPreset
                  active={f.assigneeId === 'me'}
                  onClick={() =>
                    table.setFilter('assigneeId', f.assigneeId === 'me' ? undefined : 'me')
                  }
                >
                  {t('mine')}
                </FilterPreset>
                <FilterPreset
                  active={f.status?.split(',').includes('overdue')}
                  onClick={() =>
                    table.setFilter(
                      'status',
                      f.status?.split(',').includes('overdue') ? undefined : 'overdue',
                    )
                  }
                >
                  {t('overdue')}
                </FilterPreset>
              </>
            }
            onClear={Object.values(f).some(Boolean) ? table.reset : undefined}
          >
            <FilterField label={t('status')}>
              <MultiSelect
                value={f.status?.split(',').filter(Boolean) ?? []}
                onChange={(values) =>
                  table.setFilter('status', values.length ? values.join(',') : undefined)
                }
                placeholder={t('status')}
                options={Object.entries(taskStatusMap).map(([value, option]) => ({
                  value,
                  label: option.label,
                }))}
              />
            </FilterField>
            <FilterField label={t('type')}>
              <Select
                value={f.type ?? '__all__'}
                onValueChange={(value) =>
                  table.setFilter('type', value === '__all__' ? undefined : value)
                }
              >
                <SelectTrigger aria-label={t('type')} className="w-full">
                  <SelectValue placeholder={t('type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t('type')}</SelectItem>
                  {Object.entries(taskTypeMap).map(([value, option]) => (
                    <SelectItem key={value} value={value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label={t('filterEquipment')}>
              <AsyncSelect
                label={t('filterEquipment')}
                placeholder={t('equipment')}
                queryKey="equipment"
                loadOptions={equipmentOptions}
                value={f.equipmentId ?? null}
                clearable
                onChange={(value) =>
                  table.setFilter('equipmentId', typeof value === 'string' ? value : undefined)
                }
              />
            </FilterField>
            <FilterField label={t('from')}>
              <DatePicker
                ariaLabel={t('from')}
                value={f.from ?? ''}
                onChange={(value) => table.setFilter('from', value)}
              />
            </FilterField>
            <FilterField label={t('to')}>
              <DatePicker
                ariaLabel={t('to')}
                value={f.to ?? ''}
                onChange={(value) => table.setFilter('to', value)}
              />
            </FilterField>
            <MoreFilters>
              {canListUsers && (
                <FilterField label={t('filterAssignee')}>
                  <AsyncSelect
                    label={t('filterAssignee')}
                    placeholder={t('assignee')}
                    queryKey="staff-users"
                    loadOptions={staffUserOptions}
                    value={f.assigneeId === 'me' ? null : (f.assigneeId ?? null)}
                    clearable
                    onChange={(value) =>
                      table.setFilter('assigneeId', typeof value === 'string' ? value : undefined)
                    }
                  />
                </FilterField>
              )}
            </MoreFilters>
          </FilterBar>
        }
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t('createAdhoc')}
        form={form}
        onSubmit={async (values) => {
          try {
            const created = await createTask({
              equipmentId: values.equipmentId,
              scheduledAt: values.scheduledAt,
              // `GET /v1/users` chỉ ADM đọc được → role khác mặc định giao cho chính mình.
              assigneeId: values.assigneeId ?? (canListUsers ? undefined : myId),
              templateId: values.templateId ?? undefined,
              notes: values.notes || undefined,
            })
            toast.success(t('taskCreated'))
            void invalidate()
            setOpen(false)
            navigate(`/maintenance/tasks/${created.id}`)
          } catch (error) {
            if (!applyServerErrors(form, error)) toast.error(messageFor(error))
          }
        }}
      >
        <FormField
          control={form.control}
          name="equipmentId"
          render={({ field }) => (
            <FormItem>
              <AsyncSelect
                label={t('equipment')}
                queryKey="equipment"
                loadOptions={equipmentOptions}
                value={field.value || null}
                onChange={(v) => field.onChange(typeof v === 'string' ? v : '')}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <DatetimeField control={form.control} name="scheduledAt" label={t('schedule')} />
        {/* `GET /v1/users` chỉ HOSPITAL_ADMIN đọc được → STAFF không gọi danh bạ. */}
        {canListUsers ? (
          <FormField
            control={form.control}
            name="assigneeId"
            render={({ field }) => (
              <FormItem>
                <AsyncSelect
                  label={t('assignee')}
                  queryKey="staff-users"
                  loadOptions={staffUserOptions}
                  value={field.value}
                  onChange={field.onChange}
                  clearable
                />
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <p className="text-muted-foreground text-sm">{t('assigneeMe')}</p>
        )}
        <FormField
          control={form.control}
          name="templateId"
          render={({ field }) => (
            <FormItem>
              <AsyncSelect
                label="Checklist"
                queryKey="templates"
                loadOptions={async (q) =>
                  (templates.data ?? [])
                    .filter((row) => !q || row.name.toLowerCase().includes(q.toLowerCase()))
                    .map((row) => ({ id: row.id, code: '', name: row.name }))
                }
                value={field.value}
                onChange={field.onChange}
                clearable
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <TextField control={form.control} name="notes" label={t('notes')} />
      </FormDialog>
    </>
  )
}
