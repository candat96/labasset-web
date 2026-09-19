import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DetailLayout } from '@/components/detail-layout'
import { ErrorState } from '@/components/page/ErrorState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/status-badge'
import { FormDialog } from '@/components/form/FormDialog'
import { TextField, NumberField, SelectField, SwitchField } from '@/components/form/fields'
import { DateField } from '@/components/form/date-field'
import { FileField } from '@/components/form/file-field'
import { AsyncSelect } from '@/components/form/async-select'
import { Form } from '@/components/ui/form'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AttachmentsPanel } from '@/components/attachments-panel'
import { Timeline } from '@/components/timeline'
import { AuditTrail } from '@/components/audit-trail'
import { useConfirm } from '@/components/confirm-dialog'
import {
  equipmentStatusMap,
  accessoryConditionMap,
  componentStatusMap,
  transferStatusMap,
} from '@/lib/status-maps'
import { formatDate, formatDateTime } from '@/lib/format/date'
import { formatVnd } from '@/lib/format/money'
import { useCan } from '@/app/guards/useCan'
import { ADM, STAFF } from '@/routes/roles'
import { applyServerErrors, isApiError, messageFor } from '@/api/errors'
import { departmentOptions } from '@/api/references'
import { useAuthStore } from '@/stores/auth.store'
import { assistantPath } from '@/lib/ai-link'
import * as api from '../api'
import { useEquipment, useInvalidateEquipment } from '../hooks'
import {
  accessorySchema,
  componentSchema,
  softwareSchema,
  type AccessoryForm,
  type ComponentForm,
  type SoftwareForm,
} from '../schema'
import { EQUIPMENT_STATUSES, STATUS_TRANSITIONS, type EquipmentStatus } from '../types'

const kinds = [
  { value: 'photo', label: 'Ảnh' },
  { value: 'manual', label: 'Hướng dẫn' },
  { value: 'catalogue', label: 'Catalogue' },
  { value: 'co_cq', label: 'CO/CQ' },
  { value: 'license', label: 'Giấy phép' },
  { value: 'calibration_cert', label: 'Chứng chỉ KĐ' },
  { value: 'handover', label: 'Biên bản' },
  { value: 'maintenance_contract', label: 'Hợp đồng BD' },
  { value: 'diagram', label: 'Sơ đồ' },
  { value: 'other', label: 'Khác' },
]

