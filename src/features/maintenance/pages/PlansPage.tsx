import { useMemo } from 'react'
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
import { commonStatusMap } from '@/lib/status-maps'
import { FormDialog } from '@/components/form/FormDialog'
import { TextField, NumberField, SelectField, SwitchField } from '@/components/form/fields'
import { DateField } from '@/components/form/date-field'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AsyncSelect } from '@/components/form/async-select'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { applyServerErrors, messageFor } from '@/api/errors'
import { catalogOptions, equipmentOptions, staffUserOptions } from '@/api/references'
import { useState } from 'react'
import { createPlan } from '../api'
import { useInvalidateMaint, usePlans, useTemplates } from '../hooks'
import { planSchema, type PlanForm } from '../schema'
import type { Plan } from '../types'

export function Component() {
  const canWrite = useCan(STAFF)
  const navigate = useNavigate()
  const table = useServerTable()
  const list = usePlans()
  const templates = useTemplates()
  const invalidate = useInvalidateMaint()
  const [open, setOpen] = useState(false)
  const form = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      name: '',
      target: 'group',
      equipmentId: null,
      groupId: null,
      templateId: '',
      cycleKind: 'months',
      cycleValue: 6,
      startDate: '',
      endDate: '',
      defaultAssigneeId: null,
      source: 'internal',
      supplierId: null,
      contractNo: '',
      isActive: true,
    },
  })
  const q = table.params.q.toLowerCase()
  const items = (list.data ?? []).filter((row) => !q || row.name.toLowerCase().includes(q))
  const columns = useMemo<ColumnDef<Plan>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Tên',
        cell: ({ row }) => (
          <Link
            className="text-primary hover:underline"
            to={`/maintenance/plans/${row.original.id}`}
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: 'target',
        header: 'Đối tượng',
        cell: ({ row }) => (row.original.equipmentId ? 'Máy' : 'Nhóm'),
      },
      {
        id: 'cycle',
        header: 'Chu kỳ',
        cell: ({ row }) =>
          row.original.cycleMonths
            ? `${row.original.cycleMonths} tháng`
            : `${row.original.cycleDays ?? '—'} ngày`,
      },
      {
        accessorKey: 'isActive',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <StatusBadge
            value={row.original.isActive ? 'active' : 'inactive'}
            map={commonStatusMap}
          />
        ),
      },
    ],
    [],
  )
  const target = form.watch('target')
  return (
    <>
      <PageHeader
        title="Kế hoạch bảo dưỡng"
        actions={canWrite && <Button onClick={() => setOpen(true)}>Thêm kế hoạch</Button>}
      />
      <DataTable
        tableId="maint-plans"
        columns={columns}
        data={items}
        total={items.length}
        params={table.params}
        onPageChange={table.setPage}
        onLimitChange={table.setLimit}
        isLoading={list.isPending}
        error={list.error}
        onRetry={() => void list.refetch()}
        getRowId={(row) => row.id}
        onRowClick={(row) => navigate(`/maintenance/plans/${row.id}`)}
        toolbarLeft={
          <Input
            aria-label="Tìm kế hoạch"
            value={table.inputQ}
            onChange={(e) => table.setQ(e.target.value)}
          />
        }
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Thêm kế hoạch"
        width="lg"
        form={form}
        onSubmit={async (values) => {
          try {
            const created = await createPlan({
              name: values.name,
              templateId: values.templateId,
              startDate: values.startDate,
              endDate: values.endDate || null,
              equipmentId: values.target === 'equipment' ? values.equipmentId : null,
              groupId: values.target === 'group' ? values.groupId : null,
              cycleMonths: values.cycleKind === 'months' ? values.cycleValue : null,
              cycleDays: values.cycleKind === 'days' ? values.cycleValue : null,
              defaultAssigneeId: values.defaultAssigneeId,
              source: values.source,
              supplierId: values.source === 'vendor_contract' ? values.supplierId : null,
              contractNo: values.contractNo || null,
              isActive: values.isActive,
            } as never)
            toast.success('Đã tạo kế hoạch')
            void invalidate()
            setOpen(false)
            navigate(`/maintenance/plans/${created.id}`)
          } catch (error) {
            if (!applyServerErrors(form, error)) toast.error(messageFor(error))
          }
        }}
      >
        <TextField control={form.control} name="name" label="Tên" />
        <SelectField
          control={form.control}
          name="target"
          label="Đối tượng"
          options={[
            { value: 'equipment', label: 'Máy' },
            { value: 'group', label: 'Nhóm' },
          ]}
        />
        {target === 'equipment' ? (
          <FormField
            control={form.control}
            name="equipmentId"
            render={({ field }) => (
              <FormItem>
                <AsyncSelect
                  label="Máy"
                  queryKey="equipment"
                  loadOptions={equipmentOptions}
                  value={field.value}
                  onChange={field.onChange}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <FormField
            control={form.control}
            name="groupId"
            render={({ field }) => (
              <FormItem>
                <AsyncSelect
                  label="Nhóm máy"
                  queryKey="equipment-groups"
                  loadOptions={(q) => catalogOptions('equipment-groups', q)}
                  value={field.value}
                  onChange={field.onChange}
                />
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <SelectField
          control={form.control}
          name="templateId"
          label="Checklist"
          options={(templates.data ?? []).map((row) => ({ value: row.id, label: row.name }))}
        />
        <SelectField
          control={form.control}
          name="cycleKind"
          label="Chu kỳ"
          options={[
            { value: 'months', label: 'Tháng' },
            { value: 'days', label: 'Ngày' },
          ]}
        />
        <NumberField control={form.control} name="cycleValue" label="Số" min={1} />
        <DateField control={form.control} name="startDate" label="Bắt đầu" />
        <DateField control={form.control} name="endDate" label="Kết thúc" />
        <FormField
          control={form.control}
          name="defaultAssigneeId"
          render={({ field }) => (
            <FormItem>
              <AsyncSelect
                label="Người mặc định"
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
        <SelectField
          control={form.control}
          name="source"
          label="Nguồn"
          options={[
            { value: 'internal', label: 'Nội bộ' },
            { value: 'vendor_contract', label: 'Hợp đồng nhà thầu' },
          ]}
        />
        <SwitchField control={form.control} name="isActive" label="Đang dùng" />
      </FormDialog>
    </>
  )
}
