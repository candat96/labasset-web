import { Link, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { PageHeader, PageMeta } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { DataList } from '@/components/page/DataList'
import { DetailSkeleton } from '@/components/page/DetailSkeleton'
import { AuditTrail } from '@/components/audit-trail'
import { ErrorState } from '@/components/page/ErrorState'
import { Award, CalendarClock, CalendarDays, Microscope, User, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { Timeline } from '@/components/timeline'
import { useConfirm } from '@/components/confirm-dialog'
import { calibrationResultMap, calibrationStatusMap, calibrationTypeMap } from '@/lib/status-maps'
import { formatDate, formatDateTime } from '@/lib/format/date'
import { formatVnd } from '@/lib/format/money'
import { useCan } from '@/app/guards/useCan'
import { ADM, STAFF } from '@/routes/roles'
import { FormDialog } from '@/components/form/FormDialog'
import { DateField } from '@/components/form/date-field'
import { DatetimeField } from '@/components/form/datetime-field'
import { FileField } from '@/components/form/file-field'
import { MoneyField } from '@/components/form/money-field'
import { NumberField, SelectField, TextField } from '@/components/form/fields'
import { AsyncSelect } from '@/components/form/async-select'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { apiBody } from '@/api/client'
import { applyServerErrors, messageFor } from '@/api/errors'
import { decimalString } from '@/lib/validation/decimal'
import { catalogOptions, staffUserOptions } from '@/api/references'
import {
  calibrationHistory,
  cancelCalibration,
  completeCalibration,
  getCalibration,
  updateCalibration,
} from '../api'
import { useTranslation } from 'react-i18next'

const completeSchema = z.object({
  performedAt: z.string().min(1),
  result: z.enum(['pass', 'fail', 'conditional']),
  certificateNo: z.string(),
  certificateFileId: z.string().nullable(),
  cost: decimalString({ maxScale: 0, min: '0' }),
  findings: z.string(),
  nextDueAt: z.string(),
})
type CompleteForm = z.infer<typeof completeSchema>
const editSchema = z.object({
  type: z.enum(['inspection', 'calibration']),
  scheduledAt: z.string(),
  agencyId: z.string().nullable(),
  performedByUserId: z.string().nullable(),
  cycleMonths: z.number().int().min(1),
  certificateNo: z.string(),
  certificateFileId: z.string().nullable(),
  cost: decimalString({ maxScale: 0, min: '0' }),
  findings: z.string(),
  nextDueAt: z.string(),
})
type EditForm = z.infer<typeof editSchema>

export function Component() {
  const { t } = useTranslation('calibrations')

  const { id = '' } = useParams()
  const detail = useQuery({
    queryKey: ['calibrations', id],
    queryFn: () => getCalibration(id),
    enabled: !!id,
  })
  const isStaff = useCan(STAFF)
  const isAdm = useCan(ADM)
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['calibrations'] })
  }
  const { confirm, dialog } = useConfirm()
  const [completeOpen, setCompleteOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const form = useForm<CompleteForm>({
    resolver: zodResolver(completeSchema),
    defaultValues: {
      performedAt: new Date().toISOString(),
      result: 'pass',
      certificateNo: '',
      certificateFileId: null,
      cost: '',
      findings: '',
      nextDueAt: '',
    },
  })
  const editForm = useForm<EditForm>({ resolver: zodResolver(editSchema) })
  useEffect(() => {
    const row = detail.data
    if (!row) return
    editForm.reset({
      type: row.type,
      scheduledAt: row.scheduledAt ?? '',
      agencyId: row.agencyId,
      performedByUserId: row.performedByUserId,
      cycleMonths: row.cycleMonths,
      certificateNo: row.certificateNo ?? '',
      certificateFileId: row.certificateFileId,
      cost: row.cost,
      findings: row.findings ?? '',
      nextDueAt: row.nextDueAt ?? '',
    })
  }, [detail.data, editForm])
  const history = useQuery({
    queryKey: ['calibrations', 'history', detail.data?.equipmentId],
    queryFn: () => calibrationHistory(detail.data!.equipmentId),
    enabled: !!detail.data?.equipmentId,
  })
  if (detail.isPending) return <DetailSkeleton label={t('loading')} />
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data
  return (
    <>
      {dialog}
      <PageHeader
        eyebrow={t('title')}
        title={row.code}
        badge={
          <div className="flex gap-1">
            <StatusBadge value={row.status} map={calibrationStatusMap} />
            <StatusBadge value={row.type} map={calibrationTypeMap} />
            {row.result && <StatusBadge value={row.result} map={calibrationResultMap} />}
          </div>
        }
        meta={
          <>
            <PageMeta icon={<Microscope />}>
              <Link className="text-primary hover:underline" to={`/equipment/${row.equipmentId}`}>
                {row.equipment?.code} – {row.equipment?.name}
              </Link>
            </PageMeta>
            {row.scheduledAt && (
              <PageMeta icon={<CalendarClock />}>
                {t('schedule')}: {formatDateTime(row.scheduledAt)}
              </PageMeta>
            )}
            {row.performerName && <PageMeta icon={<User />}>{row.performerName}</PageMeta>}
            {row.nextDueAt && (
              <PageMeta icon={<CalendarDays />}>
                {t('nextDue')}: {formatDate(row.nextDueAt)}
              </PageMeta>
            )}
            {row.repairTicketId && (
              <PageMeta icon={<Wrench />}>
                <Link
                  className="text-primary hover:underline"
                  to={`/repairs/${row.repairTicketId}`}
                >
                  {t('repairTicket')}
                </Link>
              </PageMeta>
            )}
          </>
        }
        actions={
          <div className="flex gap-2">
            {isStaff && (
              <Button variant="outline" onClick={() => setEditOpen(true)}>
                {t('edit')}
              </Button>
            )}
            {isStaff && row.status === 'scheduled' && (
              <Button onClick={() => setCompleteOpen(true)}>{t('complete')}</Button>
            )}
            {isAdm && row.status === 'scheduled' && (
              <Button
                variant="outline"
                onClick={async () => {
                  if ((await confirm({ title: t('cancelConfirm'), destructive: true })) === false)
                    return
                  await cancelCalibration(id)
                  toast.success(t('cancelled'))
                  invalidate()
                }}
              >
                {t('cancel')}
              </Button>
            )}
          </div>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SectionCard title={t('info', { defaultValue: 'Thông tin phiếu' })}>
            <DataList
              columns={2}
              items={[
                {
                  label: t('equipment'),
                  value: (
                    <Link
                      className="text-primary hover:underline"
                      to={`/equipment/${row.equipmentId}`}
                    >
                      {row.equipment?.code} – {row.equipment?.name}
                    </Link>
                  ),
                },
                {
                  label: t('type'),
                  value: <StatusBadge value={row.type} map={calibrationTypeMap} />,
                },
                { label: t('schedule'), value: formatDateTime(row.scheduledAt) || null },
                { label: t('performedAt'), value: formatDateTime(row.performedAt) || null },
                { label: t('performedBy'), value: row.performerName },
                { label: t('cycleMonths'), value: row.cycleMonths },
                {
                  label: t('result'),
                  value: row.result ? (
                    <StatusBadge value={row.result} map={calibrationResultMap} />
                  ) : null,
                },
                { label: t('nextDue'), value: formatDate(row.nextDueAt) || null },
                { label: t('certificateNo'), value: row.certificateNo },
                { label: t('cost'), value: formatVnd(row.cost) || null },
                { label: t('findings'), value: row.findings, full: true },
                ...(row.repairTicketId
                  ? [
                      {
                        label: t('repairTicket'),
                        value: (
                          <Link
                            className="text-primary hover:underline"
                            to={`/repairs/${row.repairTicketId}`}
                          >
                            {row.repairTicketId}
                          </Link>
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </SectionCard>
          <SectionCard title={t('audit', { defaultValue: 'Nhật ký thay đổi' })}>
            <AuditTrail entityType="calibration" entityId={id} />
          </SectionCard>
        </div>
        <div className="space-y-5">
          <SectionCard
            title={t('equipmentHistory')}
            description={t('equipmentHistoryHint', {
              defaultValue: 'Các lần kiểm định/hiệu chuẩn của máy này',
            })}
          >
            <Timeline
              events={(history.data ?? []).map((item) => ({
                at: item.performedAt ?? item.scheduledAt ?? item.createdAt,
                title: item.code,
                summary: item.result
                  ? (calibrationResultMap[item.result]?.label ?? item.result)
                  : (calibrationStatusMap[item.status]?.label ?? item.status),
                tone:
                  item.result === 'pass'
                    ? ('success' as const)
                    : item.result === 'fail'
                      ? ('danger' as const)
                      : item.result === 'conditional'
                        ? ('warning' as const)
                        : item.id === row.id
                          ? ('primary' as const)
                          : ('muted' as const),
                icon: item.result ? <Award /> : undefined,
              }))}
            />
          </SectionCard>
        </div>
      </div>
      <FormDialog
        open={completeOpen}
        onOpenChange={setCompleteOpen}
        title={t('complete')}
        form={form}
        onSubmit={async (values) => {
          try {
            await completeCalibration(
              id,
              apiBody({
                performedAt: values.performedAt,
                result: values.result,
                certificateNo: values.certificateNo || undefined,
                certificateFileId: values.certificateFileId ?? undefined,
                cost: values.cost || undefined,
                findings: values.findings || undefined,
                nextDueAt: values.nextDueAt || undefined,
              }),
            )
            toast.success(t('completed'))
            setCompleteOpen(false)
            invalidate()
          } catch (error) {
            if (!applyServerErrors(form, error)) toast.error(messageFor(error))
          }
        }}
      >
        <DatetimeField control={form.control} name="performedAt" label={t('performedAt')} />
        <SelectField
          control={form.control}
          name="result"
          label={t('result')}
          options={[
            { value: 'pass', label: t('pass') },
            { value: 'fail', label: t('fail') },
            { value: 'conditional', label: t('conditional') },
          ]}
        />
        <TextField control={form.control} name="certificateNo" label={t('certificateNo')} />
        <FormField
          control={form.control}
          name="certificateFileId"
          render={({ field }) => (
            <FormItem>
              <FileField label={t('certificate')} value={field.value} onChange={field.onChange} />
              <FormMessage />
            </FormItem>
          )}
        />
        <MoneyField control={form.control} name="cost" label={t('cost')} />
        <TextField control={form.control} name="findings" label={t('findings')} />
        <DateField control={form.control} name="nextDueAt" label={t('nextDue')} />
      </FormDialog>
      <FormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title={t('edit')}
        form={editForm}
        onSubmit={async (values) => {
          try {
            await updateCalibration(
              id,
              apiBody({
                type: values.type,
                scheduledAt: values.scheduledAt || undefined,
                agencyId: values.agencyId,
                performedByUserId: isAdm ? values.performedByUserId : undefined,
                cycleMonths: values.cycleMonths,
                certificateNo: values.certificateNo || null,
                certificateFileId: values.certificateFileId,
                cost: values.cost || undefined,
                findings: values.findings || null,
                nextDueAt: values.nextDueAt || undefined,
              }),
            )
            toast.success(t('saved'))
            setEditOpen(false)
            invalidate()
          } catch (error) {
            if (!applyServerErrors(editForm, error)) toast.error(messageFor(error))
          }
        }}
      >
        <SelectField
          control={editForm.control}
          name="type"
          label={t('type')}
          options={[
            { value: 'inspection', label: t('typeInspection') },
            { value: 'calibration', label: t('typeCalibration') },
          ]}
        />
        <DatetimeField control={editForm.control} name="scheduledAt" label={t('schedule')} />
        <FormField
          control={editForm.control}
          name="agencyId"
          render={({ field }) => (
            <FormItem>
              <AsyncSelect
                label={t('agency')}
                queryKey="calibration-agencies"
                loadOptions={(q) => catalogOptions('calibration-agencies', q)}
                value={field.value}
                onChange={field.onChange}
                clearable
              />
              <FormMessage />
            </FormItem>
          )}
        />
        {isAdm && (
          <FormField
            control={editForm.control}
            name="performedByUserId"
            render={({ field }) => (
              <FormItem>
                <AsyncSelect
                  label={t('performedBy')}
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
        <NumberField
          control={editForm.control}
          name="cycleMonths"
          label={t('cycleMonths')}
          min={1}
        />
        <TextField control={editForm.control} name="certificateNo" label={t('certificateNo')} />
        <FormField
          control={editForm.control}
          name="certificateFileId"
          render={({ field }) => (
            <FormItem>
              <FileField label={t('certificate')} value={field.value} onChange={field.onChange} />
              <FormMessage />
            </FormItem>
          )}
        />
        <MoneyField control={editForm.control} name="cost" label={t('cost')} />
        <TextField control={editForm.control} name="findings" label={t('findings')} />
        <DateField control={editForm.control} name="nextDueAt" label={t('nextDue')} />
      </FormDialog>
    </>
  )
}