export function Component() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const detail = useEquipment(id)
  const canWrite = useCan(STAFF)
  const isAdm = useCan(ADM)
  const userId = useAuthStore((s) => s.user?.id)
  const { confirm, dialog } = useConfirm()
  const invalidate = useInvalidateEquipment()
  const [statusOpen, setStatusOpen] = useState(false)
  const [cloneOpen, setCloneOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  if (detail.isPending) return <p role="status">Đang tải máy…</p>
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data
  const status = (EQUIPMENT_STATUSES.find((s) => s === row.status) ?? 'active') as EquipmentStatus
  const run = async (title: string, action: () => Promise<unknown>) => {
    if ((await confirm({ title, destructive: title.includes('Xoá') })) === false) return
    try {
      await action()
      toast.success('Đã thực hiện')
      void invalidate()
    } catch (error) {
      toast.error(messageFor(error))
    }
  }
  return (
    <>
      {dialog}
      <DetailLayout
        code={row.code}
        name={row.name}
        badge={
          row.status === 'disposed' ? (
            <s>
              <StatusBadge value={row.status} map={equipmentStatusMap} />
            </s>
          ) : (
            <StatusBadge value={row.status} map={equipmentStatusMap} />
          )
        }
        actions={
          <>
            {canWrite && (
              <Button onClick={() => setStatusOpen(true)} disabled={status === 'disposed'}>
                Đổi trạng thái
              </Button>
            )}
            {canWrite && (
              <Button variant="outline" onClick={() => setTransferOpen(true)}>
                Điều chuyển
              </Button>
            )}
            {canWrite && (
              <Button asChild variant="outline">
                <Link to={`/equipment/${id}/edit`}>Sửa</Link>
              </Button>
            )}
            {canWrite && (
              <Button variant="outline" onClick={() => setCloneOpen(true)}>
                Nhân bản
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to={assistantPath({ equipmentId: id })}>Hỏi AI về máy này</Link>
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await api.downloadQrPng(id)
                  await api.downloadQrLabels([id])
                } catch (error) {
                  toast.error(messageFor(error))
                }
              }}
            >
              In tem
            </Button>
            {isAdm && (
              <Button
                variant="outline"
                onClick={() =>
                  void run('Xoay mã QR? Tem cũ sẽ hết hiệu lực.', () => api.rotateQr(id))
                }
              >
                Xoay QR
              </Button>
            )}
            {isAdm && (status === 'retired' || status === 'disposed') && (
              <Button
                variant="destructive"
                onClick={() =>
                  void run('Xoá máy này?', async () => {
                    await api.deleteEquipment(id)
                    navigate('/equipment')
                  })
                }
              >
                Xoá
              </Button>
            )}
          </>
        }
        information={
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground text-xs">Khoa</dt>
              <dd>{row.department?.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Vị trí</dt>
              <dd>{row.location ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Phụ kiện</dt>
              <dd>{row.counts.accessories}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Linh kiện đến hạn</dt>
              <dd>{row.counts.componentsDue}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-xs">Sửa chữa đang mở</dt>
              <dd>{row.counts.openRepairs}</dd>
            </div>
          </dl>
        }
        tabs={[
          { value: 'overview', label: 'Tổng quan', content: <Overview row={row} /> },
          {
            value: 'network',
            label: 'Kết nối & mạng',
            content: <NetworkTab id={id} canWrite={canWrite} />,
          },
          {
            value: 'accessories',
            label: 'Phụ kiện',
            content: <AccessoriesTab id={id} canWrite={canWrite} />,
          },
          {
            value: 'software',
            label: 'Phần mềm',
            content: <SoftwareTab id={id} canWrite={canWrite} />,
          },
          {
            value: 'components',
            label: 'Linh kiện',
            content: (
              <ComponentsTab
                id={id}
                canWrite={canWrite}
                hours={row.currentRunHours}
                tests={row.currentTestCount}
              />
            ),
          },
          {
            value: 'supplies',
            label: 'Vật tư',
            content: <SuppliesTab id={id} canWrite={canWrite} />,
          },
          {
            value: 'counters',
            label: 'Bộ đếm',
            content: <CountersTab id={id} canWrite={canWrite} />,
          },
          {
            value: 'docs',
            label: 'Tài liệu',
            content: <AttachmentsPanel entityType="equipment" entityId={id} kinds={kinds} />,
          },
          { value: 'repairs', label: 'Sửa chữa', content: <RepairsTab id={id} /> },
          {
            value: 'maintenance',
            label: 'Bảo dưỡng–Kiểm định',
            content: <MaintenanceTab id={id} />,
          },
          {
            value: 'transfers',
            label: 'Điều chuyển',
            content: (
              <TransfersTab
                id={id}
                canWrite={canWrite}
                isAdm={isAdm}
                userId={userId}
                onCreate={() => setTransferOpen(true)}
              />
            ),
          },
          { value: 'timeline', label: 'Timeline', content: <TimelineTab id={id} /> },
          {
            value: 'audit',
            label: 'Lịch sử thay đổi',
            content: <AuditTrail entityType="equipment" entityId={id} />,
          },
        ]}
      />
      {statusOpen && (
        <StatusDialog
          id={id}
          from={status}
          isAdm={isAdm}
          onClose={() => setStatusOpen(false)}
          onDone={invalidate}
        />
      )}
      {cloneOpen && <CloneDialog id={id} onClose={() => setCloneOpen(false)} />}
      {transferOpen && (
        <TransferDialog id={id} onClose={() => setTransferOpen(false)} onDone={invalidate} />
      )}
    </>
  )
}

function Overview({ row }: { row: NonNullable<ReturnType<typeof useEquipment>['data']> }) {
  const warrantyLeft = row.warrantyUntil && new Date(row.warrantyUntil) >= new Date()
  const fields: [string, string][] = [
    ['Model', row.model ?? '—'],
    ['Serial', row.serial ?? '—'],
    ['Hãng', row.manufacturer?.name ?? '—'],
    ['Nhà CC', row.supplier?.name ?? '—'],
    ['Nhóm', row.group?.name ?? '—'],
    ['Xuất xứ', row.countryOfOrigin ?? '—'],
    ['Năm SX', row.manufactureYear ? String(row.manufactureYear) : '—'],
    ['Nguyên giá', formatVnd(row.originalValue) || '—'],
    [
      'Bảo hành',
      row.warrantyUntil
        ? `${formatDate(row.warrantyUntil)} · ${warrantyLeft ? 'Còn hạn' : 'Hết hạn'}`
        : '—',
    ],
    ['Điện áp', row.specs?.voltage ?? '—'],
    ['Công suất', row.specs?.power ?? '—'],
    ['Kích thước', row.specs?.dimensions ?? '—'],
    ['Khối lượng', row.specs?.weight ?? '—'],
  ]
  return (
    <dl className="grid gap-3 sm:grid-cols-2 text-sm">
      {fields.map(([k, v]) => (
        <div key={k}>
          <dt className="text-muted-foreground text-xs">{k}</dt>
          <dd
            className={
              k === 'Bảo hành' && row.warrantyUntil && !warrantyLeft
                ? 'text-destructive'
                : undefined
            }
          >
            {v}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function NetworkTab({ id, canWrite }: { id: string; canWrite: boolean }) {
  const detail = useEquipment(id)
  const form = useForm({
    defaultValues: {
      ip: '',
      mac: '',
      port: '' as number | '',
      protocol: '' as '' | 'HL7' | 'ASTM' | 'other',
      lisConnected: false,
      hostPcName: '',
      connectionTypeId: '',
      diagramFileId: null as string | null,
    },
  })
  useEffect(() => {
    const n = detail.data?.network
    if (!n) return
    form.reset({
      ip: n.ip ?? '',
      mac: n.mac ?? '',
      port: n.port ?? '',
      protocol:
        n.protocol === 'HL7' || n.protocol === 'ASTM' || n.protocol === 'other' ? n.protocol : '',
      lisConnected: n.lisConnected,
      hostPcName: n.hostPcName ?? '',
      connectionTypeId: '',
      diagramFileId: n.diagramFileId,
    })
  }, [detail.data, form])
  const save = useMutation({
    mutationFn: () => {
      const v = form.getValues()
      return api.putNetwork(id, {
        ip: v.ip || null,
        mac: v.mac || null,
        port: v.port === '' ? null : v.port,
        protocol: v.protocol || undefined,
        lisConnected: v.lisConnected,
        hostPcName: v.hostPcName || null,
        diagramFileId: v.diagramFileId,
      })
    },
    onSuccess: () => toast.success('Đã lưu kết nối'),
    onError: (e) => toast.error(messageFor(e)),
  })
  return (
    <Form {...form}>
      <form
        className="grid max-w-xl gap-4 sm:grid-cols-2"
        onSubmit={form.handleSubmit(() => save.mutate())}
      >
        <TextField control={form.control} name="ip" label="IP" disabled={!canWrite} />
        <TextField control={form.control} name="mac" label="MAC" disabled={!canWrite} />
        <NumberField control={form.control} name="port" label="Cổng" disabled={!canWrite} />
        <SelectField
          control={form.control}
          name="protocol"
          label="Protocol"
          disabled={!canWrite}
          emptyLabel="—"
          options={[
            { value: 'HL7', label: 'HL7' },
            { value: 'ASTM', label: 'ASTM' },
            { value: 'other', label: 'Khác' },
          ]}
        />
        <SwitchField
          control={form.control}
          name="lisConnected"
          label="Kết nối LIS"
          disabled={!canWrite}
        />
        <TextField
          control={form.control}
          name="hostPcName"
          label="Máy điều khiển"
          disabled={!canWrite}
        />
        <FormField
          control={form.control}
          name="diagramFileId"
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FileField
                label="Sơ đồ"
                value={field.value}
                onChange={field.onChange}
                disabled={!canWrite}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        {canWrite && (
          <Button type="submit" disabled={save.isPending}>
            Lưu mạng
          </Button>
        )}
      </form>
    </Form>
  )
}

function AccessoriesTab({ id, canWrite }: { id: string; canWrite: boolean }) {
  const list = useQuery({
    queryKey: ['equipment', id, 'accessories'],
    queryFn: () => api.listAccessories(id),
  })
  const [open, setOpen] = useState(false)
  const form = useForm<AccessoryForm>({
    resolver: zodResolver(accessorySchema),
    defaultValues: {
      code: '',
      name: '',
      type: 'other',
      quantity: 1,
      condition: 'good',
      replacedAt: '',
      notes: '',
    },
  })
  const qc = useQueryClient()
  const save = useMutation({
    mutationFn: (v: AccessoryForm) =>
      api.createAccessory(id, {
        code: v.code || null,
        name: v.name,
        type: v.type,
        quantity: v.quantity === '' ? 1 : v.quantity,
        condition: v.condition,
        replacedAt: v.replacedAt || null,
        notes: v.notes || null,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['equipment', id, 'accessories'] })
      setOpen(false)
      toast.success('Đã lưu phụ kiện')
    },
    onError: (e) => {
      if (!applyServerErrors(form, e)) toast.error(messageFor(e))
    },
  })
  if (list.isPending) return <p role="status">Đang tải phụ kiện…</p>
  if (list.error) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />
  return (
    <div>
      {canWrite && (
        <Button className="mb-3" onClick={() => setOpen(true)}>
          Thêm phụ kiện
        </Button>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>Mã</th>
            <th>Tên</th>
            <th>Loại</th>
            <th>SL</th>
            <th>Tình trạng</th>
          </tr>
        </thead>
        <tbody>
          {list.data.map((row) => (
            <tr key={row.id} className="border-t">
              <td>{row.code}</td>
              <td>{row.name}</td>
              <td>{row.type}</td>
              <td>{row.quantity}</td>
              <td>
                <StatusBadge value={row.condition} map={accessoryConditionMap} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Phụ kiện"
        form={form}
        onSubmit={(v) => save.mutateAsync(v)}
      >
        <TextField control={form.control} name="code" label="Mã" />
        <TextField control={form.control} name="name" label="Tên" />
        <SelectField
          control={form.control}
          name="type"
          label="Loại"
          options={[
            { value: 'power_cable', label: 'Cáp nguồn' },
            { value: 'data_cable', label: 'Cáp dữ liệu' },
            { value: 'tube', label: 'Ống' },
            { value: 'probe', label: 'Probe' },
            { value: 'ups', label: 'UPS' },
            { value: 'other', label: 'Khác' },
          ]}
        />
        <NumberField control={form.control} name="quantity" label="Số lượng" min={1} />
        <SelectField
          control={form.control}
          name="condition"
          label="Tình trạng"
          options={[
            { value: 'good', label: 'Tốt' },
            { value: 'worn', label: 'Mòn' },
            { value: 'broken', label: 'Hỏng' },
          ]}
        />
      </FormDialog>
    </div>
  )
}

function SoftwareTab({ id, canWrite }: { id: string; canWrite: boolean }) {
  const list = useQuery({
    queryKey: ['equipment', id, 'software'],
    queryFn: () => api.listSoftware(id),
  })
  const [open, setOpen] = useState(false)
  const [key, setKey] = useState<string | null>(null)
  const form = useForm<SoftwareForm>({
    resolver: zodResolver(softwareSchema),
    defaultValues: {
      name: '',
      version: '',
      updatedOn: '',
      licenseExpiresAt: '',
      licenseKey: '',
      notes: '',
    },
  })
  const qc = useQueryClient()
  const save = useMutation({
    mutationFn: (v: SoftwareForm) =>
      api.createSoftware(id, {
        name: v.name,
        version: v.version || null,
        updatedOn: v.updatedOn || null,
        licenseExpiresAt: v.licenseExpiresAt || null,
        licenseKey: v.licenseKey || null,
        notes: v.notes || null,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['equipment', id, 'software'] })
      setOpen(false)
      toast.success('Đã lưu phần mềm')
    },
    onError: (e) => {
      if (!applyServerErrors(form, e)) toast.error(messageFor(e))
    },
  })
  useEffect(() => {
    if (!key) return
    const t = setTimeout(() => setKey(null), 10000)
    return () => clearTimeout(t)
  }, [key])
  if (list.isPending) return <p role="status">Đang tải phần mềm…</p>
  if (list.error) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />
  return (
    <div>
      {canWrite && (
        <Button className="mb-3" onClick={() => setOpen(true)}>
          Thêm phần mềm
        </Button>
      )}
      {key && (
        <p className="bg-muted mb-2 rounded p-2 font-mono text-sm">
          {key}{' '}
          <Button size="sm" onClick={() => void navigator.clipboard.writeText(key)}>
            Sao chép
          </Button>
        </p>
      )}
      <ul className="space-y-2 text-sm">
        {list.data.map((row) => (
          <li key={row.id} className="rounded border p-2">
            <div className="font-medium">
              {row.name} {row.version}
            </div>
            <div
              className={
                row.licenseExpiresAt && new Date(row.licenseExpiresAt) < new Date()
                  ? 'text-destructive'
                  : undefined
              }
            >
              Bản quyền đến {formatDate(row.licenseExpiresAt) || '—'}
            </div>
            {canWrite && row.hasLicenseKey && (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    const result = await api.softwareLicense(id, row.id)
                    setKey(result.licenseKey)
                  } catch (e) {
                    toast.error(messageFor(e))
                  }
                }}
              >
                Xem key
              </Button>
            )}
          </li>
        ))}
      </ul>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Phần mềm"
        form={form}
        onSubmit={(v) => save.mutateAsync(v)}
      >
        <TextField control={form.control} name="name" label="Tên" />
        <TextField control={form.control} name="version" label="Phiên bản" />
        <DateField control={form.control} name="licenseExpiresAt" label="Hết hạn license" />
        <TextField control={form.control} name="licenseKey" label="Key" />
      </FormDialog>
    </div>
  )
}

function ComponentsTab({
  id,
  canWrite,
  hours,
  tests,
}: {
  id: string
  canWrite: boolean
  hours: string
  tests: number
}) {
  const list = useQuery({
    queryKey: ['equipment', id, 'components'],
    queryFn: () => api.listComponents(id),
  })
  const [open, setOpen] = useState(false)
  const [replaceId, setReplaceId] = useState<string | null>(null)
  const form = useForm<ComponentForm>({
    resolver: zodResolver(componentSchema),
    defaultValues: {
      name: '',
      componentTypeId: null,
      partNo: '',
      serial: '',
      installedAt: '',
      lifespanHours: '',
      lifespanTests: '',
      lifespanMonths: '',
      notes: '',
    },
  })
  const qc = useQueryClient()
  const save = useMutation({
    mutationFn: (v: ComponentForm) =>
      api.createComponent(id, {
        name: v.name,
        componentTypeId: v.componentTypeId,
        partNo: v.partNo || null,
        serial: v.serial || null,
        installedAt: v.installedAt || null,
        lifespanHours: v.lifespanHours === '' ? null : v.lifespanHours,
        lifespanTests: v.lifespanTests === '' ? null : v.lifespanTests,
        lifespanMonths: v.lifespanMonths === '' ? null : v.lifespanMonths,
        notes: v.notes || null,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['equipment', id, 'components'] })
      setOpen(false)
      toast.success('Đã lưu linh kiện')
    },
    onError: (e) => {
      if (!applyServerErrors(form, e)) toast.error(messageFor(e))
    },
  })
  if (list.isPending) return <p role="status">Đang tải linh kiện…</p>
  if (list.error) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />
  return (
    <div>
      {canWrite && (
        <Button className="mb-3" onClick={() => setOpen(true)}>
          Thêm linh kiện
        </Button>
      )}
      <ul className="space-y-3">
        {list.data.map((row) => {
          const pct = api.usedPct(row, { currentRunHours: hours, currentTestCount: tests })
          const bar = Math.min(100, Math.round(pct * 100))
          const color = bar >= 100 ? 'bg-destructive' : bar >= 80 ? 'bg-warning' : 'bg-success'
          return (
            <li key={row.id} className="rounded border p-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">{row.name}</span>
                <StatusBadge value={row.status} map={componentStatusMap} />
              </div>
              <div className="bg-muted mt-2 h-2 rounded">
                <div
                  data-testid={`usedpct-${row.id}`}
                  className={`h-2 rounded ${color}`}
                  style={{ width: `${bar}%` }}
                />
              </div>
              <p className="text-muted-foreground mt-1 text-xs">{bar}% đã dùng</p>
              {canWrite && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2"
                  onClick={() => setReplaceId(row.id)}
                >
                  Thay thế
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Linh kiện"
        form={form}
        onSubmit={(v) => save.mutateAsync(v)}
      >
        <TextField control={form.control} name="name" label="Tên" />
        <TextField control={form.control} name="serial" label="Serial" />
        <NumberField control={form.control} name="lifespanHours" label="Tuổi thọ giờ" min={0} />
        <NumberField control={form.control} name="lifespanTests" label="Tuổi thọ test" min={0} />
        <NumberField control={form.control} name="lifespanMonths" label="Tuổi thọ tháng" min={0} />
      </FormDialog>
      {replaceId && (
        <ReplaceDialog
          id={id}
          cid={replaceId}
          onClose={() => setReplaceId(null)}
          onDone={() => void qc.invalidateQueries({ queryKey: ['equipment', id, 'components'] })}
        />
      )}
    </div>
  )
}

function ReplaceDialog({
  id,
  cid,
  onClose,
  onDone,
}: {
  id: string
  cid: string
  onClose: () => void
  onDone: () => void
}) {
  const form = useForm({ defaultValues: { reason: '' } })
  return (
    <FormDialog
      open
      onOpenChange={(v) => !v && onClose()}
      title="Thay linh kiện"
      form={form}
      onSubmit={async (values) => {
        if (!values.reason.trim()) return
        try {
          await api.replaceComponent(id, cid, { reason: values.reason })
          toast.success('Đã thay linh kiện')
          onDone()
          onClose()
        } catch (e) {
          toast.error(messageFor(e))
        }
      }}
    >
      <TextField control={form.control} name="reason" label="Lý do" />
    </FormDialog>
  )
}

function SuppliesTab({ id, canWrite }: { id: string; canWrite: boolean }) {
  const list = useQuery({
    queryKey: ['equipment', id, 'supplies'],
    queryFn: () => api.listEquipmentSupplies(id),
  })
  const runway = useQuery({
    queryKey: ['equipment', id, 'runway'],
    queryFn: () => api.equipmentRunway(id),
  })
  const [rows, setRows] = useState(list.data ?? [])
  useEffect(() => {
    if (list.data) setRows(list.data)
  }, [list.data])
  const save = useMutation({
    mutationFn: () =>
      api.putEquipmentSupplies(
        id,
        rows.map((row) => ({
          supplyId: row.supplyId,
          normQtyPerDay: row.normQtyPerDay,
          normQtyPerTest: row.normQtyPerTest,
          notes: row.notes,
          isPrimary: row.isPrimary,
        })),
      ),
    onSuccess: () => toast.success('Đã lưu vật tư'),
    onError: (e) => toast.error(messageFor(e)),
  })
  if (list.isPending) return <p role="status">Đang tải vật tư…</p>
  if (list.error) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />
  return (
    <div className="space-y-3">
      {canWrite && (
        <div className="max-w-sm">
          <AsyncSelect
            label="Thêm vật tư"
            queryKey="supplies"
            loadOptions={api.supplyOptions}
            value={null}
            onChange={(value) => {
              if (typeof value === 'string' && !rows.some((r) => r.supplyId === value))
                setRows([
                  ...rows,
                  {
                    supplyId: value,
                    normQtyPerDay: null,
                    normQtyPerTest: null,
                    isPrimary: false,
                    notes: null,
                  },
                ])
            }}
          />
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>Vật tư</th>
            <th>Định mức/ngày</th>
            <th>Định mức/test</th>
            <th>Còn chạy được</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const run = runway.data?.items.find((item) => item.supplyId === row.supplyId)
            const days = run?.daysLeft
            const tone =
              days == null ? '' : days < 7 ? 'text-destructive' : days < 30 ? 'text-warning' : ''
            return (
              <tr key={row.supplyId} className="border-t">
                <td className="font-mono text-xs">{row.supplyId}</td>
                <td>
                  <Input
                    disabled={!canWrite}
                    value={row.normQtyPerDay ?? ''}
                    onChange={(e) => {
                      const next = [...rows]
                      next[index] = { ...row, normQtyPerDay: e.target.value || null }
                      setRows(next)
                    }}
                  />
                </td>
                <td>
                  <Input
                    disabled={!canWrite}
                    value={row.normQtyPerTest ?? ''}
                    onChange={(e) => {
                      const next = [...rows]
                      next[index] = { ...row, normQtyPerTest: e.target.value || null }
                      setRows(next)
                    }}
                  />
                </td>
                <td className={tone}>{days == null ? '—' : `${days} ngày`}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {canWrite && <Button onClick={() => save.mutate()}>Lưu vật tư</Button>}
    </div>
  )
}

function CountersTab({ id, canWrite }: { id: string; canWrite: boolean }) {
  const list = useQuery({
    queryKey: ['equipment', id, 'counters'],
    queryFn: () => api.listCounters(id),
  })
  const [open, setOpen] = useState(false)
  const [hours, setHours] = useState('')
  const [tests, setTests] = useState('')
  const qc = useQueryClient()
  if (list.isPending) return <p role="status">Đang tải bộ đếm…</p>
  if (list.error) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />
  const points = list.data.items
  const maxH = Math.max(...points.map((p) => Number(p.runHours ?? 0)), 1)
  return (
    <div>
      {canWrite && (
        <Button className="mb-3" onClick={() => setOpen(true)}>
          Ghi bộ đếm
        </Button>
      )}
      <svg
        viewBox="0 0 320 80"
        className="mb-3 w-full max-w-lg"
        role="img"
        aria-label="Biểu đồ giờ chạy"
      >
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          points={points
            .map(
              (p, i) =>
                `${(i / Math.max(points.length - 1, 1)) * 320},${80 - (Number(p.runHours ?? 0) / maxH) * 70}`,
            )
            .join(' ')}
        />
      </svg>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>Thời điểm</th>
            <th>Giờ chạy</th>
            <th>Số test</th>
            <th>Nguồn</th>
          </tr>
        </thead>
        <tbody>
          {points.map((row) => (
            <tr key={row.id} className="border-t">
              <td>{formatDateTime(row.recordedAt)}</td>
              <td>{row.runHours ?? '—'}</td>
              <td>{row.testCount ?? '—'}</td>
              <td>{row.source}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {open && (
        <div className="bg-card mt-3 max-w-sm space-y-2 rounded border p-3">
          <Input
            aria-label="Giờ chạy"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="Giờ chạy"
          />
          <Input
            aria-label="Số test"
            value={tests}
            onChange={(e) => setTests(e.target.value)}
            placeholder="Số test"
          />
          <Button
            onClick={async () => {
              try {
                await api.recordCounter(id, {
                  runHours: hours || undefined,
                  testCount: tests ? Number(tests) : undefined,
                  source: 'manual',
                })
                toast.success('Đã ghi bộ đếm')
                void qc.invalidateQueries({ queryKey: ['equipment'] })
                setOpen(false)
              } catch (e) {
                toast.error(messageFor(e))
              }
            }}
          >
            Lưu
          </Button>
        </div>
      )}
    </div>
  )
}

function RepairsTab({ id }: { id: string }) {
  const list = useQuery({
    queryKey: ['equipment', id, 'repairs'],
    queryFn: () => api.listRepairsForEquipment(id),
  })
  if (list.isPending) return <p role="status">Đang tải sửa chữa…</p>
  if (list.error) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />
  return (
    <ul className="space-y-2 text-sm">
      {list.data.items.map((row) => (
        <li key={row.id}>
          <Link className="text-primary hover:underline" to={`/repairs/${row.id}`}>
            {row.code}
          </Link>{' '}
          {formatDate(row.createdAt)} · {row.status} · {row.assignee?.fullName ?? '—'}
        </li>
      ))}
      {list.data.items.length === 0 && (
        <li className="text-muted-foreground">Chưa có phiếu sửa chữa</li>
      )}
    </ul>
  )
}

function MaintenanceTab({ id }: { id: string }) {
  const tasks = useQuery({
    queryKey: ['equipment', id, 'maintenance'],
    queryFn: () => api.listMaintenanceForEquipment(id),
  })
  const cals = useQuery({
    queryKey: ['equipment', id, 'calibrations'],
    queryFn: () => api.listCalibrationHistory(id),
  })
  if (tasks.isPending || cals.isPending) return <p role="status">Đang tải bảo dưỡng…</p>
  return (
    <div className="grid gap-4 sm:grid-cols-2 text-sm">
      <div>
        <h3 className="mb-2 font-medium">Bảo dưỡng</h3>
        <ul>
          {(tasks.data?.items ?? []).map((row) => (
            <li key={row.id}>
              <Link className="text-primary hover:underline" to={`/maintenance/tasks/${row.id}`}>
                {row.code}
              </Link>{' '}
              {row.status}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 font-medium">Kiểm định</h3>
        <ul>
          {(cals.data ?? []).map((row) => (
            <li key={row.id}>
              {row.code} · {row.status}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function TransfersTab({
  id,
  canWrite,
  isAdm,
  userId,
  onCreate,
}: {
  id: string
  canWrite: boolean
  isAdm: boolean
  userId?: string
  onCreate: () => void
}) {
  const list = useQuery({
    queryKey: ['equipment', id, 'transfers'],
    queryFn: () => api.listTransfers(id),
  })
  const qc = useQueryClient()
  const { confirm, dialog } = useConfirm()
  if (list.isPending) return <p role="status">Đang tải điều chuyển…</p>
  if (list.error) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />
  const items = list.data.items
  return (
    <div>
      {dialog}
      {canWrite && (
        <Button className="mb-3" onClick={onCreate}>
          Tạo điều chuyển
        </Button>
      )}
      <ul className="space-y-2 text-sm">
        {items.map((row) => (
          <li key={row.id} className="rounded border p-2">
            <StatusBadge value={row.status} map={transferStatusMap} /> {row.reason}
            <div className="mt-2 flex gap-2">
              {isAdm && row.status === 'pending' && (
                <>
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        await api.approveTransfer(id, row.id)
                        toast.success('Đã duyệt')
                        void qc.invalidateQueries({ queryKey: ['equipment'] })
                      } catch (e) {
                        toast.error(messageFor(e))
                      }
                    }}
                  >
                    Duyệt
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const reason = await confirm({
                        title: 'Từ chối điều chuyển?',
                        requireReason: true,
                      })
                      if (reason === false) return
                      try {
                        await api.rejectTransfer(id, row.id, reason)
                        toast.success('Đã từ chối')
                        void qc.invalidateQueries({ queryKey: ['equipment'] })
                      } catch (e) {
                        toast.error(messageFor(e))
                      }
                    }}
                  >
                    Từ chối
                  </Button>
                </>
              )}
              {canWrite && row.status === 'pending' && row.requestedBy === userId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await api.cancelTransfer(id, row.id)
                      toast.success('Đã huỷ')
                      void qc.invalidateQueries({ queryKey: ['equipment'] })
                    } catch (e) {
                      toast.error(messageFor(e))
                    }
                  }}
                >
                  Huỷ
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TimelineTab({ id }: { id: string }) {
  const [type, setType] = useState('')
  const [note, setNote] = useState('')
  const events = useQuery({
    queryKey: ['equipment', id, 'events', type],
    queryFn: () => api.listEvents(id, { type: type || undefined, page: 1, limit: 50 }),
  })
  const history = useQuery({
    queryKey: ['equipment', id, 'status-history'],
    queryFn: () => api.statusHistory(id),
  })
  const qc = useQueryClient()
  const items = [
    ...(events.data?.items ?? []).map((e) => ({
      at: e.at,
      title: e.title,
      summary: e.summary,
      by: e.byUserId,
    })),
    ...(history.data?.items ?? []).map((h) => ({
      at: h.at,
      title: `${h.fromStatus} → ${h.toStatus}`,
      summary: h.reason,
      by: h.byUserId,
    })),
  ]
  return (
    <div className="space-y-3">
      <Input
        aria-label="Lọc loại sự kiện"
        placeholder="Loại sự kiện"
        value={type}
        onChange={(e) => setType(e.target.value)}
      />
      <div className="flex gap-2">
        <Input
          aria-label="Ghi chú"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Thêm ghi chú"
        />
        <Button
          onClick={async () => {
            if (!note.trim()) return
            try {
              await api.addNote(id, note)
              setNote('')
              void qc.invalidateQueries({ queryKey: ['equipment', id, 'events'] })
              toast.success('Đã ghi chú')
            } catch (e) {
              toast.error(messageFor(e))
            }
          }}
        >
          Thêm ghi chú
        </Button>
      </div>
      {events.isPending ? <p role="status">Đang tải timeline…</p> : <Timeline events={items} />}
    </div>
  )
}

function StatusDialog({
  id,
  from,
  isAdm,
  onClose,
  onDone,
}: {
  id: string
  from: EquipmentStatus
  isAdm: boolean
  onClose: () => void
  onDone: () => void
}) {
  const allowed = STATUS_TRANSITIONS[from].filter(
    (s) => isAdm || (s !== 'retired' && s !== 'disposed'),
  )
  const [status, setStatus] = useState(allowed[0] ?? from)
  const [reason, setReason] = useState('')
  const [hint, setHint] = useState<string[]>([])
  return (
    <div className="bg-background fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        className="bg-card w-full max-w-md space-y-3 rounded-lg border p-4"
        onSubmit={async (e) => {
          e.preventDefault()
          try {
            await api.changeEquipmentStatus(id, { status, reason })
            toast.success('Đã đổi trạng thái')
            onDone()
            onClose()
          } catch (error) {
            if (
              isApiError(error) &&
              error.code === 'EQUIPMENT_INVALID_STATUS_TRANSITION' &&
              error.details &&
              typeof error.details === 'object' &&
              'allowed' in error.details
            ) {
              const allowedNext = (error.details as { allowed?: string[] }).allowed ?? []
              setHint(allowedNext)
            }
            toast.error(messageFor(error))
          }
        }}
      >
        <h2 className="font-medium">Đổi trạng thái</h2>
        <label className="block text-sm">
          Trạng thái mới
          <select
            className="border-input mt-1 h-9 w-full rounded-md border px-2"
            value={status}
            onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
          >
            {allowed.map((s) => (
              <option key={s} value={s}>
                {equipmentStatusMap[s]?.label ?? s}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          Lý do
          <Input required value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
        {hint.length > 0 && (
          <p className="text-sm">
            Trạng thái hợp lệ: {hint.map((s) => equipmentStatusMap[s]?.label ?? s).join(', ')}
          </p>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit">Lưu</Button>
        </div>
      </form>
    </div>
  )
}

function CloneDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [serial, setSerial] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        className="bg-card w-full max-w-md space-y-3 rounded-lg border p-4"
        onSubmit={async (e) => {
          e.preventDefault()
          try {
            const created = await api.cloneEquipment(id, {
              code: code || undefined,
              name: name || undefined,
              serial: serial || undefined,
            })
            toast.success('Đã nhân bản')
            onClose()
            navigate(`/equipment/${created.id}`)
          } catch (error) {
            toast.error(messageFor(error))
          }
        }}
      >
        <h2 className="font-medium">Nhân bản máy</h2>
        <Input
          aria-label="Mã mới"
          placeholder="Mã (trống = tự sinh)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <Input
          aria-label="Tên mới"
          placeholder="Tên"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          aria-label="Serial mới"
          placeholder="Serial"
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit">Nhân bản</Button>
        </div>
      </form>
    </div>
  )
}

function TransferDialog({
  id,
  onClose,
  onDone,
}: {
  id: string
  onClose: () => void
  onDone: () => void
}) {
  const [toDepartmentId, setToDepartmentId] = useState<string | null>(null)
  const [toLocation, setToLocation] = useState('')
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form
        className="bg-card w-full max-w-md space-y-3 rounded-lg border p-4"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!toDepartmentId) return
          try {
            await api.createTransfer(id, { toDepartmentId, toLocation: toLocation || null, reason })
            toast.success('Đã tạo điều chuyển')
            onDone()
            onClose()
          } catch (error) {
            toast.error(messageFor(error))
          }
        }}
      >
        <h2 className="font-medium">Điều chuyển</h2>
        <AsyncSelect
          label="Khoa đến"
          queryKey="departments"
          loadOptions={departmentOptions}
          value={toDepartmentId}
          onChange={(v) => setToDepartmentId(typeof v === 'string' ? v : null)}
        />
        <Input
          placeholder="Vị trí đến"
          value={toLocation}
          onChange={(e) => setToLocation(e.target.value)}
        />
        <Input
          required
          placeholder="Lý do"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit">Tạo</Button>
        </div>
      </form>
    </div>
  )
}
