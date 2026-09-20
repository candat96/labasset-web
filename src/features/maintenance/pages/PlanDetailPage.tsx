import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/status-badge'
import { commonStatusMap, taskStatusMap } from '@/lib/status-maps'
import { formatDate } from '@/lib/format/date'
import { messageFor } from '@/api/errors'
import { FormDialog } from '@/components/form/FormDialog'
import { TextField, NumberField, SelectField, SwitchField } from '@/components/form/fields'
import { DateField } from '@/components/form/date-field'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AsyncSelect } from '@/components/form/async-select'
import { apiBody } from '@/api/client'
import { catalogOptions, equipmentOptions, staffUserOptions } from '@/api/references'
import { useCan } from '@/app/guards/useCan'
import { ADM, STAFF } from '@/routes/roles'
import { generatePlan, listTasks, previewPlan, updatePlan } from '../api'
import { useInvalidatePlans, useInvalidateTasks, usePlan } from '../hooks'
import { planSchema, type PlanForm } from '../schema'
import { useTranslation } from 'react-i18next'

export function Component() {
  const { t } = useTranslation('maintenance')

  const { id = '' } = useParams()
  const detail = usePlan(id)
  const yearNow = new Date().getUTCFullYear()
  const [year, setYear] = useState(String(yearNow))
  const invalidatePlans = useInvalidatePlans()
  const invalidateTasks = useInvalidateTasks()
  const canWrite = useCan(STAFF)
  const canListUsers = useCan(ADM)
  const [editOpen, setEditOpen] = useState(false)
  const form = useForm<PlanForm>({ resolver: zodResolver(planSchema) })
  const preview = useQuery({
    queryKey: ['maintenance', 'plans', id, 'preview', year],
    queryFn: () => previewPlan(id, Number(year)),
    enabled: !!id,
  })
  const tasks = useQuery({
    queryKey: ['maintenance', 'tasks', { planId: id }],
    queryFn: () => listTasks({ planId: id, page: 1, limit: 50 }),
    enabled: !!id,
  })
  useEffect(() => {
    const row = detail.data
    if (!row) return
    form.reset({
      name: row.name,
      target: row.equipmentId ? 'equipment' : 'group',
      equipmentId: row.equipmentId,
      groupId: row.groupId,
      templateId: row.templateId,
      cycleKind: row.cycleDays ? 'days' : 'months',
      cycleValue: row.cycleDays ?? row.cycleMonths ?? 1,
      startDate: row.startDate,
      endDate: row.endDate ?? '',
      defaultAssigneeId: row.defaultAssigneeId,
      source: row.source,
      supplierId: row.supplierId,
      contractNo: row.contractNo ?? '',
      isActive: row.isActive,
    })
  }, [detail.data, form])
  if (detail.isPending) return <p role="status">{t('loadingPlan')}</p>
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data
  const previewRows = Array.isArray(preview.data)
    ? preview.data
    : ((preview.data as { items?: unknown[] } | undefined)?.items ?? [])
  return (
    <>
      <PageHeader
        title={row.name}
        badge={<StatusBadge value={row.isActive ? 'active' : 'inactive'} map={commonStatusMap} />}
        actions={canWrite && <Button onClick={() => setEditOpen(true)}>{t('editPlan')}</Button>}
      />
      <dl className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">{t('cycle')}</dt>
          <dd>
            {row.cycleMonths
              ? t('cycleMonthsValue', { count: row.cycleMonths })
              : t('cycleDaysValue', { count: row.cycleDays ?? '—' })}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">{t('start')}</dt>
          <dd>{formatDate(row.startDate) || '—'}</dd>
        </div>
      </dl>
      <section className="mb-6 rounded-lg border p-3">
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <Input
            type="number"
            aria-label={t('year')}
            className="w-28"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
          <Button
            onClick={async () => {
              try {
                const result = await generatePlan(id, Number(year))
                toast.success(
                  t('planGenerated', {
                    created: result.created ?? 0,
                    skipped: result.skipped ?? 0,
                  }),
                )
                void invalidatePlans()
                invalidateTasks()
              } catch (error) {
                toast.error(messageFor(error))
              }
            }}
          >
            {t('generateYear')} {year}
          </Button>
        </div>
        <h2 className="mb-2 font-medium">{t('previewTitle')}</h2>
        <ul className="space-y-1 text-sm">
          {previewRows.map((item, index) => {
            if (typeof item === 'string') {
              return (
                <li key={item}>
                  {formatDate(item) || item}
                  {t('previewWillCreate')}
                </li>
              )
            }
            const rec = item as Record<string, unknown>
            return (
              <li key={index}>
                {String(rec.equipmentCode ?? rec.equipmentId ?? t('equipment'))} ·{' '}
                {String(rec.scheduledAt ?? rec.date ?? '')}
                {rec.exists || rec.hasTask ? t('previewExists') : t('previewWillCreate')}
              </li>
            )
          })}
          {previewRows.length === 0 && (
            <li className="text-muted-foreground">{t('previewEmpty')}</li>
          )}
        </ul>
      </section>
      <FormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title={t('editPlan')}
        width="lg"
        form={form}
        onSubmit={async (values) => {
          try {
            await updatePlan(
              id,
              apiBody({
                name: values.name,
                templateId: values.templateId,
                startDate: values.startDate,
                endDate: values.endDate || null,
                equipmentId: values.target === 'equipment' ? values.equipmentId : null,
                groupId: values.target === 'group' ? values.groupId : null,
                cycleMonths: values.cycleKind === 'months' ? values.cycleValue : null,
                cycleDays: values.cycleKind === 'days' ? values.cycleValue : null,
                defaultAssigneeId: canListUsers ? values.defaultAssigneeId : null,
                source: values.source,
                supplierId: values.source === 'vendor_contract' ? values.supplierId : null,
                contractNo: values.contractNo || null,
                isActive: values.isActive,
              }),
            )
            toast.success(t('planSaved'))
            setEditOpen(false)
            void invalidatePlans()
          } catch (error) {
            toast.error(messageFor(error))
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
        {form.watch('target') === 'equipment' ? (
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
        <TextField control={form.control} name="templateId" label="Checklist ID" />
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
      <section>
        <h2 className="mb-2 font-medium">{t('generatedTasks')}</h2>
        <ul className="space-y-1 text-sm">
          {(tasks.data?.items ?? []).map((task) => (
            <li key={task.id}>
              <Link className="text-primary hover:underline" to={`/maintenance/tasks/${task.id}`}>
                {task.code}
              </Link>{' '}
              <StatusBadge value={task.status} map={taskStatusMap} />
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
