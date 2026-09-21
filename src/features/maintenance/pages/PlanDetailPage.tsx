import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { PageHeader, PageMeta } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { DataList } from '@/components/page/DataList'
import { DetailSkeleton } from '@/components/page/DetailSkeleton'
import { EmptyState } from '@/components/page/EmptyState'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ErrorState } from '@/components/page/ErrorState'
import { CalendarDays, CalendarRange, ClipboardCheck, Repeat, Wrench } from 'lucide-react'
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
  if (detail.isPending) return <DetailSkeleton label={t('loadingPlan')} />
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data
  const previewRows = Array.isArray(preview.data)
    ? preview.data
    : ((preview.data as { items?: unknown[] } | undefined)?.items ?? [])
  const cycleLabel = row.cycleMonths
    ? t('cycleMonthsValue', { count: row.cycleMonths })
    : t('cycleDaysValue', { count: row.cycleDays ?? '—' })
  const taskRows = tasks.data?.items ?? []
  return (
    <>
      <PageHeader
        eyebrow={t('plansTitle')}
        title={row.name}
        badge={<StatusBadge value={row.isActive ? 'active' : 'inactive'} map={commonStatusMap} />}
        meta={
          <>
            <PageMeta icon={<Repeat />}>{cycleLabel}</PageMeta>
            <PageMeta icon={<CalendarDays />}>
              {t('start')}: {formatDate(row.startDate)}
              {row.endDate ? ` → ${formatDate(row.endDate)}` : ''}
            </PageMeta>
            <PageMeta icon={<Wrench />}>
              {row.source === 'vendor_contract' ? t('sourceVendor') : t('sourceInternal')}
            </PageMeta>
          </>
        }
        actions={canWrite && <Button onClick={() => setEditOpen(true)}>{t('editPlan')}</Button>}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SectionCard
            title={t('previewTitle')}
            description={t('previewHint', {
              defaultValue: 'Các mốc bảo dưỡng dự kiến trong năm; bấm sinh để tạo công việc.',
            })}
            actions={
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  aria-label={t('year')}
                  className="w-24"
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
            }
            flush={previewRows.length > 0}
          >
            {previewRows.length === 0 ? (
              <EmptyState icon={CalendarRange} title={t('previewEmpty')} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">{t('equipment')}</TableHead>
                    <TableHead>{t('scheduledAt', { defaultValue: 'Ngày dự kiến' })}</TableHead>
                    <TableHead className="pr-5">
                      {t('status', { defaultValue: 'Trạng thái' })}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((item, index) => {
                    if (typeof item === 'string') {
                      return (
                        <TableRow key={item}>
                          <TableCell className="pl-5 font-medium">{t('equipment')}</TableCell>
                          <TableCell className="tabular-nums">{formatDate(item) || item}</TableCell>
                          <TableCell className="pr-5">
                            <StatusBadge
                              value="new"
                              map={{
                                new: {
                                  label: t('previewNew', { defaultValue: 'Sẽ tạo' }),
                                  tone: 'info',
                                },
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    }
                    const rec = item as Record<string, unknown>
                    const exists = Boolean(rec.exists || rec.hasTask)
                    const when = String(rec.scheduledAt ?? rec.date ?? '')
                    return (
                      <TableRow key={index}>
                        <TableCell className="pl-5 font-medium">
                          {String(rec.equipmentCode ?? rec.equipmentId ?? t('equipment'))}
                        </TableCell>
                        <TableCell className="tabular-nums">{formatDate(when) || when}</TableCell>
                        <TableCell className="pr-5">
                          <StatusBadge
                            value={exists ? 'exists' : 'new'}
                            map={{
                              exists: {
                                label: t('previewHas', { defaultValue: 'Đã có task' }),
                                tone: 'muted',
                              },
                              new: {
                                label: t('previewNew', { defaultValue: 'Sẽ tạo' }),
                                tone: 'info',
                              },
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </SectionCard>
          <SectionCard
            title={t('generatedTasks')}
            description={t('taskCount', { defaultValue: '{{n}} công việc', n: taskRows.length })}
            flush={taskRows.length > 0}
          >
            {taskRows.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title={t('noTasks', { defaultValue: 'Chưa sinh công việc nào' })}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-5">{t('code', { defaultValue: 'Mã' })}</TableHead>
                    <TableHead>{t('scheduledAt', { defaultValue: 'Ngày dự kiến' })}</TableHead>
                    <TableHead>{t('dueAt', { defaultValue: 'Hạn' })}</TableHead>
                    <TableHead className="pr-5">
                      {t('status', { defaultValue: 'Trạng thái' })}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taskRows.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="pl-5">
                        <Link
                          className="text-primary font-semibold hover:underline"
                          to={`/maintenance/tasks/${task.id}`}
                        >
                          {task.code}
                        </Link>
                      </TableCell>
                      <TableCell className="tabular-nums">{formatDate(task.scheduledAt)}</TableCell>
                      <TableCell className="tabular-nums">{formatDate(task.dueAt)}</TableCell>
                      <TableCell className="pr-5">
                        <StatusBadge value={task.status} map={taskStatusMap} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </SectionCard>
        </div>
        <div className="space-y-5">
          <SectionCard title={t('info', { defaultValue: 'Thông tin' })}>
            <DataList
              columns={1}
              items={[
                { label: t('cycle'), value: cycleLabel },
                { label: t('start'), value: formatDate(row.startDate) || null },
                { label: t('endDate'), value: row.endDate ? formatDate(row.endDate) : null },
                {
                  label: t('target'),
                  value: row.equipmentId ? t('equipment') : t('group'),
                },
                {
                  label: t('source'),
                  value: row.source === 'vendor_contract' ? t('sourceVendor') : t('sourceInternal'),
                },
                ...(row.source === 'vendor_contract'
                  ? [{ label: t('contractNo'), value: row.contractNo }]
                  : []),
                { label: 'Checklist ID', value: row.templateId },
              ]}
            />
          </SectionCard>
        </div>
      </div>
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
    </>
  )
}
