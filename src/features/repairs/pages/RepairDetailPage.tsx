import { useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { useForm, useFieldArray, useFormState, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Big from 'big.js'
import { toast } from 'sonner'
import { DetailLayout } from '@/components/detail-layout'
import { PageMeta } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { DataList } from '@/components/page/DataList'
import { DetailSkeleton } from '@/components/page/DetailSkeleton'
import { EmptyState } from '@/components/page/EmptyState'
import { ActionMenu } from '@/components/page/ActionMenu'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ErrorState } from '@/components/page/ErrorState'
import {
  Ban,
  Building2,
  CalendarClock,
  ClipboardList,
  Coins,
  Package,
  Pencil,
  Printer,
  RefreshCw,
  Sparkles,
  Stethoscope,
  Truck,
  TriangleAlert,
  User,
  UserPlus,
} from 'lucide-react'
import { DeleteIconButton, EditIconButton } from '@/components/icon-action'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { FormDialog } from '@/components/form/FormDialog'
import { TextField, NumberField, SelectField, SwitchField } from '@/components/form/fields'
import { DateField } from '@/components/form/date-field'
import { DatetimeField } from '@/components/form/datetime-field'
import { MoneyField } from '@/components/form/money-field'
import { QtyField } from '@/components/form/qty-field'
import { FileField } from '@/components/form/file-field'
import { AsyncSelect } from '@/components/form/async-select'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { AttachmentsPanel } from '@/components/attachments-panel'
import { Timeline } from '@/components/timeline'
import { AuditTrail } from '@/components/audit-trail'
import { useConfirm } from '@/components/confirm-dialog'
import { FaultSuggestBox } from '@/components/fault-suggest-box'
import {
  assignmentResponseMap,
  costCategoryMap,
  faultSeverityMap,
  partSourceMap,
  repairStatusMap,
} from '@/lib/status-maps'
import { formatDate, formatDateTime } from '@/lib/format/date'
import { formatVnd } from '@/lib/format/money'
import { formatQty } from '@/lib/format/number'
import { useCan } from '@/app/guards/useCan'
import { ADM } from '@/routes/roles'
import { applyServerErrors, messageFor } from '@/api/errors'
import {
  catalogOptions,
  resolveCatalogItem,
  staffUserOptions,
  supplyOptions,
} from '@/api/references'
import { attachFile, uploadFile } from '@/api/files'
import { getFileUrl } from '@/api/files'
import { useAuthStore } from '@/stores/auth.store'
import { assistantPath } from '@/lib/ai-link'
import * as api from '../api'
import { listRepairsForEquipment } from '@/features/equipment/api'
import {
  useDepartmentNames,
  usePublicRepairSettings,
  useRepair,
  useInvalidateRepair,
  useStockLotNames,
  useSupplierNames,
  useUserNames,
} from '../hooks'
import {
  availableStatuses,
  canWriteRepair,
  visibleRepairActions,
  type RepairAction,
} from '../actions'
import {
  acceptanceSchema,
  assignSchema,
  completeSchema,
  costSchema,
  declineSchema,
  diagnosisSchema,
  editRepairSchema,
  logSchema,
  partSchema,
  signSchema,
  statusSchema,
  vendorSchema,
  type AcceptanceForm,
  type AssignForm,
  type CompleteForm,
  type CostForm,
  type DeclineForm,
  type DiagnosisForm,
  type EditRepairForm,
  type LogForm,
  type PartForm,
  type SignForm,
  type StatusForm,
  type VendorForm,
} from '../schema'
import { COST_CATEGORIES, PART_SOURCES, RESOLUTION_TYPES } from '../types'
import { SignaturePad } from '@/components/signature-pad'
import { StarRating } from '../components/StarRating'
import type { components } from '@/api/schema'

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

export function Component() {
  const { t } = useTranslation('repairs')
  const { id = '' } = useParams()
  const location = useLocation()
  const prefillFault =
    location.state && typeof location.state === 'object'
      ? ((location.state as { faultId?: string }).faultId ?? null)
      : null
  const detail = useRepair(id)
  const settings = usePublicRepairSettings()
  const invalidate = useInvalidateRepair()
  const isAdm = useCan(ADM)
  const userId = useAuthStore((s) => s.user?.id) ?? ''
  const roles = useAuthStore((s) => s.user?.roles)
  const { confirm, dialog } = useConfirm()
  const [open, setOpen] = useState<
    RepairAction | 'log' | 'part' | 'vendor' | 'cost' | 'sign' | 'decline' | null
  >(null)
  const [editingPart, setEditingPart] = useState<
    components['schemas']['RepairPartResponseDto'] | null
  >(null)
  const [editingVendor, setEditingVendor] = useState<
    components['schemas']['RepairVendorResponseDto'] | null
  >(null)
  const [editingCost, setEditingCost] = useState<
    components['schemas']['RepairCostResponseDto'] | null
  >(null)
  const requireAcceptance = settings.data?.['repair.requireAcceptance'] === true
  const row = detail.data
  const actions = useMemo(
    () =>
      row
        ? visibleRepairActions({
            status: row.status,
            roles: roles ?? [],
            userId,
            assignments: row.assignments,
            requireAcceptance,
          })
        : [],
    [row, roles, userId, requireAcceptance],
  )
  const rolesList = roles ?? []
  const isDeptScoped = rolesList.includes('DEPT_HEAD') || rolesList.includes('DEPT_USER')
  const closed = row?.status === 'closed' || row?.status === 'cancelled'
  const afterComplete = ['completed', 'acceptance', 'closed', 'cancelled'].includes(
    row?.status ?? '',
  )
  const canWork = !!row && canWriteRepair(userId, rolesList, row.assignments)
  const canWriteParts = canWork && !afterComplete
  const canCosts = (canWork || isAdm) && !closed
  const canAttach = !closed && (canWork || isDeptScoped || row?.reportedBy === userId)
  const canSignTechnician = canWork && !closed
  const canSignDepartment =
    (isAdm || isDeptScoped) && ['completed', 'acceptance'].includes(row?.status ?? '')

  const run = async (title: string, action: () => Promise<unknown>, destructive = false) => {
    if ((await confirm({ title, destructive })) === false) return
    try {
      await action()
      toast.success(t('detail.actions.updated'))
      invalidate(id)
    } catch (error) {
      toast.error(messageFor(error))
    }
  }

  if (detail.isPending) return <DetailSkeleton label={t('detail.loading')} />
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  if (!row) return null

  const faultInfo = asRecord(row.faultInfo)
  const faultTitle = typeof faultInfo?.title === 'string' ? faultInfo.title : null

  return (
    <>
      {dialog}
      <DetailLayout
        eyebrow={`${t('title', { defaultValue: 'Phiếu sửa chữa' })} · ${row.code}`}
        code={row.code}
        name={row.equipment ? `${row.equipment.code} – ${row.equipment.name}` : row.code}
        meta={<RepairMeta row={row} />}
        badge={
          <div className="flex flex-wrap gap-1">
            <StatusBadge value={row.status} map={repairStatusMap} />
            <StatusBadge value={row.severity} map={faultSeverityMap} />
            {row.isOverdue && (
              <StatusBadge
                value="overdue"
                map={{ overdue: { label: t('detail.overdue'), tone: 'danger' } }}
              />
            )}
            {row.costWarning && (
              <StatusBadge
                value="cost"
                map={{ cost: { label: t('detail.costWarning'), tone: 'danger' } }}
              />
            )}
          </div>
        }
        actions={
          <ActionMenu
            items={[
              actions.includes('accept') && {
                key: 'accept',
                label: t('detail.actions.accept'),
                variant: 'primary' as const,
                onClick: () =>
                  void run(t('detail.actions.acceptConfirm'), () => api.acceptRepair(id)),
              },
              actions.includes('respond') && {
                key: 'respond-accept',
                label: t('detail.respond.accept'),
                variant: 'primary' as const,
                onClick: () =>
                  void run(t('detail.respond.acceptConfirm'), () =>
                    api.respondAssignment(id, { response: 'accepted' }),
                  ),
              },
              actions.includes('respond') && {
                key: 'respond-decline',
                label: t('detail.respond.decline'),
                onClick: () => setOpen('decline'),
              },
              actions.includes('complete') && {
                key: 'complete',
                label: t('detail.actions.complete'),
                variant: 'primary' as const,
                onClick: () => setOpen('complete'),
              },
              actions.includes('acceptance') && {
                key: 'acceptance',
                label: t('detail.actions.acceptance'),
                variant: 'primary' as const,
                onClick: () => setOpen('acceptance'),
              },
              actions.includes('close') && {
                key: 'close',
                label: t('detail.actions.close'),
                variant: 'primary' as const,
                onClick: () =>
                  void run(t('detail.actions.closeConfirm'), () => api.closeRepair(id)),
              },
              actions.includes('diagnosis') && {
                key: 'diagnosis',
                label: t('detail.actions.diagnosis'),
                icon: <Stethoscope />,
                onClick: () => setOpen('diagnosis'),
              },
              actions.includes('status') && {
                key: 'status',
                label: t('detail.actions.status'),
                icon: <RefreshCw />,
                onClick: () => setOpen('status'),
              },
              actions.includes('assign') && {
                key: 'assign',
                label: t('detail.actions.assign'),
                icon: <UserPlus />,
                onClick: () => setOpen('assign'),
              },
              actions.includes('edit') && {
                key: 'edit',
                label: t('detail.actions.edit'),
                icon: <Pencil />,
                onClick: () => setOpen('edit'),
              },
              actions.includes('print') && {
                key: 'print',
                label: t('detail.actions.print'),
                icon: <Printer />,
                onClick: () =>
                  void api.printRepairReport(id).catch((e) => toast.error(messageFor(e))),
              },
              !!row.equipment?.id && {
                key: 'ai',
                label: t('detail.actions.askAi'),
                icon: <Sparkles />,
                to: assistantPath({ equipmentId: row.equipment.id, repairId: id }),
              },
              actions.includes('cancel') && {
                key: 'cancel',
                label: t('detail.actions.cancel'),
                variant: 'destructive' as const,
                icon: <Ban />,
                separator: true,
                onClick: () => {
                  void (async () => {
                    const reason = await confirm({
                      title: t('detail.actions.cancelConfirm'),
                      requireReason: true,
                      destructive: true,
                      confirmLabel: t('detail.actions.cancelConfirmLabel'),
                    })
                    if (reason === false) return
                    try {
                      await api.cancelRepair(id, reason)
                      toast.success(t('detail.actions.cancelled'))
                      invalidate(id)
                    } catch (error) {
                      toast.error(messageFor(error))
                    }
                  })()
                },
              },
            ]}
          />
        }
        information={<RepairInformation row={row} />}
        tabs={[
          {
            value: 'overview',
            label: t('detail.tabs.overview'),
            content: (
              <>
                <SectionCard title={`Ảnh tình trạng — ${row.code} (không bắt buộc)`}>
                  <AttachmentsPanel
                    key={id}
                    entityType="repair_ticket"
                    entityId={id}
                    kinds={[{ value: 'photo', label: 'Ảnh tình trạng' }]}
                    canWrite={canAttach}
                    photosOnly
                  />
                </SectionCard>
                <OverviewTab row={row} faultTitle={faultTitle} />
              </>
            ),
          },
          {
            value: 'logs',
            label: t('detail.tabs.logs'),
            content: (
              <LogsTab logs={row.logs} canWrite={canWriteParts} onAdd={() => setOpen('log')} />
            ),
          },
          {
            value: 'parts',
            label: t('detail.tabs.parts'),
            content: (
              <PartsTab
                parts={row.parts}
                canWrite={canWriteParts}
                onAdd={() => setOpen('part')}
                onEdit={(part) => {
                  setEditingPart(part)
                  setOpen('part')
                }}
                onDelete={async (pid) => {
                  if (
                    (await confirm({
                      title: t('detail.parts.deleteConfirm'),
                      destructive: true,
                    })) === false
                  )
                    return
                  try {
                    await api.deleteRepairPart(id, pid)
                    toast.success(t('detail.actions.deleted'))
                    invalidate(id)
                  } catch (error) {
                    toast.error(messageFor(error))
                  }
                }}
              />
            ),
          },
          {
            value: 'vendors',
            label: t('detail.tabs.vendors'),
            content: (
              <VendorsTab
                vendors={row.vendors}
                canWrite={canCosts}
                onAdd={() => setOpen('vendor')}
                onEdit={(vendor) => {
                  setEditingVendor(vendor)
                  setOpen('vendor')
                }}
                onDelete={async (vid) => {
                  if (
                    (await confirm({
                      title: t('detail.vendors.deleteConfirm'),
                      destructive: true,
                    })) === false
                  )
                    return
                  try {
                    await api.deleteRepairVendor(id, vid)
                    toast.success(t('detail.actions.deleted'))
                    invalidate(id)
                  } catch (error) {
                    toast.error(messageFor(error))
                  }
                }}
              />
            ),
          },
          {
            value: 'costs',
            label: t('detail.tabs.costs'),
            content: (
              <CostsTab
                equipmentId={row.equipmentId}
                costs={row.costs}
                total={row.totalCost}
                warning={row.costWarning}
                canWrite={canCosts}
                onAdd={() => setOpen('cost')}
                onEdit={(cost) => {
                  setEditingCost(cost)
                  setOpen('cost')
                }}
                onDelete={async (cid) => {
                  if (
                    (await confirm({
                      title: t('detail.costs.deleteConfirm'),
                      destructive: true,
                    })) === false
                  )
                    return
                  try {
                    await api.deleteRepairCost(id, cid)
                    toast.success(t('detail.actions.deleted'))
                    invalidate(id)
                  } catch (error) {
                    toast.error(messageFor(error))
                  }
                }}
              />
            ),
          },
          {
            value: 'docs',
            label: t('detail.tabs.docs'),
            content: (
              <SectionCard
                title={t('detail.tabs.docs')}
                actions={
                  (canSignTechnician || canSignDepartment) && (
                    <Button onClick={() => setOpen('sign')}>{t('detail.docs.sign')}</Button>
                  )
                }
              >
                <AttachmentsPanel
                  entityType="repair_ticket"
                  entityId={id}
                  canWrite={canAttach}
                  kinds={[
                    { value: 'photo', label: t('detail.attachments.photo') },
                    { value: 'video', label: t('detail.attachments.video') },
                    {
                      value: 'signature_technician',
                      label: t('detail.attachments.signatureTechnician'),
                    },
                    {
                      value: 'signature_department',
                      label: t('detail.attachments.signatureDepartment'),
                    },
                    { value: 'report', label: t('detail.attachments.report') },
                    { value: 'other', label: t('detail.attachments.other') },
                  ]}
                />
              </SectionCard>
            ),
          },
          {
            value: 'audit',
            label: t('detail.tabs.audit'),
            content: (
              <SectionCard title={t('detail.tabs.audit')}>
                <AuditTrail entityType="repair_ticket" entityId={id} />
              </SectionCard>
            ),
          },
        ]}
      />
      {open === 'assign' && (
        <AssignDialog
          id={id}
          equipmentId={row.equipmentId}
          onClose={() => setOpen(null)}
          onDone={() => invalidate(id)}
        />
      )}
      {open === 'diagnosis' && (
        <DiagnosisDialog
          id={id}
          equipmentId={row.equipmentId}
          errorCode={row.errorCode}
          description={row.description}
          defaultFaultId={row.faultId ?? prefillFault}
          onClose={() => setOpen(null)}
          onDone={() => invalidate(id)}
        />
      )}
      {open === 'status' && (
        <StatusDialog
          id={id}
          status={row.status}
          onClose={() => setOpen(null)}
          onDone={() => invalidate(id)}
        />
      )}
      {open === 'decline' && (
        <DeclineDialog id={id} onClose={() => setOpen(null)} onDone={() => invalidate(id)} />
      )}
      {open === 'complete' && (
        <CompleteDialog id={id} onClose={() => setOpen(null)} onDone={() => invalidate(id)} />
      )}
      {open === 'acceptance' && (
        <AcceptanceDialog id={id} onClose={() => setOpen(null)} onDone={() => invalidate(id)} />
      )}
      {open === 'edit' && (
        <EditDialog
          id={id}
          defaultValues={{
            description: row.description,
            severity: (['low', 'medium', 'high', 'critical'].includes(row.severity)
              ? row.severity
              : 'medium') as EditRepairForm['severity'],
            equipmentDown: row.equipmentDown,
          }}
          onClose={() => setOpen(null)}
          onDone={() => invalidate(id)}
        />
      )}
      {open === 'log' && (
        <LogDialog id={id} onClose={() => setOpen(null)} onDone={() => invalidate(id)} />
      )}
      {open === 'part' && (
        <PartDialog
          id={id}
          equipmentId={row.equipmentId}
          editing={editingPart}
          onClose={() => {
            setOpen(null)
            setEditingPart(null)
          }}
          onDone={() => invalidate(id)}
        />
      )}
      {open === 'vendor' && (
        <VendorDialog
          id={id}
          editing={editingVendor}
          onClose={() => {
            setOpen(null)
            setEditingVendor(null)
          }}
          onDone={() => invalidate(id)}
        />
      )}
      {open === 'cost' && (
        <CostDialog
          id={id}
          editing={editingCost}
          onClose={() => {
            setOpen(null)
            setEditingCost(null)
          }}
          onDone={() => invalidate(id)}
        />
      )}
      {open === 'sign' && (
        <SignDialog
          id={id}
          canTechnician={canSignTechnician}
          canDepartment={canSignDepartment}
          onClose={() => setOpen(null)}
          onDone={() => invalidate(id)}
        />
      )}
    </>
  )
}

function RepairMeta({ row }: { row: NonNullable<ReturnType<typeof useRepair>['data']> }) {
  const { t } = useTranslation('repairs')
  const departmentName = useDepartmentNames()
  return (
    <>
      {row.reportedDepartmentId && (
        <PageMeta icon={<Building2 />}>{departmentName(row.reportedDepartmentId)}</PageMeta>
      )}
      {row.assignee?.fullName && <PageMeta icon={<User />}>{row.assignee.fullName}</PageMeta>}
      <PageMeta icon={<CalendarClock />}>
        {t('detail.dueAt')}: {formatDateTime(row.dueAt)}
      </PageMeta>
      {row.totalCost && row.totalCost !== '0' && (
        <PageMeta icon={<Coins />}>{formatVnd(row.totalCost)}</PageMeta>
      )}
    </>
  )
}

function RepairInformation({ row }: { row: NonNullable<ReturnType<typeof useRepair>['data']> }) {
  const { t } = useTranslation('repairs')
  const departmentName = useDepartmentNames()
  const timeline = [
    {
      at: row.createdAt,
      title: t('detail.timeline.created', { defaultValue: 'Tạo phiếu' }),
      tone: 'muted' as const,
      icon: <ClipboardList />,
    },
    ...(row.startedAt
      ? [
          {
            at: row.startedAt,
            title: t('detail.timeline.started', { defaultValue: 'Bắt đầu xử lý' }),
            tone: 'primary' as const,
          },
        ]
      : []),
    ...(row.completedAt
      ? [
          {
            at: row.completedAt,
            title: t('detail.timeline.completed', { defaultValue: 'Hoàn thành' }),
            tone: 'success' as const,
          },
        ]
      : []),
    ...(row.acceptedByDeptAt
      ? [
          {
            at: row.acceptedByDeptAt,
            title: t('detail.timeline.acceptedByDept', { defaultValue: 'Khoa nghiệm thu' }),
            tone: 'success' as const,
          },
        ]
      : []),
    ...(row.acceptedAt
      ? [
          {
            at: row.acceptedAt,
            title: t('detail.timeline.accepted', { defaultValue: 'Nghiệm thu' }),
            tone: 'success' as const,
          },
        ]
      : []),
    ...(row.closedAt
      ? [
          {
            at: row.closedAt,
            title: t('detail.timeline.closed', { defaultValue: 'Đóng phiếu' }),
            tone: 'muted' as const,
          },
        ]
      : []),
  ]
  return (
    <>
      <h2 className="mb-3 text-[15px] leading-6 font-semibold">
        {t('detail.info', { defaultValue: 'Thông tin' })}
      </h2>
      <DataList
        columns={1}
        items={[
          {
            label: t('detail.equipment'),
            value: row.equipment ? (
              <Link className="text-primary" to={`/equipment/${row.equipmentId}`}>
                {row.equipment.code} – {row.equipment.name}
              </Link>
            ) : (
              row.equipmentId
            ),
          },
          {
            label: t('detail.overview.department'),
            value: departmentName(row.reportedDepartmentId),
          },
          { label: t('detail.assignee'), value: row.assignee?.fullName },
          {
            label: t('detail.dueAt'),
            value: (
              <span className={row.isOverdue ? 'text-destructive' : undefined}>
                {formatDateTime(row.dueAt) || '—'}
              </span>
            ),
          },
          { label: t('detail.cost'), value: formatVnd(row.totalCost) || null },
        ]}
      />
      <h2 className="mt-5 mb-3 text-[15px] leading-6 font-semibold">
        {t('detail.timeline.title', { defaultValue: 'Tiến trình' })}
      </h2>
      <Timeline events={timeline} />
      <EquipmentRepairHistory equipmentId={row.equipmentId} currentId={row.id} />
    </>
  )
}

/** Các phiếu sửa chữa trước đó của cùng máy (5 gần nhất) — kỹ thuật viên cần biết máy từng hỏng gì. */
function EquipmentRepairHistory({
  equipmentId,
  currentId,
}: {
  equipmentId: string
  currentId: string
}) {
  const { t } = useTranslation('repairs')
  const q = useQuery({
    queryKey: ['repairs', 'by-equipment', equipmentId],
    queryFn: () => listRepairsForEquipment(equipmentId),
    enabled: !!equipmentId,
  })
  const others = (q.data?.items ?? []).filter((r) => r.id !== currentId).slice(0, 5)
  const total = Math.max(0, (q.data?.total ?? 0) - 1)
  return (
    <>
      <div className="mt-5 mb-3 flex items-baseline justify-between">
        <h2 className="text-[15px] leading-6 font-semibold">
          {t('detail.equipmentHistory.title', { defaultValue: 'Lịch sử sửa chữa máy này' })}
        </h2>
        {total > 0 && (
          <Link
            to={`/repairs?equipmentId=${equipmentId}`}
            className="text-primary text-[13px] font-medium"
          >
            {t('detail.equipmentHistory.all', { defaultValue: 'Tất cả ({{n}})', n: total })}
          </Link>
        )}
      </div>
      {q.isPending ? (
        <p className="text-muted-foreground text-[13px]">…</p>
      ) : others.length === 0 ? (
        <p className="text-muted-foreground text-[13px]">
          {t('detail.equipmentHistory.empty', { defaultValue: 'Chưa có lần sửa nào trước đó' })}
        </p>
      ) : (
        <ul className="divide-divider divide-y">
          {others.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 py-2 text-[13px]">
              <div className="min-w-0">
                <Link to={`/repairs/${r.id}`} className="text-primary font-medium">
                  {r.code}
                </Link>
                <p className="text-muted-foreground truncate">{r.description}</p>
              </div>
              <div className="shrink-0 text-right">
                <StatusBadge value={r.status} map={repairStatusMap} />
                <p className="text-subtle mt-0.5 text-[12px] tabular-nums">
                  {formatDate(r.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

function OverviewTab({
  row,
  faultTitle,
}: {
  row: NonNullable<ReturnType<typeof useRepair>['data']>
  faultTitle: string | null
}) {
  const { t } = useTranslation('repairs')
  const userName = useUserNames()
  return (
    <>
      <SectionCard title={t('detail.overview.problem', { defaultValue: 'Sự cố' })}>
        <DataList
          columns={2}
          items={[
            {
              label: t('detail.overview.description'),
              value: <span className="whitespace-pre-wrap">{row.description}</span>,
              full: true,
            },
            { label: t('detail.overview.errorCode'), value: row.errorCode },
            {
              label: t('detail.overview.fault'),
              value: row.faultId ? (
                <Link className="text-primary" to={`/faults/${row.faultId}`}>
                  {faultTitle ?? row.faultId}
                </Link>
              ) : null,
            },
            {
              label: t('detail.overview.equipmentDown', { defaultValue: 'Máy ngừng hoạt động' }),
              value: row.equipmentDown ? (
                <StatusBadge
                  value="down"
                  map={{ down: { label: t('detail.overview.yes'), tone: 'danger' } }}
                />
              ) : (
                t('detail.overview.no')
              ),
            },
          ]}
        />
      </SectionCard>
      <SectionCard title={t('detail.overview.resolution', { defaultValue: 'Chẩn đoán & xử lý' })}>
        <DataList
          columns={2}
          items={[
            {
              label: t('detail.overview.diagnosis'),
              value: row.diagnosis ? (
                <span className="whitespace-pre-wrap">{row.diagnosis}</span>
              ) : null,
              full: true,
            },
            {
              label: t('detail.overview.resolutionType'),
              value:
                row.resolutionType &&
                (RESOLUTION_TYPES as readonly string[]).includes(row.resolutionType)
                  ? t(`detail.resolution.${row.resolutionType}`)
                  : row.resolutionType,
            },
            { label: t('detail.overview.resolutionSummary'), value: row.resolutionSummary },
            {
              label: t('detail.overview.warranty'),
              value: formatDate(row.postRepairWarrantyUntil) || null,
            },
            {
              label: t('detail.overview.calibration'),
              value: row.calibrationRequired ? (
                <StatusBadge
                  value="yes"
                  map={{ yes: { label: t('detail.overview.yes'), tone: 'warning' } }}
                />
              ) : (
                t('detail.overview.no')
              ),
            },
            {
              label: t('detail.overview.acceptance'),
              value:
                row.rating != null
                  ? `${row.rating}/5${row.ratingNote ? ` — ${row.ratingNote}` : ''}`
                  : null,
            },
          ]}
        />
      </SectionCard>
      <SectionCard
        title={t('detail.overview.assignments')}
        description={t('countPeople', { defaultValue: '{{n}} người', n: row.assignments.length })}
        flush={row.assignments.length > 0}
      >
        {row.assignments.length === 0 ? (
          <EmptyState
            icon={User}
            title={t('detail.overview.noAssignments', { defaultValue: 'Chưa phân công' })}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">{t('detail.overview.person')}</TableHead>
                <TableHead>{t('detail.overview.role')}</TableHead>
                <TableHead>{t('detail.overview.response')}</TableHead>
                <TableHead className="pr-5">{t('detail.overview.note')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {row.assignments.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="pl-5 font-medium">{userName(item.userId)}</TableCell>
                  <TableCell>
                    {item.role === 'primary'
                      ? t('detail.overview.primary')
                      : t('detail.overview.assistant')}
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={item.response} map={assignmentResponseMap} />
                  </TableCell>
                  <TableCell className="pr-5">{item.responseNote ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </>
  )
}

/** Nhãn tiếng Việt cho `action` của nhật ký sửa chữa (backend ghi mã: accepted, status:<x>, assignment:<x>…). */
function logActionLabel(
  action: string,
  t: (k: string, o?: Record<string, unknown>) => string,
): string {
  const [kind = action, value] = action.split(':')
  if (kind === 'status' && value) {
    const st = repairStatusMap[value]?.label ?? value
    return t('detail.logs.actions.status', { defaultValue: 'Chuyển trạng thái: {{st}}', st })
  }
  if (kind === 'assignment' && value) {
    const map: Record<string, string> = { accepted: 'nhận việc', rejected: 'từ chối việc' }
    return t('detail.logs.actions.assignment', {
      defaultValue: 'Phản hồi phân công: {{r}}',
      r: map[value] ?? value,
    })
  }
  const labels: Record<string, string> = {
    accepted: 'Tiếp nhận phiếu',
    assigned: 'Phân công',
    diagnosis: 'Chẩn đoán',
    cancelled: 'Huỷ phiếu',
    closed: 'Đóng phiếu',
    completed: 'Hoàn thành',
    note: 'Ghi chú',
    work: 'Xử lý',
  }
  return t(`detail.logs.actions.${kind}`, { defaultValue: labels[kind] ?? action })
}

function LogsTab({
  logs,
  canWrite,
  onAdd,
}: {
  logs: NonNullable<ReturnType<typeof useRepair>['data']>['logs']
  canWrite: boolean
  onAdd: () => void
}) {
  const { t } = useTranslation('repairs')
  const userName = useUserNames()
  return (
    <SectionCard
      title={t('detail.tabs.logs')}
      description={t('countItems', { defaultValue: '{{n}} mục', n: logs.length })}
      actions={canWrite && <Button onClick={onAdd}>{t('detail.logs.add')}</Button>}
    >
      {logs.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title={t('detail.logs.empty', { defaultValue: 'Chưa có nhật ký xử lý' })}
        />
      )}
      {logs.length > 0 && (
        <Timeline
          events={logs.map((item) => ({
            at: item.at,
            title: logActionLabel(item.action, t),
            summary: [
              item.note,
              item.durationMinutes != null
                ? t('detail.logs.minutes', { n: item.durationMinutes })
                : null,
            ]
              .filter(Boolean)
              .join(' · '),
            by: userName(item.byUserId),
          }))}
        />
      )}
    </SectionCard>
  )
}

function PartsTab({
  parts,
  canWrite,
  onAdd,
  onEdit,
  onDelete,
}: {
  parts: NonNullable<ReturnType<typeof useRepair>['data']>['parts']
  canWrite: boolean
  onAdd: () => void
  onEdit: (part: components['schemas']['RepairPartResponseDto']) => void
  onDelete: (id: string) => void
}) {
  const { t } = useTranslation('repairs')
  const lotName = useStockLotNames(parts)
  return (
    <SectionCard
      title={t('detail.tabs.parts')}
      description={t('countItems', { defaultValue: '{{n}} mục', n: parts.length })}
      actions={canWrite && <Button onClick={onAdd}>{t('detail.parts.add')}</Button>}
      flush
    >
      {parts.length === 0 ? (
        <EmptyState
          icon={Package}
          title={t('detail.parts.empty', { defaultValue: 'Chưa ghi linh kiện/vật tư' })}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">{t('detail.parts.source')}</TableHead>
              <TableHead>{t('detail.parts.name')}</TableHead>
              <TableHead>{t('detail.parts.quantity')}</TableHead>
              <TableHead>{t('detail.parts.unitCost')}</TableHead>
              <TableHead>{t('detail.parts.total')}</TableHead>
              <TableHead>{t('detail.parts.lot')}</TableHead>
              <TableHead>{t('detail.parts.invoice')}</TableHead>
              <TableHead className="pr-5"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parts.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="pl-5">
                  <StatusBadge value={row.source} map={partSourceMap} />
                </TableCell>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="tabular-nums">{formatQty(row.quantity)}</TableCell>
                <TableCell className="tabular-nums">{formatVnd(row.unitCost)}</TableCell>
                <TableCell className="font-medium tabular-nums">
                  {formatVnd(row.totalCost)}
                </TableCell>
                <TableCell>{lotName(row.stockLotId)}</TableCell>
                <TableCell>
                  <FileLink fileId={row.invoiceFileId} label={t('detail.parts.invoice')} />
                </TableCell>
                <TableCell className="pr-5">
                  {canWrite && (
                    <div className="flex justify-end gap-1">
                      <EditIconButton onClick={() => onEdit(row)} />
                      <DeleteIconButton onClick={() => onDelete(row.id)} />
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SectionCard>
  )
}

function VendorsTab({
  vendors,
  canWrite,
  onAdd,
  onEdit,
  onDelete,
}: {
  vendors: NonNullable<ReturnType<typeof useRepair>['data']>['vendors']
  canWrite: boolean
  onAdd: () => void
  onEdit: (vendor: components['schemas']['RepairVendorResponseDto']) => void
  onDelete: (id: string) => void
}) {
  const { t } = useTranslation('repairs')
  const supplierName = useSupplierNames(vendors.map((row) => row.supplierId))
  return (
    <SectionCard
      title={t('detail.tabs.vendors')}
      description={t('countItems', { defaultValue: '{{n}} mục', n: vendors.length })}
      actions={canWrite && <Button onClick={onAdd}>{t('detail.vendors.add')}</Button>}
    >
      {vendors.length === 0 && (
        <EmptyState
          icon={Truck}
          title={t('detail.vendors.empty', { defaultValue: 'Chưa có nhà thầu' })}
        />
      )}
      <ul className="space-y-3 text-sm">
        {vendors.map((row) => (
          <li key={row.id} className="border-divider rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="bg-primary-soft text-primary flex size-9 shrink-0 items-center justify-center rounded-lg">
                  <Truck className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="text-[14px] font-semibold">{supplierName(row.supplierId)}</p>
                  <p className="text-muted-foreground text-[13px]">
                    {[row.engineerName, row.engineerPhone].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
              </div>
            </div>
            <DataList
              className="mt-3"
              columns={3}
              items={[
                {
                  label: t('detail.vendors.quotation'),
                  value: formatVnd(row.quotationAmount) || null,
                },
                { label: t('detail.vendors.contract'), value: row.contractNo },
                {
                  label: t('detail.vendors.quotationFile'),
                  value: row.quotationFileId ? (
                    <FileLink
                      fileId={row.quotationFileId}
                      label={t('detail.vendors.quotationFile')}
                    />
                  ) : null,
                },
              ]}
            />
            {canWrite && (
              <div className="mt-3 flex gap-1">
                <EditIconButton onClick={() => onEdit(row)} />
                <DeleteIconButton onClick={() => onDelete(row.id)} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </SectionCard>
  )
}

/** Link xem file đã tải (hoá đơn, báo giá…). */
function FileLink({ fileId, label }: { fileId: string | null; label: string }) {
  const url = useQuery({
    queryKey: ['file-url', fileId, false],
    queryFn: () => getFileUrl(fileId!, false),
    enabled: !!fileId,
    staleTime: 600_000,
  })
  if (!fileId) return <span>—</span>
  if (!url.data) return <span className="text-muted-foreground">…</span>
  return (
    <a className="text-primary" href={url.data.url} target="_blank" rel="noreferrer">
      {label}
    </a>
  )
}

function CostAttachments({ costId, canWrite }: { costId: string; canWrite: boolean }) {
  const { t } = useTranslation('repairs')
  const [open, setOpen] = useState(false)
  return (
    <div>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen((value) => !value)}>
        {open ? t('detail.costs.hideInvoice') : t('detail.costs.invoice')}
      </Button>
      {open && (
        <AttachmentsPanel
          entityType="repair_cost"
          entityId={costId}
          canWrite={canWrite}
          kinds={[
            { value: 'invoice', label: t('detail.costs.invoice') },
            { value: 'quotation', label: t('detail.costs.quotation') },
            { value: 'receipt', label: t('detail.costs.receipt') },
          ]}
        />
      )}
    </div>
  )
}

function CostsTab({
  equipmentId,
  costs,
  total,
  warning,
  canWrite,
  onAdd,
  onEdit,
  onDelete,
}: {
  equipmentId: string
  costs: NonNullable<ReturnType<typeof useRepair>['data']>['costs']
  total: string
  warning: boolean
  canWrite: boolean
  onAdd: () => void
  onEdit: (cost: components['schemas']['RepairCostResponseDto']) => void
  onDelete: (id: string) => void
}) {
  const { t } = useTranslation('repairs')
  const equipment = useQuery({
    queryKey: ['repairs', 'equipment-brief', equipmentId],
    queryFn: () => api.equipmentBrief(equipmentId),
    enabled: warning && !!equipmentId,
    staleTime: 300_000,
  })
  const originalValue = equipment.data?.originalValue ?? null
  let percent: string | null = null
  if (originalValue) {
    try {
      if (new Big(originalValue).gt(0))
        percent = new Big(total || '0').div(originalValue).times(100).toFixed(1)
    } catch {
      percent = null
    }
  }
  return (
    <>
      {warning && (
        <Alert variant="destructive" role="alert">
          <TriangleAlert />
          <AlertDescription>
            {percent && originalValue
              ? t('detail.costOverThreshold', {
                  total: formatVnd(total) || total,
                  original: formatVnd(originalValue) || originalValue,
                  pct: percent,
                })
              : t('detail.costOverThresholdGeneric')}
          </AlertDescription>
        </Alert>
      )}
      <SectionCard
        title={t('detail.tabs.costs')}
        description={t('countItems', { defaultValue: '{{n}} mục', n: costs.length })}
        actions={canWrite && <Button onClick={onAdd}>{t('detail.costs.add')}</Button>}
        flush
        footer={
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-[13px]">
              {t('detail.costs.totalLabel', { defaultValue: 'Tổng chi phí' })}
            </span>
            <span className="text-[16px] font-bold tabular-nums">
              {t('detail.costs.total', { amount: formatVnd(total) || '0 ₫' })}
            </span>
          </div>
        }
      >
        {costs.length === 0 ? (
          <EmptyState
            icon={Coins}
            title={t('detail.costs.empty', { defaultValue: 'Chưa ghi chi phí' })}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">{t('detail.costs.category')}</TableHead>
                <TableHead>{t('detail.costs.description')}</TableHead>
                <TableHead className="text-right">{t('detail.costs.amount')}</TableHead>
                <TableHead>{t('detail.costs.invoiceNo')}</TableHead>
                <TableHead className="pr-5"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-5">
                    <StatusBadge value={row.category} map={costCategoryMap} />
                  </TableCell>
                  <TableCell className="font-medium">{row.description}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatVnd(row.amount)}</TableCell>
                  <TableCell>
                    <CostAttachments costId={row.id} canWrite={canWrite} />
                  </TableCell>
                  <TableCell className="pr-5">
                    {canWrite && (
                      <div className="flex justify-end gap-1">
                        <EditIconButton onClick={() => onEdit(row)} />
                        <DeleteIconButton onClick={() => onDelete(row.id)} />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </>
  )
}

function AssignDialog({
  id,
  equipmentId,
  onClose,
  onDone,
}: {
  id: string
  equipmentId: string
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation('repairs')
  const form = useForm<AssignForm>({
    resolver: zodResolver(assignSchema),
    defaultValues: { primaryUserId: '', assistantIds: [], dueAt: '' },
  })
  const suggest = useQuery({
    queryKey: ['repairs', 'assign-suggest', equipmentId],
    queryFn: () => api.suggestAssignees(equipmentId),
  })
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={t('detail.assign.title')}
      form={form}
      onSubmit={async (values) => {
        try {
          await api.assignRepair(id, {
            primaryUserId: values.primaryUserId,
            assistantIds: values.assistantIds,
            dueAt: values.dueAt || undefined,
          })
          toast.success(t('detail.assign.saved'))
          onDone()
          onClose()
        } catch (error) {
          if (!applyServerErrors(form, error)) toast.error(messageFor(error))
        }
      }}
    >
      {suggest.data && suggest.data.length > 0 && (
        <ul className="mb-2 space-y-1 text-sm">
          {suggest.data.map((row) => (
            <li key={row.id}>
              <button
                type="button"
                className="text-primary"
                onClick={() => form.setValue('primaryUserId', row.id)}
              >
                {row.fullName} ({row.openTickets} {t('stats.openTickets').toLowerCase()})
              </button>
            </li>
          ))}
        </ul>
      )}
      <FormField
        control={form.control}
        name="primaryUserId"
        render={({ field }) => (
          <FormItem>
            <AsyncSelect
              label={t('detail.assign.primary')}
              queryKey="staff-users"
              loadOptions={staffUserOptions}
              value={field.value || null}
              onChange={(v) => field.onChange(typeof v === 'string' ? v : '')}
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="assistantIds"
        render={({ field }) => (
          <FormItem>
            <AsyncSelect
              label={t('detail.assign.assistant')}
              queryKey="staff-assist"
              loadOptions={staffUserOptions}
              multiple
              value={field.value}
              onChange={(v) => field.onChange(Array.isArray(v) ? v : [])}
              clearable
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <DatetimeField control={form.control} name="dueAt" label={t('detail.assign.dueAt')} />
    </FormDialog>
  )
}

function DiagnosisDialog({
  id,
  equipmentId,
  errorCode,
  description,
  defaultFaultId,
  onClose,
  onDone,
}: {
  id: string
  equipmentId: string
  errorCode: string | null
  description: string
  defaultFaultId: string | null
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation('repairs')
  const form = useForm<DiagnosisForm>({
    resolver: zodResolver(diagnosisSchema),
    defaultValues: {
      diagnosis: '',
      faultId: defaultFaultId,
      faultGroupId: null,
      resolutionType: null,
    },
  })
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={t('detail.diagnosis.title')}
      width="lg"
      form={form}
      onSubmit={async (values) => {
        try {
          await api.patchDiagnosis(id, {
            diagnosis: values.diagnosis,
            faultId: values.faultId,
            faultGroupId: values.faultGroupId,
            resolutionType: values.resolutionType,
          })
          toast.success(t('detail.diagnosis.saved'))
          onDone()
          onClose()
        } catch (error) {
          if (!applyServerErrors(form, error)) toast.error(messageFor(error))
        }
      }}
    >
      <FormField
        control={form.control}
        name="diagnosis"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('detail.diagnosis.label')}</FormLabel>
            <FormControl>
              <Textarea {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FaultSuggestBox
        equipmentId={equipmentId}
        errorCode={errorCode ?? undefined}
        q={description}
        value={form.watch('faultId')}
        onSelect={(faultId) => form.setValue('faultId', faultId)}
      />
      <FormField
        control={form.control}
        name="faultGroupId"
        render={({ field }) => (
          <FormItem>
            <AsyncSelect
              label={t('detail.diagnosis.faultGroup')}
              queryKey="fault-groups"
              loadOptions={(q) => catalogOptions('fault-groups', q)}
              resolveOption={(id) => resolveCatalogItem('fault-groups', id)}
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
        name="resolutionType"
        label={t('detail.diagnosis.resolutionType')}
        emptyLabel={t('detail.diagnosis.empty')}
        options={RESOLUTION_TYPES.map((item) => ({
          value: item,
          label: t(`detail.resolution.${item}`),
        }))}
      />
    </FormDialog>
  )
}

function StatusDialog({
  id,
  status,
  onClose,
  onDone,
}: {
  id: string
  status: string
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation('repairs')
  const options = availableStatuses(status)
  const form = useForm<StatusForm>({
    resolver: zodResolver(statusSchema),
    defaultValues: { status: options[0] ?? 'in_progress', note: '' },
  })
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={t('detail.status.title')}
      form={form}
      onSubmit={async (values) => {
        try {
          await api.changeRepairStatus(id, { status: values.status, note: values.note })
          toast.success(t('detail.status.saved'))
          onDone()
          onClose()
        } catch (error) {
          if (!applyServerErrors(form, error)) toast.error(messageFor(error))
        }
      }}
    >
      <SelectField
        control={form.control}
        name="status"
        label={t('detail.status.label')}
        options={options.map((item) => ({
          value: item,
          label: repairStatusMap[item]?.label ?? item,
        }))}
      />
      <FormField
        control={form.control}
        name="note"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('detail.status.note')}</FormLabel>
            <FormControl>
              <Textarea {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormDialog>
  )
}

function DeclineDialog({
  id,
  onClose,
  onDone,
}: {
  id: string
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation('repairs')
  const form = useForm<DeclineForm>({
    resolver: zodResolver(declineSchema),
    defaultValues: { note: '' },
  })
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={t('detail.respond.declineTitle')}
      form={form}
      submitLabel={t('detail.respond.decline')}
      onSubmit={async (values) => {
        try {
          await api.respondAssignment(id, { response: 'declined', note: values.note })
          toast.success(t('detail.actions.updated'))
          onDone()
          onClose()
        } catch (error) {
          if (!applyServerErrors(form, error)) toast.error(messageFor(error))
        }
      }}
    >
      <FormField
        control={form.control}
        name="note"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('detail.respond.declineReason')}</FormLabel>
            <FormControl>
              <Textarea {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </FormDialog>
  )
}

function ProposeFields({ control }: { control: Control<CompleteForm> }) {
  const { t } = useTranslation('repairs')
  const steps = useFieldArray({ control, name: 'proposeSteps' })
  const parts = useFieldArray({ control, name: 'proposeParts' })
  const { errors } = useFormState({ control, name: 'proposeSteps' })
  return (
    <>
      <TextField control={control} name="proposeTitle" label={t('detail.complete.proposeTitle')} />
      <FormField
        control={control}
        name="proposeSymptoms"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('detail.complete.proposeSymptoms')}</FormLabel>
            <FormControl>
              <Textarea {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="space-y-2">
        <p className="text-sm font-medium">{t('detail.complete.proposeSteps')}</p>
        {steps.fields.map((field, index) => (
          <div key={field.id} className="border-divider space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm">{t('detail.complete.step', { n: index + 1 })}</p>
              <DeleteIconButton onClick={() => steps.remove(index)} />
            </div>
            <TextField
              control={control}
              name={`proposeSteps.${index}.instruction`}
              label={t('detail.complete.instruction')}
            />
          </div>
        ))}
        {errors.proposeSteps?.message && (
          <p role="alert" className="text-destructive text-sm">
            {errors.proposeSteps.message}
          </p>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => steps.append({ instruction: '', expectedResult: '', cautions: '' })}
        >
          {t('detail.complete.addStep')}
        </Button>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">{t('detail.complete.proposeParts')}</p>
        {parts.fields.map((field, index) => (
          <div key={field.id} className="flex items-end gap-2">
            <div className="flex-1">
              <TextField
                control={control}
                name={`proposeParts.${index}.name`}
                label={t('detail.complete.partName')}
              />
            </div>
            <div className="w-28">
              <NumberField
                control={control}
                name={`proposeParts.${index}.quantity`}
                label={t('detail.complete.quantity')}
                min={1}
                step={1}
              />
            </div>
            <DeleteIconButton onClick={() => parts.remove(index)} />
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => parts.append({ name: '', quantity: 1, note: '' })}
        >
          {t('detail.complete.addPart')}
        </Button>
      </div>
    </>
  )
}

function CompleteDialog({
  id,
  onClose,
  onDone,
}: {
  id: string
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation('repairs')
  const form = useForm<CompleteForm>({
    resolver: zodResolver(completeSchema),
    defaultValues: {
      resolutionSummary: '',
      postRepairWarrantyUntil: '',
      calibrationRequired: false,
      propose: false,
      proposeTitle: '',
      proposeSymptoms: '',
      proposeSteps: [],
      proposeParts: [],
    },
  })
  const propose = form.watch('propose')
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={t('detail.complete.title')}
      width="lg"
      form={form}
      onSubmit={async (values) => {
        try {
          await api.completeRepair(id, {
            resolutionSummary: values.resolutionSummary,
            postRepairWarrantyUntil: values.postRepairWarrantyUntil || undefined,
            calibrationRequired: values.calibrationRequired,
            proposeFault: values.propose
              ? {
                  title: values.proposeTitle,
                  symptoms: values.proposeSymptoms || null,
                  steps: values.proposeSteps.map((step, index) => ({
                    order: index + 1,
                    instruction: step.instruction,
                    expectedResult: step.expectedResult || null,
                    cautions: step.cautions || null,
                  })),
                  parts: values.proposeParts.map((part) => ({
                    name: part.name,
                    quantity: part.quantity,
                    note: part.note || null,
                  })),
                }
              : undefined,
          })
          toast.success(t('detail.complete.saved'))
          onDone()
          onClose()
        } catch (error) {
          if (!applyServerErrors(form, error)) toast.error(messageFor(error))
        }
      }}
    >
      <FormField
        control={form.control}
        name="resolutionSummary"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('detail.complete.summary')}</FormLabel>
            <FormControl>
              <Textarea {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <DateField
        control={form.control}
        name="postRepairWarrantyUntil"
        label={t('detail.complete.warranty')}
      />
      <SwitchField
        control={form.control}
        name="calibrationRequired"
        label={t('detail.complete.calibration')}
      />
      <SwitchField control={form.control} name="propose" label={t('detail.complete.propose')} />
      {propose && <ProposeFields control={form.control} />}
    </FormDialog>
  )
}

function AcceptanceDialog({
  id,
  onClose,
  onDone,
}: {
  id: string
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation('repairs')
  const form = useForm<AcceptanceForm>({
    resolver: zodResolver(acceptanceSchema),
    defaultValues: { accepted: true, rating: '', note: '' },
  })
  const accepted = form.watch('accepted')
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={t('detail.acceptance.title')}
      form={form}
      onSubmit={async (values) => {
        try {
          await api.acceptRepairResult(id, {
            accepted: values.accepted,
            rating: values.rating === '' ? undefined : values.rating,
            note: values.note || undefined,
          })
          toast.success(t('detail.acceptance.saved'))
          onDone()
          onClose()
        } catch (error) {
          if (!applyServerErrors(form, error)) toast.error(messageFor(error))
        }
      }}
    >
      <FormField
        control={form.control}
        name="accepted"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('detail.acceptance.result')}</FormLabel>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={field.value === true}
                  onChange={() => field.onChange(true)}
                />
                {t('detail.acceptance.accepted')}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={field.value === false}
                  onChange={() => {
                    field.onChange(false)
                    form.setValue('rating', '')
                  }}
                />
                {t('detail.acceptance.rejected')}
              </label>
            </div>
          </FormItem>
        )}
      />
      {accepted && (
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('detail.acceptance.rating')}</FormLabel>
              <FormControl>
                <StarRating
                  value={field.value === '' ? null : field.value}
                  onChange={(value) => field.onChange(value)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      <TextField control={form.control} name="note" label={t('detail.acceptance.note')} />
    </FormDialog>
  )
}

function EditDialog({
  id,
  defaultValues,
  onClose,
  onDone,
}: {
  id: string
  defaultValues: EditRepairForm
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation('repairs')
  const form = useForm<EditRepairForm>({
    resolver: zodResolver(editRepairSchema),
    defaultValues,
  })
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={t('detail.edit.title')}
      form={form}
      onSubmit={async (values) => {
        try {
          await api.updateRepair(id, values)
          toast.success(t('detail.edit.saved'))
          onDone()
          onClose()
        } catch (error) {
          if (!applyServerErrors(form, error)) toast.error(messageFor(error))
        }
      }}
    >
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('detail.edit.description')}</FormLabel>
            <FormControl>
              <Textarea {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <SelectField
        control={form.control}
        name="severity"
        label={t('detail.edit.severity')}
        options={['low', 'medium', 'high', 'critical'].map((item) => ({
          value: item,
          label: faultSeverityMap[item]?.label ?? item,
        }))}
      />
      <SwitchField
        control={form.control}
        name="equipmentDown"
        label={t('detail.edit.equipmentDown')}
      />
    </FormDialog>
  )
}

function LogDialog({
  id,
  onClose,
  onDone,
}: {
  id: string
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation('repairs')
  const form = useForm<LogForm>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      action: '',
      note: '',
      durationMinutes: '',
      at: new Date().toISOString(),
    },
  })
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={t('detail.logs.add')}
      form={form}
      onSubmit={async (values) => {
        try {
          await api.addRepairLogs(id, [
            {
              clientId: crypto.randomUUID(),
              action: values.action,
              note: values.note || undefined,
              durationMinutes: values.durationMinutes === '' ? undefined : values.durationMinutes,
              at: values.at,
            },
          ])
          toast.success(t('detail.logs.created'))
          onDone()
          onClose()
        } catch (error) {
          if (!applyServerErrors(form, error)) toast.error(messageFor(error))
        }
      }}
    >
      <DatetimeField control={form.control} name="at" label={t('detail.logs.at')} />
      <TextField control={form.control} name="action" label={t('detail.logs.action')} />
      <TextField control={form.control} name="note" label={t('detail.overview.note')} />
      <NumberField
        control={form.control}
        name="durationMinutes"
        label={t('detail.logs.duration')}
        min={0}
      />
    </FormDialog>
  )
}

function PartDialog({
  id,
  equipmentId,
  editing,
  onClose,
  onDone,
}: {
  id: string
  equipmentId: string
  editing: components['schemas']['RepairPartResponseDto'] | null
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation('repairs')
  const form = useForm<PartForm>({
    resolver: zodResolver(partSchema),
    defaultValues: {
      source: (PART_SOURCES.includes(editing?.source as (typeof PART_SOURCES)[number])
        ? editing?.source
        : 'stock') as PartForm['source'],
      name: editing?.name ?? '',
      quantity: editing?.quantity ?? '1',
      unitCost: editing?.unitCost ?? '',
      supplyId: editing?.supplyId ?? null,
      stockLotId: editing?.stockLotId ?? null,
      invoiceFileId: editing?.invoiceFileId ?? null,
      componentId: editing?.componentId ?? null,
      newSerial: '',
      note: '',
      reason: '',
      cost: '',
    },
  })
  const source = form.watch('source')
  const supplyId = form.watch('supplyId')
  const stock = useQuery({
    queryKey: ['supplies', supplyId, 'stock'],
    queryFn: () => api.supplyStock(supplyId!),
    enabled: source === 'stock' && !!supplyId,
  })
  const components = useQuery({
    queryKey: ['equipment', equipmentId, 'components'],
    queryFn: () => api.equipmentComponents(equipmentId),
    enabled: source === 'component_replace',
  })
  const lots = stock.data?.lots ?? stock.data?.balances ?? []
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={t('detail.parts.add')}
      width="lg"
      form={form}
      onSubmit={async (values) => {
        try {
          if (editing) {
            await api.updateRepairPart(id, editing.id, {
              name: values.name || t('detail.parts.defaultName'),
              quantity: values.quantity,
              unitCost: values.unitCost || undefined,
              invoiceFileId: values.invoiceFileId ?? undefined,
              note: values.note || undefined,
            })
          } else {
            await api.addRepairPart(id, {
              source: values.source,
              name: values.name || t('detail.parts.defaultName'),
              quantity: values.quantity,
              unitCost: values.unitCost || undefined,
              supplyId: values.supplyId ?? undefined,
              stockLotId: values.stockLotId ?? undefined,
              invoiceFileId: values.invoiceFileId ?? undefined,
              componentId: values.componentId ?? undefined,
              newSerial: values.newSerial || undefined,
              note: values.note || undefined,
              reason: values.reason || undefined,
              cost: values.cost || undefined,
            })
          }
          toast.success(t('detail.parts.created'))
          onDone()
          onClose()
        } catch (error) {
          if (!applyServerErrors(form, error)) toast.error(messageFor(error))
        }
      }}
    >
      <FormField
        control={form.control}
        name="source"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('detail.parts.source')}</FormLabel>
            <div className="flex flex-wrap gap-3">
              {PART_SOURCES.map((item) => (
                <label key={item} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name={field.name}
                    checked={field.value === item}
                    onChange={() => field.onChange(item)}
                  />
                  {partSourceMap[item]?.label ?? item}
                </label>
              ))}
            </div>
          </FormItem>
        )}
      />
      {source === 'stock' && (
        <>
          <FormField
            control={form.control}
            name="supplyId"
            render={({ field }) => (
              <FormItem>
                <AsyncSelect
                  label={t('detail.parts.supply')}
                  queryKey="supplies"
                  loadOptions={supplyOptions}
                  value={field.value}
                  onChange={field.onChange}
                  clearable
                />
                <FormMessage />
              </FormItem>
            )}
          />
          {lots.length > 0 && (
            <SelectField
              control={form.control}
              name="stockLotId"
              label={t('detail.parts.stockLot')}
              emptyLabel={t('detail.parts.noLot')}
              options={lots.map((lot) => ({
                value: lot.id,
                label: `${lot.lotNo ?? lot.id} (${lot.remainingQty ?? lot.qtyOnHand ?? ''})`,
              }))}
            />
          )}
        </>
      )}
      {source !== 'stock' && (
        <TextField control={form.control} name="name" label={t('detail.parts.name')} />
      )}
      <QtyField control={form.control} name="quantity" label={t('detail.parts.quantity')} />
      {source !== 'stock' && (
        <MoneyField control={form.control} name="unitCost" label={t('detail.parts.unitCost')} />
      )}
      {source === 'purchased' && (
        <FormField
          control={form.control}
          name="invoiceFileId"
          render={({ field }) => (
            <FormItem>
              <FileField
                label={t('detail.parts.invoice')}
                value={field.value}
                onChange={field.onChange}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      {source === 'component_replace' && (
        <>
          <SelectField
            control={form.control}
            name="componentId"
            label={t('detail.parts.component')}
            options={(components.data ?? []).map((item) => ({
              value: item.id,
              label: item.name,
            }))}
          />
          <TextField control={form.control} name="newSerial" label={t('detail.parts.newSerial')} />
          <TextField control={form.control} name="reason" label={t('detail.parts.reason')} />
          <MoneyField control={form.control} name="cost" label={t('detail.parts.cost')} />
        </>
      )}
      <TextField control={form.control} name="note" label={t('detail.parts.note')} />
    </FormDialog>
  )
}

function VendorDialog({
  id,
  editing,
  onClose,
  onDone,
}: {
  id: string
  editing: components['schemas']['RepairVendorResponseDto'] | null
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation('repairs')
  const form = useForm<VendorForm>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      supplierId: editing?.supplierId ?? '',
      engineerName: editing?.engineerName ?? '',
      engineerPhone: editing?.engineerPhone ?? '',
      quotationAmount: editing?.quotationAmount ?? '',
      quotationFileId: editing?.quotationFileId ?? null,
      contractNo: editing?.contractNo ?? '',
      visitAt: editing?.visitAt ?? '',
      note: editing?.note ?? '',
    },
  })
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={t('detail.vendors.title')}
      form={form}
      onSubmit={async (values) => {
        try {
          const body = {
            supplierId: values.supplierId,
            engineerName: values.engineerName || undefined,
            engineerPhone: values.engineerPhone || undefined,
            quotationAmount: values.quotationAmount || undefined,
            quotationFileId: values.quotationFileId ?? undefined,
            contractNo: values.contractNo || undefined,
            visitAt: values.visitAt || undefined,
            note: values.note || undefined,
          }
          if (editing) await api.updateRepairVendor(id, editing.id, body)
          else await api.addRepairVendor(id, body)
          toast.success(t('detail.vendors.created'))
          onDone()
          onClose()
        } catch (error) {
          if (!applyServerErrors(form, error)) toast.error(messageFor(error))
        }
      }}
    >
      <FormField
        control={form.control}
        name="supplierId"
        render={({ field }) => (
          <FormItem>
            <AsyncSelect
              label={t('detail.vendors.supplierFull')}
              queryKey="suppliers"
              loadOptions={(q) => catalogOptions('suppliers', q)}
              resolveOption={(id) => resolveCatalogItem('suppliers', id)}
              value={field.value || null}
              onChange={(v) => field.onChange(typeof v === 'string' ? v : '')}
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <TextField control={form.control} name="engineerName" label={t('detail.vendors.engineer')} />
      <TextField control={form.control} name="engineerPhone" label={t('detail.vendors.phone')} />
      <MoneyField
        control={form.control}
        name="quotationAmount"
        label={t('detail.vendors.quotationFull')}
      />
      <FormField
        control={form.control}
        name="quotationFileId"
        render={({ field }) => (
          <FormItem>
            <FileField
              label={t('detail.vendors.quotationFile')}
              value={field.value}
              onChange={field.onChange}
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <TextField control={form.control} name="contractNo" label={t('detail.vendors.contractNo')} />
      <DatetimeField control={form.control} name="visitAt" label={t('detail.vendors.visitAt')} />
      <TextField control={form.control} name="note" label={t('detail.vendors.note')} />
    </FormDialog>
  )
}

function CostDialog({
  id,
  editing,
  onClose,
  onDone,
}: {
  id: string
  editing: components['schemas']['RepairCostResponseDto'] | null
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation('repairs')
  // Đính kèm ngay lúc ghi chi phí: file được gắn vào dòng chi phí sau khi lưu.
  const [invoiceFileId, setInvoiceFileId] = useState<string | null>(null)
  const form = useForm<CostForm>({
    resolver: zodResolver(costSchema),
    defaultValues: {
      category: (editing?.category ?? 'parts') as CostForm['category'],
      description: editing?.description ?? '',
      amount: editing?.amount ?? '',
      invoiceNo: editing?.invoiceNo ?? '',
      invoiceDate: editing?.invoiceDate ?? '',
      paidAt: editing?.paidAt ?? '',
    },
  })
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={t('detail.costs.title')}
      form={form}
      onSubmit={async (values) => {
        try {
          const body = {
            category: values.category,
            description: values.description,
            amount: values.amount,
            invoiceNo: values.invoiceNo || undefined,
            invoiceDate: values.invoiceDate || undefined,
            paidAt: values.paidAt || undefined,
          }
          const saved = editing
            ? await api.updateRepairCost(id, editing.id, body)
            : await api.addRepairCost(id, body)
          if (invoiceFileId) {
            const costId = (saved as { id?: string } | undefined)?.id ?? editing?.id
            if (costId)
              await attachFile({
                entityType: 'repair_cost',
                entityId: costId,
                fileId: invoiceFileId,
                kind: 'invoice',
              })
          }
          toast.success(t('detail.costs.created'))
          onDone()
          onClose()
        } catch (error) {
          if (!applyServerErrors(form, error)) toast.error(messageFor(error))
        }
      }}
    >
      <SelectField
        control={form.control}
        name="category"
        label={t('detail.costs.category')}
        options={COST_CATEGORIES.map((item) => ({
          value: item,
          label: costCategoryMap[item]?.label ?? item,
        }))}
      />
      <TextField control={form.control} name="description" label={t('detail.costs.description')} />
      <MoneyField control={form.control} name="amount" label={t('detail.costs.amount')} />
      <TextField control={form.control} name="invoiceNo" label={t('detail.costs.invoiceNoFull')} />
      <DateField control={form.control} name="invoiceDate" label={t('detail.costs.invoiceDate')} />
      <DatetimeField control={form.control} name="paidAt" label={t('detail.costs.paidAt')} />
      <FileField
        label={t('detail.costs.invoiceFile')}
        value={invoiceFileId}
        onChange={setInvoiceFileId}
        accept="image/*,application/pdf"
      />
    </FormDialog>
  )
}

function SignDialog({
  id,
  canTechnician,
  canDepartment,
  onClose,
  onDone,
}: {
  id: string
  canTechnician: boolean
  canDepartment: boolean
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation('repairs')
  const me = useAuthStore((s) => s.user)
  const [file, setFile] = useState<File | null>(null)
  const form = useForm<SignForm>({
    resolver: zodResolver(signSchema),
    defaultValues: {
      role: canTechnician ? 'technician' : 'department',
      signerName: me?.fullName ?? '',
    },
  })
  const roleOptions = [
    ...(canTechnician ? [{ value: 'technician', label: t('detail.sign.technician') }] : []),
    ...(canDepartment ? [{ value: 'department', label: t('detail.sign.department') }] : []),
  ]
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title={t('detail.sign.title')}
      form={form}
      onSubmit={async (values) => {
        if (!file) {
          toast.error(t('detail.sign.empty'))
          return
        }
        try {
          const fileId = await uploadFile(file)
          await api.addRepairSignature(id, {
            role: values.role,
            fileId,
            signerName: values.signerName,
          })
          toast.success(t('detail.sign.saved'))
          onDone()
          onClose()
        } catch (error) {
          toast.error(messageFor(error))
        }
      }}
    >
      <SelectField
        control={form.control}
        name="role"
        label={t('detail.sign.role')}
        options={roleOptions}
      />
      <TextField control={form.control} name="signerName" label={t('detail.sign.signerName')} />
      <SignaturePad onFile={setFile} />
    </FormDialog>
  )
}
