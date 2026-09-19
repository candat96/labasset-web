import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/status-badge'
import { taskStatusMap, taskTypeMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { FormDialog } from '@/components/form/FormDialog'
import { TextField } from '@/components/form/fields'
import { DatetimeField } from '@/components/form/datetime-field'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AsyncSelect } from '@/components/form/async-select'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { applyServerErrors, messageFor } from '@/api/errors'
import { equipmentOptions, staffUserOptions } from '@/api/references'
import { createTask } from '../api'
import { useInvalidateMaint, useTasks, useTemplates } from '../hooks'
import { adhocSchema, type AdhocForm } from '../schema'
import type { Task } from '../types'

export function Component() {
  const canWrite = useCan(STAFF)
  const navigate = useNavigate()
  const table = useServerTable({
    filterKeys: [
      'status',
      'type',
      'assigneeId',
      'equipmentId',
      'departmentId',
      'from',
      'to',
      'planId',
    ],
  })
  const f = table.params.filters
  const params = {
    page: table.params.page,
    limit: table.params.limit,
    q: table.params.q || undefined,
    status: f.status,
    type: f.type as Task['type'] | undefined,
    assigneeId: f.assigneeId,
    equipmentId: f.equipmentId,
    departmentId: f.departmentId,
    from: f.from,
    to: f.to,
    planId: f.planId,
  }
  const list = useTasks(params)
  const templates = useTemplates()
  const invalidate = useInvalidateMaint()
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
        header: 'Mã',
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
        header: 'Loại',
        cell: ({ row }) => <StatusBadge value={row.original.type} map={taskTypeMap} />,
      },
      {
        accessorKey: 'scheduledAt',
        header: 'Lịch',
        cell: ({ getValue }) => formatDateTime(getValue<string>()),
      },
      {
        accessorKey: 'dueAt',
        header: 'Hạn',
        cell: ({ getValue }) => formatDateTime(getValue<string>()),
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => <StatusBadge value={row.original.status} map={taskStatusMap} />,
      },
      {
        accessorKey: 'overallPass',
        header: 'Kết quả',
        cell: ({ row }) =>
          row.original.overallPass == null ? '—' : row.original.overallPass ? '✓' : '✗',
      },
    ],
    [],
  )
  return (
    <>
      <PageHeader
        title="Công việc bảo dưỡng"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => table.setFilter('assigneeId', 'me')}>
              Của tôi
            </Button>
            {canWrite && <Button onClick={() => setOpen(true)}>Tạo đột xuất</Button>}
          </div>
        }
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
          <Input
            aria-label="Tìm việc"
            value={table.inputQ}
            onChange={(e) => table.setQ(e.target.value)}
          />
        }
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Tạo đột xuất"
        form={form}
        onSubmit={async (values) => {
          try {
            const created = await createTask({
              equipmentId: values.equipmentId,
              scheduledAt: values.scheduledAt,
              assigneeId: values.assigneeId ?? undefined,
              templateId: values.templateId ?? undefined,
              notes: values.notes || undefined,
            })
            toast.success('Đã tạo công việc')
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
                label="Máy"
                queryKey="equipment"
                loadOptions={equipmentOptions}
                value={field.value || null}
                onChange={(v) => field.onChange(typeof v === 'string' ? v : '')}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <DatetimeField control={form.control} name="scheduledAt" label="Lịch" />
        <FormField
          control={form.control}
          name="assigneeId"
          render={({ field }) => (
            <FormItem>
              <AsyncSelect
                label="Người làm"
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
        <TextField control={form.control} name="notes" label="Ghi chú" />
      </FormDialog>
    </>
  )
}
