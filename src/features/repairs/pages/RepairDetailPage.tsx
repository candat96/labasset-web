import { useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
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
import { ADM, STAFF } from '@/routes/roles'
import { applyServerErrors, messageFor } from '@/api/errors'
import { catalogOptions, staffUserOptions, supplyOptions } from '@/api/references'
import { uploadFile } from '@/api/files'
import { useAuthStore } from '@/stores/auth.store'
import * as api from '../api'
import { usePublicRepairSettings, useRepair, useInvalidateRepairs } from '../hooks'
import { visibleRepairActions, type RepairAction } from '../actions'
import {
  acceptanceSchema,
  assignSchema,
  completeSchema,
  costSchema,
  diagnosisSchema,
  editRepairSchema,
  logSchema,
  partSchema,
  vendorSchema,
  type AcceptanceForm,
  type AssignForm,
  type CompleteForm,
  type CostForm,
  type DiagnosisForm,
  type EditRepairForm,
  type LogForm,
  type PartForm,
  type VendorForm,
} from '../schema'
import { COST_CATEGORIES, PART_SOURCES, RESOLUTION_TYPES, WORK_STATUSES } from '../types'
import { SignaturePad } from '../components/SignaturePad'

const RESOLUTION_LABEL: Record<(typeof RESOLUTION_TYPES)[number], string> = {
  internal: 'Nội bộ',
  vendor: 'Thuê ngoài',
  warranty: 'Bảo hành',
  spare_equipment: 'Máy dự phòng',
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

export function Component() {
  const { id = '' } = useParams()
  const location = useLocation()
  const prefillFault =
    location.state && typeof location.state === 'object'
      ? ((location.state as { faultId?: string }).faultId ?? null)
      : null
  const detail = useRepair(id)
  const settings = usePublicRepairSettings()
  const invalidate = useInvalidateRepairs()
  const isAdm = useCan(ADM)
  const isVt = useCan(STAFF)
  const userId = useAuthStore((s) => s.user?.id) ?? ''
  const roles = useAuthStore((s) => s.user?.roles)
  const { confirm, dialog } = useConfirm()
  const [open, setOpen] = useState<
    RepairAction | 'log' | 'part' | 'vendor' | 'cost' | 'sign' | null
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
  const closed = row?.status === 'closed' || row?.status === 'cancelled'
  const afterComplete = ['completed', 'acceptance', 'closed', 'cancelled'].includes(
    row?.status ?? '',
  )
  const canWork = actions.includes('diagnosis') || (!afterComplete && isAdm)
  const canCosts = (canWork || isAdm) && !closed

  const run = async (title: string, action: () => Promise<unknown>, destructive = false) => {
    if ((await confirm({ title, destructive })) === false) return
    try {
      await action()
      toast.success('Đã cập nhật phiếu')
      void invalidate()
    } catch (error) {
      toast.error(messageFor(error))
    }
  }

  if (detail.isPending) return <p role="status">Đang tải phiếu sửa chữa…</p>
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
                map={{ overdue: { label: 'Quá hạn', tone: 'danger' } }}
              />
            )}
            {row.costWarning && (
              <StatusBadge
                value="cost"
                map={{ cost: { label: 'Cảnh báo chi phí', tone: 'danger' } }}
              />
            )}
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {actions.includes('accept') && (
              <Button onClick={() => void run('Tiếp nhận phiếu?', () => api.acceptRepair(id))}>
                Tiếp nhận
              </Button>
            )}
            {actions.includes('assign') && (
              <Button variant="outline" onClick={() => setOpen('assign')}>
                Phân công
              </Button>
            )}
            {actions.includes('respond') && (
              <>
                <Button
                  onClick={() =>
                    void run('Nhận việc?', () =>
                      api.respondAssignment(id, { response: 'accepted' }),
                    )
                  }
                >
                  Nhận việc
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    void run('Từ chối việc?', () =>
                      api.respondAssignment(id, { response: 'declined' }),
                    )
                  }
                >
                  Từ chối
                </Button>
              </>
            )}
            {actions.includes('diagnosis') && (
              <Button variant="outline" onClick={() => setOpen('diagnosis')}>
                Chẩn đoán
              </Button>
            )}
            {actions.includes('status') && (
              <Button variant="outline" onClick={() => setOpen('status')}>
                Đổi trạng thái
              </Button>
            )}
            {actions.includes('complete') && (
              <Button onClick={() => setOpen('complete')}>Hoàn thành</Button>
            )}
            {actions.includes('acceptance') && (
              <Button onClick={() => setOpen('acceptance')}>Nghiệm thu</Button>
            )}
            {actions.includes('close') && (
              <Button
                variant="outline"
                onClick={() => void run('Đóng phiếu?', () => api.closeRepair(id))}
              >
                Đóng
              </Button>
            )}
            {actions.includes('cancel') && (
              <Button
                variant="outline"
                onClick={async () => {
                  const reason = await confirm({
                    title: 'Huỷ phiếu?',
                    requireReason: true,
                    destructive: true,
                    confirmLabel: 'Huỷ phiếu',
                  })
                  if (reason === false) return
                  try {
                    await api.cancelRepair(id, reason)
                    toast.success('Đã huỷ phiếu')
                    void invalidate()
                  } catch (error) {
                    toast.error(messageFor(error))
                  }
                }}
              >
                Huỷ
              </Button>
            )}
            {actions.includes('edit') && (
              <Button variant="outline" onClick={() => setOpen('edit')}>
                Sửa
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
                In biên bản
              </Button>
            )}
          </div>
        }
        information={
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Máy</dt>
              <dd>
                {row.equipment ? (
                  <Link
                    className="text-primary hover:underline"
                    to={`/equipment/${row.equipmentId}`}
                  >
                    {row.equipment.code} – {row.equipment.name}
                  </Link>
                ) : (
                  row.equipmentId
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Người xử lý</dt>
              <dd>{row.assignee?.fullName ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Hạn</dt>
              <dd>{formatDateTime(row.dueAt) || '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Chi phí</dt>
              <dd>{formatVnd(row.totalCost) || '—'}</dd>
            </div>
          </dl>
        }
        tabs={[
          {
            value: 'overview',
            label: 'Tổng quan',
            content: <OverviewTab row={row} faultTitle={faultTitle} />,
          },
          {
            value: 'logs',
            label: 'Nhật ký',
            content: (
              <LogsTab
                id={id}
                logs={row.logs}
                canWrite={canWork && !afterComplete}
                onAdd={() => setOpen('log')}
              />
            ),
          },
          {
            value: 'parts',
            label: 'Linh kiện/vật tư',
            content: (
              <PartsTab
                parts={row.parts}
                canWrite={canWork && !afterComplete}
                onAdd={() => setOpen('part')}
                onDelete={async (pid) => {
                  if ((await confirm({ title: 'Xoá linh kiện?', destructive: true })) === false)
                    return
                  try {
                    await api.deleteRepairPart(id, pid)
                    toast.success('Đã xoá')
                    void invalidate()
                  } catch (error) {
                    toast.error(messageFor(error))
                  }
                }}
              />
            ),
          },
          {
            value: 'vendors',
            label: 'Thuê ngoài',
            content: (
              <VendorsTab
                vendors={row.vendors}
                canWrite={canCosts}
                onAdd={() => setOpen('vendor')}
                onDelete={async (vid) => {
                  if ((await confirm({ title: 'Xoá thuê ngoài?', destructive: true })) === false)
                    return
                  try {
                    await api.deleteRepairVendor(id, vid)
                    toast.success('Đã xoá')
                    void invalidate()
                  } catch (error) {
                    toast.error(messageFor(error))
                  }
                }}
              />
            ),
          },
          {
            value: 'costs',
            label: 'Chi phí',
            content: (
              <CostsTab
                id={id}
                costs={row.costs}
                total={row.totalCost}
                warning={row.costWarning}
                canWrite={canCosts}
                onAdd={() => setOpen('cost')}
                onDelete={async (cid) => {
                  if ((await confirm({ title: 'Xoá chi phí?', destructive: true })) === false)
                    return
                  try {
                    await api.deleteRepairCost(id, cid)
                    toast.success('Đã xoá')
                    void invalidate()
                  } catch (error) {
                    toast.error(messageFor(error))
                  }
                }}
              />
            ),
          },
          {
            value: 'docs',
            label: 'Tài liệu & chữ ký',
            content: (
              <div className="space-y-3">
                {canCosts && <Button onClick={() => setOpen('sign')}>Ký</Button>}
                <AttachmentsPanel
                  entityType="repair_ticket"
                  entityId={id}
                  canWrite={!closed && (isVt || canWork)}
                  kinds={[
                    { value: 'photo', label: 'Ảnh' },
                    { value: 'video', label: 'Video' },
                    { value: 'signature_technician', label: 'Chữ ký kỹ thuật' },
                    { value: 'signature_department', label: 'Chữ ký khoa' },
                    { value: 'report', label: 'Biên bản' },
                    { value: 'other', label: 'Khác' },
                  ]}
                />
              </div>
            ),
          },
          {
            value: 'audit',
            label: 'Lịch sử thay đổi',
            content: <AuditTrail entityType="repair_ticket" entityId={id} />,
          },
        ]}
      />
      {open === 'assign' && (
        <AssignDialog
          id={id}
          equipmentId={row.equipmentId}
          onClose={() => setOpen(null)}
          onDone={invalidate}
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
          onDone={invalidate}
        />
      )}
      {open === 'status' && (
        <StatusDialog id={id} onClose={() => setOpen(null)} onDone={invalidate} />
      )}
      {open === 'complete' && (
        <CompleteDialog id={id} onClose={() => setOpen(null)} onDone={invalidate} />
      )}
      {open === 'acceptance' && (
        <AcceptanceDialog id={id} onClose={() => setOpen(null)} onDone={invalidate} />
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
          onDone={invalidate}
        />
      )}
      {open === 'log' && <LogDialog id={id} onClose={() => setOpen(null)} onDone={invalidate} />}
      {open === 'part' && (
        <PartDialog
          id={id}
          equipmentId={row.equipmentId}
          onClose={() => setOpen(null)}
          onDone={invalidate}
        />
      )}
      {open === 'vendor' && (
        <VendorDialog id={id} onClose={() => setOpen(null)} onDone={invalidate} />
      )}
      {open === 'cost' && <CostDialog id={id} onClose={() => setOpen(null)} onDone={invalidate} />}
      {open === 'sign' && <SignDialog id={id} onClose={() => setOpen(null)} onDone={invalidate} />}
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
  return (
    <dl className="grid gap-3 sm:grid-cols-2 text-sm">
      <div className="sm:col-span-2">
        <dt className="text-muted-foreground">Mô tả</dt>
        <dd className="whitespace-pre-wrap">{row.description}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Mã lỗi</dt>
        <dd>{row.errorCode ?? '—'}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Lỗi thư viện</dt>
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
        <dt className="text-muted-foreground">Chẩn đoán</dt>
        <dd className="whitespace-pre-wrap">{row.diagnosis ?? '—'}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Phương án</dt>
        <dd>
          {row.resolutionType && row.resolutionType in RESOLUTION_LABEL
            ? RESOLUTION_LABEL[row.resolutionType as keyof typeof RESOLUTION_LABEL]
            : (row.resolutionType ?? '—')}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Tóm tắt xử lý</dt>
        <dd>{row.resolutionSummary ?? '—'}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Bảo hành sau sửa</dt>
        <dd>{formatDate(row.postRepairWarrantyUntil) || '—'}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Kiểm định yêu cầu</dt>
        <dd>
          {row.calibrationRequired ? (
            <StatusBadge value="yes" map={{ yes: { label: 'Có', tone: 'warning' } }} />
          ) : (
            'Không'
          )}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Nghiệm thu</dt>
        <dd>
          {row.rating != null ? `${row.rating}/5` : '—'}
          {row.ratingNote ? ` — ${row.ratingNote}` : ''}
        </dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-muted-foreground mb-1">Phân công</dt>
        <dd>
          <table className="w-full">
            <thead>
              <tr className="text-left">
                <th>Người</th>
                <th>Vai trò</th>
                <th>Phản hồi</th>
                <th>Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {row.assignments.map((item) => (
                <tr key={item.id} className="border-t">
                  <td>{item.userId ?? '—'}</td>
                  <td>{item.role === 'primary' ? 'Chính' : 'Phụ'}</td>
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
  id: string
  logs: NonNullable<ReturnType<typeof useRepair>['data']>['logs']
  canWrite: boolean
  onAdd: () => void
}) {
  return (
    <div className="space-y-3">
      {canWrite && <Button onClick={onAdd}>Thêm nhật ký</Button>}
      <Timeline
        events={logs.map((item) => ({
          at: item.at,
          title: item.action,
          summary: [item.note, item.durationMinutes != null ? `${item.durationMinutes} phút` : null]
            .filter(Boolean)
            .join(' · '),
          by: item.byUserId,
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
  return (
    <div className="space-y-3">
      {canWrite && <Button onClick={onAdd}>Thêm linh kiện</Button>}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>Nguồn</th>
            <th>Tên</th>
            <th>SL</th>
            <th>Đơn giá</th>
            <th>Thành tiền</th>
            <th>Lô</th>
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
              <td>{row.stockLotId ?? '—'}</td>
              <td>
                {canWrite && (
                  <Button size="sm" variant="ghost" onClick={() => onDelete(row.id)}>
                    Xoá
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
  return (
    <div className="space-y-3">
      {canWrite && <Button onClick={onAdd}>Thêm thuê ngoài</Button>}
      <ul className="space-y-2 text-sm">
        {vendors.map((row) => (
          <li key={row.id} className="rounded border p-3">
            <p>NCC: {row.supplierId ?? '—'}</p>
            <p>
              {row.engineerName} {row.engineerPhone}
            </p>
            <p>Báo giá: {formatVnd(row.quotationAmount) || '—'}</p>
            <p>HĐ: {row.contractNo ?? '—'}</p>
            {canWrite && (
              <Button size="sm" variant="ghost" onClick={() => onDelete(row.id)}>
                Xoá
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function CostsTab({
  id,
  costs,
  total,
  warning,
  canWrite,
  onAdd,
  onDelete,
}: {
  id: string
  costs: NonNullable<ReturnType<typeof useRepair>['data']>['costs']
  total: string
  warning: boolean
  canWrite: boolean
  onAdd: () => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="space-y-3">
      {canWrite && <Button onClick={onAdd}>Thêm chi phí</Button>}
      {warning && (
        <p className="text-destructive text-sm">Chi phí vượt ngưỡng cảnh báo so với nguyên giá.</p>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>Loại</th>
            <th>Mô tả</th>
            <th>Số tiền</th>
            <th>HĐ</th>
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
              <td>{row.invoiceNo ?? '—'}</td>
              <td>
                {canWrite && (
                  <Button size="sm" variant="ghost" onClick={() => onDelete(row.id)}>
                    Xoá
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="font-medium">Tổng: {formatVnd(total) || '0 ₫'}</p>
      <AttachmentsPanel
        entityType="repair_cost"
        entityId={id}
        canWrite={canWrite}
        kinds={[{ value: 'invoice', label: 'Hoá đơn' }]}
      />
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
      title="Phân công"
      form={form}
      onSubmit={async (values) => {
        try {
          await api.assignRepair(id, {
            primaryUserId: values.primaryUserId,
            assistantIds: values.assistantIds,
            dueAt: values.dueAt || undefined,
          })
          toast.success('Đã phân công')
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
                {row.fullName} ({row.openTickets} phiếu mở)
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
              label="Người xử lý chính"
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
              label="Người phụ"
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
      <DatetimeField control={form.control} name="dueAt" label="Hạn (tuỳ chọn)" />
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
      title="Chẩn đoán"
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
          toast.success('Đã lưu chẩn đoán')
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
            <FormLabel>Chẩn đoán</FormLabel>
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
              label="Nhóm lỗi"
              queryKey="fault-groups"
              loadOptions={(q) => catalogOptions('fault-groups', q)}
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
        label="Phương án"
        emptyLabel="Chưa chọn"
        options={RESOLUTION_TYPES.map((item) => ({ value: item, label: RESOLUTION_LABEL[item] }))}
      />
    </FormDialog>
  )
}

function StatusDialog({
  id,
  onClose,
  onDone,
}: {
  id: string
  onClose: () => void
  onDone: () => void
}) {
  const form = useForm<{ status: (typeof WORK_STATUSES)[number]; note: string }>({
    defaultValues: { status: 'in_progress', note: '' },
  })
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Đổi trạng thái"
      form={form}
      onSubmit={async (values) => {
        try {
          await api.changeRepairStatus(id, { status: values.status, note: values.note || ' ' })
          toast.success('Đã đổi trạng thái')
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
        label="Trạng thái"
        options={WORK_STATUSES.map((item) => ({
          value: item,
          label: repairStatusMap[item]?.label ?? item,
        }))}
      />
      <TextField control={form.control} name="note" label="Ghi chú" />
    </FormDialog>
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
  const form = useForm<CompleteForm>({
    resolver: zodResolver(completeSchema),
    defaultValues: {
      resolutionSummary: '',
      postRepairWarrantyUntil: '',
      calibrationRequired: false,
      propose: false,
      proposeTitle: '',
      proposeInstruction: '',
    },
  })
  const propose = form.watch('propose')
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Hoàn thành"
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
                  steps: values.proposeInstruction
                    ? [{ order: 1, instruction: values.proposeInstruction }]
                    : [],
                }
              : undefined,
          })
          toast.success('Đã hoàn thành phiếu')
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
            <FormLabel>Tóm tắt xử lý</FormLabel>
            <FormControl>
              <Textarea {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <DateField control={form.control} name="postRepairWarrantyUntil" label="Bảo hành đến" />
      <SwitchField control={form.control} name="calibrationRequired" label="Yêu cầu kiểm định" />
      <SwitchField control={form.control} name="propose" label="Đề xuất vào thư viện lỗi" />
      {propose && (
        <>
          <TextField control={form.control} name="proposeTitle" label="Tiêu đề lỗi" />
          <TextField control={form.control} name="proposeInstruction" label="Bước xử lý" />
        </>
      )}
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
  const form = useForm<AcceptanceForm>({
    resolver: zodResolver(acceptanceSchema),
    defaultValues: { accepted: true, rating: '', note: '' },
  })
  const accepted = form.watch('accepted')
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Nghiệm thu"
      form={form}
      onSubmit={async (values) => {
        try {
          await api.acceptRepairResult(id, {
            accepted: values.accepted,
            rating: values.rating === '' ? undefined : values.rating,
            note: values.note || undefined,
          })
          toast.success('Đã nghiệm thu')
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
            <FormLabel>Kết quả</FormLabel>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={field.value === true}
                  onChange={() => field.onChange(true)}
                />
                Đạt
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={field.value === false}
                  onChange={() => field.onChange(false)}
                />
                Không đạt
              </label>
            </div>
          </FormItem>
        )}
      />
      {accepted && (
        <NumberField control={form.control} name="rating" label="Đánh giá (1–5 sao)" min={1} />
      )}
      <TextField control={form.control} name="note" label="Ghi chú" />
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
  const form = useForm<EditRepairForm>({
    resolver: zodResolver(editRepairSchema),
    defaultValues,
  })
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Sửa phiếu"
      form={form}
      onSubmit={async (values) => {
        try {
          await api.updateRepair(id, values)
          toast.success('Đã lưu phiếu')
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
            <FormLabel>Mô tả</FormLabel>
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
        label="Mức khẩn"
        options={['low', 'medium', 'high', 'critical'].map((item) => ({
          value: item,
          label: faultSeverityMap[item]?.label ?? item,
        }))}
      />
      <SwitchField control={form.control} name="equipmentDown" label="Máy ngừng" />
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
      title="Thêm nhật ký"
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
          toast.success('Đã ghi nhật ký')
          onDone()
          onClose()
        } catch (error) {
          if (!applyServerErrors(form, error)) toast.error(messageFor(error))
        }
      }}
    >
      <DatetimeField control={form.control} name="at" label="Thời điểm" />
      <TextField control={form.control} name="action" label="Hành động" />
      <TextField control={form.control} name="note" label="Ghi chú" />
      <NumberField
        control={form.control}
        name="durationMinutes"
        label="Thời lượng (phút)"
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
      title="Thêm linh kiện"
      width="lg"
      form={form}
      onSubmit={async (values) => {
        try {
          await api.addRepairPart(id, {
            source: values.source,
            name: values.name || 'Vật tư',
            quantity: values.quantity,
            unitCost: values.unitCost || undefined,
            supplyId: values.supplyId ?? undefined,
            stockLotId: values.stockLotId ?? undefined,
            invoiceFileId: values.invoiceFileId ?? undefined,
            componentId: values.componentId ?? undefined,
            newSerial: values.newSerial || undefined,
            note: values.note || undefined,
            reason: values.reason || undefined,
          })
          toast.success('Đã thêm linh kiện')
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
            <FormLabel>Nguồn</FormLabel>
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
                  label="Vật tư"
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
              label="Lô kho"
              emptyLabel="Không chọn"
              options={lots.map((lot) => ({
                value: lot.id,
                label: `${lot.lotNo ?? lot.id} (${lot.remainingQty ?? lot.qtyOnHand ?? ''})`,
              }))}
            />
          )}
        </>
      )}
      {source !== 'stock' && <TextField control={form.control} name="name" label="Tên" />}
      <QtyField control={form.control} name="quantity" label="Số lượng" />
      {source !== 'stock' && <MoneyField control={form.control} name="unitCost" label="Đơn giá" />}
      {source === 'purchased' && (
        <FormField
          control={form.control}
          name="invoiceFileId"
          render={({ field }) => (
            <FormItem>
              <FileField label="Hoá đơn" value={field.value} onChange={field.onChange} />
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
            label="Linh kiện máy"
            options={(components.data ?? []).map((item) => ({
              value: item.id,
              label: item.name,
            }))}
          />
          <TextField control={form.control} name="newSerial" label="Serial mới" />
          <TextField control={form.control} name="reason" label="Lý do thay" />
        </>
      )}
      <TextField control={form.control} name="note" label="Ghi chú" />
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
      title="Thuê ngoài"
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
          toast.success('Đã thêm thuê ngoài')
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
              label="Nhà cung cấp"
              queryKey="suppliers"
              loadOptions={(q) => catalogOptions('suppliers', q)}
              value={field.value || null}
              onChange={(v) => field.onChange(typeof v === 'string' ? v : '')}
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <TextField control={form.control} name="engineerName" label="Kỹ thuật viên" />
      <TextField control={form.control} name="engineerPhone" label="Điện thoại" />
      <MoneyField control={form.control} name="quotationAmount" label="Giá báo" />
      <FormField
        control={form.control}
        name="quotationFileId"
        render={({ field }) => (
          <FormItem>
            <FileField label="File báo giá" value={field.value} onChange={field.onChange} />
            <FormMessage />
          </FormItem>
        )}
      />
      <TextField control={form.control} name="contractNo" label="Số HĐ" />
      <DatetimeField control={form.control} name="visitAt" label="Ngày đến" />
      <TextField control={form.control} name="note" label="Ghi chú" />
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
      title="Thêm chi phí"
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
          toast.success('Đã thêm chi phí')
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
        label="Loại"
        options={COST_CATEGORIES.map((item) => ({
          value: item,
          label: costCategoryMap[item]?.label ?? item,
        }))}
      />
      <TextField control={form.control} name="description" label="Mô tả" />
      <MoneyField control={form.control} name="amount" label="Số tiền" />
      <TextField control={form.control} name="invoiceNo" label="Số hoá đơn" />
      <DateField control={form.control} name="invoiceDate" label="Ngày hoá đơn" />
      <DatetimeField control={form.control} name="paidAt" label="Ngày thanh toán" />
    </FormDialog>
  )
}

function SignDialog({
  id,
  onClose,
  onDone,
}: {
  id: string
  onClose: () => void
  onDone: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const form = useForm<{ role: 'technician' | 'department'; signerName: string }>({
    defaultValues: { role: 'technician', signerName: '' },
  })
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Ký biên bản"
      form={form}
      onSubmit={async (values) => {
        if (!file) {
          toast.error('Hãy ký trên vùng vẽ')
          return
        }
        try {
          const fileId = await uploadFile(file)
          await api.addRepairSignature(id, {
            role: values.role,
            fileId,
            signerName: values.signerName || 'Người ký',
          })
          toast.success('Đã lưu chữ ký')
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
        label="Vai trò"
        options={[
          { value: 'technician', label: 'Kỹ thuật' },
          { value: 'department', label: 'Khoa' },
        ]}
      />
      <TextField control={form.control} name="signerName" label="Tên người ký" />
      <SignaturePad onFile={setFile} />
    </FormDialog>
  )
}
