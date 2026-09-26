import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar, FilterField } from '@/components/filter-bar'
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
import { ADM, STAFF } from '@/routes/roles'
import { applyServerErrors, messageFor } from '@/api/errors'
import { apiBody } from '@/api/client'
import { catalogOptions, equipmentOptions, staffUserOptions } from '@/api/references'
import { useState } from 'react'
import { createPlan } from '../api'
import { useInvalidatePlans, usePlans, useTemplates } from '../hooks'
import { planSchema, type PlanForm } from '../schema'
import type { Plan } from '../types'
import { useTranslation } from 'react-i18next'

export function Component() {
  const { t } = useTranslation('maintenance')

  const canWrite = useCan(STAFF)
  const canListUsers = useCan(ADM)
  const navigate = useNavigate()
  const table = useServerTable()
  const list = usePlans()
  const templates = useTemplates()
  const invalidate = useInvalidatePlans()
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
        header: t('name'),
        cell: ({ row }) => (
          <Link className="text-primary" to={`/maintenance/plans/${row.original.id}`}>
            {row.original.name}
          </Link>
        ),
      },
      {
        id: 'target',
        header: t('target'),
        cell: ({ row }) => (row.original.equipmentId ? t('equipment') : t('group')),
      },
      {
        id: 'cycle',
        header: t('cycle'),
        cell: ({ row }) =>
          row.original.cycleMonths
            ? t('cycleMonthsValue', { count: row.original.cycleMonths })
            : t('cycleDaysValue', { count: row.original.cycleDays ?? '—' }),
      },
      {
        accessorKey: 'isActive',
        header: t('status'),
        cell: ({ row }) => (
          <StatusBadge
            value={row.original.isActive ? 'active' : 'inactive'}
            map={commonStatusMap}
          />
        ),
      },
    ],
    [t],
  )
  const target = form.watch('target')
  return (
    <>
      <PageHeader
        title={t('plansTitle')}
        description={t('plansHint', {
          defaultValue:
            'Kế hoạch bảo dưỡng định kỳ theo máy hoặc nhóm máy; sinh công việc theo năm.',
        })}
        actions={canWrite && <Button onClick={() => setOpen(true)}>{t('createPlan')}</Button>}
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
          <FilterBar>
            <FilterField label={t('searchPlan')}>
              <Input
                aria-label={t('searchPlan')}
                value={table.inputQ}
                onChange={(e) => table.setQ(e.target.value)}
                placeholder={t('searchPlan')}
              />
            </FilterField>
          </FilterBar>
        }
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={t('createPlan')}
        width="lg"
        form={form}
        onSubmit={async (values) => {
          try {
            const created = await createPlan(
              apiBody({
                name: values.name,
                templateId: values.templateId,
                startDate: values.startDate,
                endDate: values.endDate || null,
                equipmentId: values.target === 'equipment' ? values.equipmentId : null,
                groupId: values.target === 'group' ? values.groupId : null,
                cycleMonths: values.cycleKind === 'months' ? values.cycleValue : null,
                cycleDays: values.cycleKind === 'days' ? values.cycleValue : null,
                // `GET /v1/users` chỉ ADM đọc được → role khác không chọn người mặc định.
                defaultAssigneeId: canListUsers ? values.defaultAssigneeId : null,
                source: values.source,
                supplierId: values.source === 'vendor_contract' ? values.supplierId : null,
                contractNo: values.contractNo || null,
                isActive: values.isActive,
              }),
            )
            toast.success(t('planCreated'))
            void invalidate()
            setOpen(false)
            navigate(`/maintenance/plans/${created.id}`)
          } catch (error) {
            if (!applyServerErrors(form, error)) toast.error(messageFor(error))
          }
        }}
      >
        <TextField control={form.control} name="name" label={t('name')} />
        <SelectField
          control={form.control}
          name="target"
          label={t('target')}
          options={[
            { value: 'equipment', label: t('equipment') },
            { value: 'group', label: t('group') },
          ]}
        />
        {target === 'equipment' ? (
          <FormField
            control={form.control}
            name="equipmentId"
            render={({ field }) => (
              <FormItem>
                <AsyncSelect
                  label={t('equipment')}
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
                  label={t('equipmentGroup')}
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
          label={t('cycle')}
          options={[
            { value: 'months', label: t('optionMonths') },
            { value: 'days', label: t('optionDays') },
          ]}
        />
        <NumberField control={form.control} name="cycleValue" label={t('cycleValue')} min={1} />
        <DateField control={form.control} name="startDate" label={t('start')} />
        <DateField control={form.control} name="endDate" label={t('endDate')} />
        {/* `GET /v1/users` chỉ HOSPITAL_ADMIN đọc được → STAFF không gọi danh bạ. */}
        {canListUsers && (
          <FormField
            control={form.control}
            name="defaultAssigneeId"
            render={({ field }) => (
              <FormItem>
                <AsyncSelect
                  label={t('defaultAssignee')}
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
        )}
        <SelectField
          control={form.control}
          name="source"
          label={t('source')}
          options={[
            { value: 'internal', label: t('sourceInternal') },
            { value: 'vendor_contract', label: t('sourceVendor') },
          ]}
        />
        {form.watch('source') === 'vendor_contract' && (
          <>
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <AsyncSelect
                    label={t('supplier')}
                    queryKey="suppliers"
                    loadOptions={(q) => catalogOptions('suppliers', q)}
                    value={field.value}
                    onChange={field.onChange}
                    clearable
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
            <TextField control={form.control} name="contractNo" label={t('contractNo')} />
          </>
        )}
        <SwitchField control={form.control} name="isActive" label={t('isActive')} />
      </FormDialog>
    </>
  )
}
