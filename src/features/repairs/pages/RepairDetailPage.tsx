import { useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { useForm, useFieldArray, useFormState, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Big from 'big.js'
import { toast } from 'sonner'
import { DetailLayout } from '@/components/detail-layout'
import { ErrorState } from '@/components/page/ErrorState'
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
import { uploadFile } from '@/api/files'
import { getFileUrl } from '@/api/files'
import { useAuthStore } from '@/stores/auth.store'
import { assistantPath } from '@/lib/ai-link'
import * as api from '../api'
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
import { SignaturePad } from '../components/SignaturePad'
import { StarRating } from '../components/StarRating'

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
  const canAttach = !closed && (canWork || isDeptScoped)
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

  if (detail.isPending) return <p role="status">{t('detail.loading')}</p>
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  if (!row) return null

  const faultInfo = asRecord(row.faultInfo)
  const faultTitle = typeof faultInfo?.title === 'string' ? faultInfo.title : null

  return (
    <>
      {dialog}
      <DetailLayout
        code={row.code}
        name={row.equipment ? `${row.equipment.code} – ${row.equipment.name}` : row.code}
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
          <div className="flex flex-wrap gap-2">
            {row.equipment?.id && (
              <Button asChild variant="outline">
                <Link to={assistantPath({ equipmentId: row.equipment.id, repairId: id })}>
                  {t('detail.actions.askAi')}
                </Link>
              </Button>
            )}
            {actions.includes('accept') && (
              <Button
                onClick={() =>
                  void run(t('detail.actions.acceptConfirm'), () => api.acceptRepair(id))
                }
              >
                {t('detail.actions.accept')}
              </Button>
            )}
            {actions.includes('assign') && (
              <Button variant="outline" onClick={() => setOpen('assign')}>
                {t('detail.actions.assign')}
              </Button>
            )}
            {actions.includes('respond') && (
              <>
                <Button
                  onClick={() =>
                    void run(t('detail.respond.acceptConfirm'), () =>
                      api.respondAssignment(id, { response: 'accepted' }),
                    )
                  }
                >
                  {t('detail.respond.accept')}
                </Button>
                <Button variant="outline" onClick={() => setOpen('decline')}>
                  {t('detail.respond.decline')}
                </Button>
              </>
            )}
            {actions.includes('diagnosis') && (
              <Button variant="outline" onClick={() => setOpen('diagnosis')}>
                {t('detail.actions.diagnosis')}
              </Button>
            )}
            {actions.includes('status') && (
              <Button variant="outline" onClick={() => setOpen('status')}>
                {t('detail.actions.status')}
              </Button>
            )}
            {actions.includes('complete') && (
              <Button onClick={() => setOpen('complete')}>{t('detail.actions.complete')}</Button>
            )}
            {actions.includes('acceptance') && (
              <Button onClick={() => setOpen('acceptance')}>
                {t('detail.actions.acceptance')}
              </Button>
            )}
            {actions.includes('close') && (
              <Button
                variant="outline"
                onClick={() =>
                  void run(t('detail.actions.closeConfirm'), () => api.closeRepair(id))
                }
              >
                {t('detail.actions.close')}
              </Button>
            )}
            {actions.includes('cancel') && (
              <Button
                variant="outline"
                onClick={async () => {
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
                }}
              >
                {t('detail.actions.cancel')}
              </Button>
            )}
            {actions.includes('edit') && (
              <Button variant="outline" onClick={() => setOpen('edit')}>
                {t('detail.actions.edit')}
              </Button>
            )}
            {actions.includes('print') && (
              <Button
                variant="outline"
                onClick={() =>
                  void api
                    .downloadRepairReport(id, row.code)
                    .catch((e) => toast.error(messageFor(e)))
                }
              >
                {t('detail.actions.print')}
              </Button>
            )}
          </div>
        }
        information={<RepairInformation row={row} />}
        tabs={[
          {
            value: 'overview',
            label: t('detail.tabs.overview'),
            content: <OverviewTab row={row} faultTitle={faultTitle} />,
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
              <div className="space-y-3">
                {(canSignTechnician || canSignDepartment) && (
                  <Button onClick={() => setOpen('sign')}>{t('detail.docs.sign')}</Button>
                )}
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
              </div>
            ),
          },
          {
            value: 'audit',
            label: t('detail.tabs.audit'),
            content: <AuditTrail entityType="repair_ticket" entityId={id} />,
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
          onClose={() => setOpen(null)}
          onDone={() => invalidate(id)}
        />
      )}
      {open === 'vendor' && (
        <VendorDialog id={id} onClose={() => setOpen(null)} onDone={() => invalidate(id)} />
      )}
      {open === 'cost' && (
        <CostDialog id={id} onClose={() => setOpen(null)} onDone={() => invalidate(id)} />
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

function RepairInformation({ row }: { row: NonNullable<ReturnType<typeof useRepair>['data']> }) {
  const { t } = useTranslation('repairs')
  const departmentName = useDepartmentNames()
  return (
    <dl className="space-y-2 text-sm">
      <div>
        <dt className="text-muted-foreground">{t('detail.equipment')}</dt>
        <dd>
          {row.equipment ? (
            <Link className="text-primary hover:underline" to={`/equipment/${row.equipmentId}`}>
              {row.equipment.code} – {row.equipment.name}
            </Link>
          ) : (
            row.equipmentId
          )}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{t('detail.overview.department')}</dt>
        <dd>{departmentName(row.reportedDepartmentId)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{t('detail.assignee')}</dt>
        <dd>{row.assignee?.fullName ?? '—'}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{t('detail.dueAt')}</dt>
        <dd>{formatDateTime(row.dueAt) || '—'}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{t('detail.cost')}</dt>
        <dd>{formatVnd(row.totalCost) || '—'}</dd>
      </div>
    </dl>
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
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div className="sm:col-span-2">
        <dt className="text-muted-foreground">{t('detail.overview.description')}</dt>
        <dd className="whitespace-pre-wrap">{row.description}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{t('detail.overview.errorCode')}</dt>
        <dd>{row.errorCode ?? '—'}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{t('detail.overview.fault')}</dt>
        <dd>
          {row.faultId ? (
            <Link className="text-primary hover:underline" to={`/faults/${row.faultId}`}>
              {faultTitle ?? row.faultId}
            </Link>
          ) : (
            '—'
          )}
        </dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-muted-foreground">{t('detail.overview.diagnosis')}</dt>
        <dd className="whitespace-pre-wrap">{row.diagnosis ?? '—'}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{t('detail.overview.resolutionType')}</dt>
        <dd>
          {row.resolutionType &&
          (RESOLUTION_TYPES as readonly string[]).includes(row.resolutionType)
            ? t(`detail.resolution.${row.resolutionType}`)
            : (row.resolutionType ?? '—')}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{t('detail.overview.resolutionSummary')}</dt>
        <dd>{row.resolutionSummary ?? '—'}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{t('detail.overview.warranty')}</dt>
        <dd>{formatDate(row.postRepairWarrantyUntil) || '—'}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{t('detail.overview.calibration')}</dt>
        <dd>
          {row.calibrationRequired ? (
            <StatusBadge
              value="yes"
              map={{ yes: { label: t('detail.overview.yes'), tone: 'warning' } }}
            />
          ) : (
            t('detail.overview.no')
          )}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">{t('detail.overview.acceptance')}</dt>
        <dd>
          {row.rating != null ? `${row.rating}/5` : '—'}
          {row.ratingNote ? ` — ${row.ratingNote}` : ''}
        </dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-muted-foreground mb-1">{t('detail.overview.assignments')}</dt>
        <dd>
          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th>{t('detail.overview.person')}</th>
                <th>{t('detail.overview.role')}</th>
                <th>{t('detail.overview.response')}</th>
                <th>{t('detail.overview.note')}</th>
              </tr>
            </thead>
            <tbody>
              {row.assignments.map((item) => (
                <tr key={item.id} className="border-t">
                  <td>{userName(item.userId)}</td>
                  <td>
                    {item.role === 'primary'
                      ? t('detail.overview.primary')
                      : t('detail.overview.assistant')}
                  </td>
                  <td>
                    <StatusBadge value={item.response} map={assignmentResponseMap} />
                  </td>
                  <td>{item.responseNote ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </dd>
      </div>
    </dl>
  )
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
    <div className="space-y-3">
      {canWrite && <Button onClick={onAdd}>{t('detail.logs.add')}</Button>}
      <Timeline
        events={logs.map((item) => ({
          at: item.at,
          title: item.action,
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
    </div>
  )
}

function PartsTab({
  parts,
  canWrite,
  onAdd,
  onDelete,
}: {
  parts: NonNullable<ReturnType<typeof useRepair>['data']>['parts']
  canWrite: boolean
  onAdd: () => void
  onDelete: (id: string) => void
}) {
  const { t } = useTranslation('repairs')
  const lotName = useStockLotNames(parts)
  return (
    <div className="space-y-3">
      {canWrite && <Button onClick={onAdd}>{t('detail.parts.add')}</Button>}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>{t('detail.parts.source')}</th>
            <th>{t('detail.parts.name')}</th>
            <th>{t('detail.parts.quantity')}</th>
            <th>{t('detail.parts.unitCost')}</th>
            <th>{t('detail.parts.total')}</th>
            <th>{t('detail.parts.lot')}</th>
            <th>{t('detail.parts.invoice')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {parts.map((row) => (
            <tr key={row.id} className="border-t">
              <td>
                <StatusBadge value={row.source} map={partSourceMap} />
              </td>
              <td>{row.name}</td>
              <td>{formatQty(row.quantity)}</td>
              <td>{formatVnd(row.unitCost)}</td>
              <td>{formatVnd(row.totalCost)}</td>
              <td>{lotName(row.stockLotId)}</td>
              <td>
                <FileLink fileId={row.invoiceFileId} label={t('detail.parts.invoice')} />
              </td>
              <td>
                {canWrite && (
                  <Button size="sm" variant="ghost" onClick={() => onDelete(row.id)}>
                    {t('detail.parts.delete')}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function VendorsTab({
  vendors,
  canWrite,
  onAdd,
  onDelete,
}: {
  vendors: NonNullable<ReturnType<typeof useRepair>['data']>['vendors']
  canWrite: boolean
  onAdd: () => void
  onDelete: (id: string) => void
}) {
  const { t } = useTranslation('repairs')
  const supplierName = useSupplierNames(vendors.map((row) => row.supplierId))
  return (
    <div className="space-y-3">
      {canWrite && <Button onClick={onAdd}>{t('detail.vendors.add')}</Button>}
      <ul className="space-y-2 text-sm">
        {vendors.map((row) => (
          <li key={row.id} className="rounded border p-3">
            <p>
              {t('detail.vendors.supplier')}: {supplierName(row.supplierId)}
            </p>
            <p>
              {row.engineerName} {row.engineerPhone}
            </p>
            <p>
              {t('detail.vendors.quotation')}: {formatVnd(row.quotationAmount) || '—'}
            </p>
            <p>
              {t('detail.vendors.contract')}: {row.contractNo ?? '—'}
            </p>
            <p>
              <FileLink fileId={row.quotationFileId} label={t('detail.vendors.quotationFile')} />
            </p>
            {canWrite && (
              <Button size="sm" variant="ghost" onClick={() => onDelete(row.id)}>
                {t('detail.parts.delete')}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
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
    <a
      className="text-primary hover:underline"
      href={url.data.url}
      target="_blank"
      rel="noreferrer"
    >
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
  onDelete,
}: {
  equipmentId: string
  costs: NonNullable<ReturnType<typeof useRepair>['data']>['costs']
  total: string
  warning: boolean
  canWrite: boolean
  onAdd: () => void
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
    <div className="space-y-3">
      {canWrite && <Button onClick={onAdd}>{t('detail.costs.add')}</Button>}
      {warning &&
        (percent && originalValue ? (
          <p className="text-destructive text-sm">
            {t('detail.costOverThreshold', {
              total: formatVnd(total) || total,
              original: formatVnd(originalValue) || originalValue,
              pct: percent,
            })}
          </p>
        ) : (
          <p className="text-destructive text-sm">{t('detail.costOverThresholdGeneric')}</p>
        ))}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>{t('detail.costs.category')}</th>
            <th>{t('detail.costs.description')}</th>
            <th>{t('detail.costs.amount')}</th>
            <th>{t('detail.costs.invoiceNo')}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {costs.map((row) => (
            <tr key={row.id} className="border-t">
              <td>
                <StatusBadge value={row.category} map={costCategoryMap} />
              </td>
              <td>{row.description}</td>
              <td>{formatVnd(row.amount)}</td>
              <td>
                <CostAttachments costId={row.id} canWrite={canWrite} />
              </td>
              <td>
                {canWrite && (
                  <Button size="sm" variant="ghost" onClick={() => onDelete(row.id)}>
                    {t('detail.parts.delete')}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="font-medium">
        {t('detail.costs.total', { amount: formatVnd(total) || '0 ₫' })}
      </p>
    </div>
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
                className="text-primary hover:underline"
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
  const { t: tc } = useTranslation()
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
          <div key={field.id} className="space-y-2 rounded border p-2">
            <div className="flex items-center justify-between">
              <p className="text-sm">{t('detail.complete.step', { n: index + 1 })}</p>
              <Button type="button" size="sm" variant="ghost" onClick={() => steps.remove(index)}>
                {tc('actions.delete')}
              </Button>
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
            <Button type="button" size="sm" variant="ghost" onClick={() => parts.remove(index)}>
              {tc('actions.delete')}
            </Button>
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
  onClose,
  onDone,
}: {
  id: string
  equipmentId: string
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation('repairs')
  const form = useForm<PartForm>({
    resolver: zodResolver(partSchema),
    defaultValues: {
      source: 'stock',
      name: '',
      quantity: '1',
      unitCost: '',
      supplyId: null,
      stockLotId: null,
      invoiceFileId: null,
      componentId: null,
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
  onClose,
  onDone,
}: {
  id: string
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation('repairs')
  const form = useForm<VendorForm>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      supplierId: '',
      engineerName: '',
      engineerPhone: '',
      quotationAmount: '',
      quotationFileId: null,
      contractNo: '',
      visitAt: '',
      note: '',
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
          await api.addRepairVendor(id, {
            supplierId: values.supplierId,
            engineerName: values.engineerName || undefined,
            engineerPhone: values.engineerPhone || undefined,
            quotationAmount: values.quotationAmount || undefined,
            quotationFileId: values.quotationFileId ?? undefined,
            contractNo: values.contractNo || undefined,
            visitAt: values.visitAt || undefined,
            note: values.note || undefined,
          })
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
  onClose,
  onDone,
}: {
  id: string
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation('repairs')
  const form = useForm<CostForm>({
    resolver: zodResolver(costSchema),
    defaultValues: {
      category: 'parts',
      description: '',
      amount: '',
      invoiceNo: '',
      invoiceDate: '',
      paidAt: '',
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
          await api.addRepairCost(id, {
            category: values.category,
            description: values.description,
            amount: values.amount,
            invoiceNo: values.invoiceNo || undefined,
            invoiceDate: values.invoiceDate || undefined,
            paidAt: values.paidAt || undefined,
          })
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
