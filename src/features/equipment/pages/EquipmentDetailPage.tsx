import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { DetailLayout } from '@/components/detail-layout'
import { PageMeta } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { DataList, type DataListItem } from '@/components/page/DataList'
import { CardSkeleton, DetailSkeleton } from '@/components/page/DetailSkeleton'
import { EmptyState } from '@/components/page/EmptyState'
import { ActionMenu } from '@/components/page/ActionMenu'
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
  ArrowRightLeft,
  Building2,
  Copy,
  Cpu,
  FileText,
  Gauge,
  MapPin,
  Package,
  Pencil,
  Printer,
  Puzzle,
  QrCode,
  Sparkles,
  Trash2,
  User,
  Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/status-badge'
import { FormDialog } from '@/components/form/FormDialog'
import { TextField, NumberField, SelectField, SwitchField } from '@/components/form/fields'
import { DateField } from '@/components/form/date-field'
import { DatePicker } from '@/components/date-picker'
import { DatetimeField } from '@/components/form/datetime-field'
import { QtyField } from '@/components/form/qty-field'
import { MoneyField } from '@/components/form/money-field'
import { FileField } from '@/components/form/file-field'
import { AsyncSelect, type ReferenceOption } from '@/components/form/async-select'
import { AsyncSelectField } from '../components/async-select-field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
  taskStatusMap,
  calibrationStatusMap,
  calibrationResultMap,
  repairStatusMap,
} from '@/lib/status-maps'
import { formatDate, formatDateTime } from '@/lib/format/date'
import { formatVnd } from '@/lib/format/money'
import { formatNumber, formatQty } from '@/lib/format/number'
import { dayRangeToIso } from '@/lib/format/date-range'
import { useCan } from '@/app/guards/useCan'
import { ADM, STAFF } from '@/routes/roles'
import { applyServerErrors, isApiError, messageFor } from '@/api/errors'
import { departmentOptions, resolveCatalogItem, resolveDepartment } from '@/api/references'
import { useAuthStore } from '@/stores/auth.store'
import { assistantPath } from '@/lib/ai-link'
import * as api from '../api'
import { equipmentKeys, transferKeys, useEquipment, useInvalidateEquipment } from '../hooks'
import { shortId, useDepartmentNames, useUserNames } from '../components/lookups'
import {
  accessorySchema,
  cloneSchema,
  componentSchema,
  counterSchema,
  replaceComponentSchema,
  softwareSchema,
  softwareUpgradeSchema,
  statusChangeSchema,
  suppliesSchema,
  transferSchema,
  type AccessoryForm,
  type CloneForm,
  type ComponentForm,
  type CounterForm,
  type ReplaceComponentForm,
  type SoftwareForm,
  type SoftwareUpgradeForm,
  type StatusChangeForm,
  type SuppliesForm,
  type TransferForm,
} from '../schema'
import {
  EQUIPMENT_STATUSES,
  STATUS_TRANSITIONS,
  type Accessory,
  type ComponentRow,
  type EquipmentStatus,
  type EquipmentSupplyLink,
  type Software,
} from '../types'

const emptyAccessory: AccessoryForm = {
  code: '',
  name: '',
  type: 'other',
  quantity: 1,
  condition: 'good',
  replacedAt: '',
  notes: '',
}

const emptySoftware: SoftwareForm = {
  name: '',
  version: '',
  updatedOn: '',
  licenseExpiresAt: '',
  licenseKey: '',
  notes: '',
}

const emptyComponent: ComponentForm = {
  name: '',
  componentTypeId: null,
  partNo: '',
  serial: '',
  installedAt: '',
  lifespanHours: '',
  lifespanTests: '',
  lifespanMonths: '',
  notes: '',
}

const emptyReplace: ReplaceComponentForm = {
  reason: '',
  newSerial: '',
  cost: '',
  repairTicketId: null,
  replacedAt: '',
}

function TabSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label}>
      <CardSkeleton table rows={4} />
      <span className="sr-only">{label}</span>
    </div>
  )
}

const optionLabel = (option?: ReferenceOption) => (option ? `${option.code} — ${option.name}` : '—')

export function Component() {
  const { t } = useTranslation('equipment')
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const detail = useEquipment(id)
  const canWrite = useCan(STAFF)
  const isAdm = useCan(ADM)
  const userId = useAuthStore((s) => s.user?.id)
  const { confirm, dialog } = useConfirm()
  const invalidate = useInvalidateEquipment(id)
  const userNames = useUserNames(isAdm)
  const departmentNames = useDepartmentNames()
  const [statusOpen, setStatusOpen] = useState(false)
  const [cloneOpen, setCloneOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  if (detail.isPending) return <DetailSkeleton label={t('loading')} />
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data
  const status = (EQUIPMENT_STATUSES.find((s) => s === row.status) ?? 'active') as EquipmentStatus
  const run = async (title: string, action: () => Promise<unknown>, destructive = false) => {
    if ((await confirm({ title, destructive })) === false) return
    try {
      await action()
      toast.success(t('confirm.done'))
      void invalidate()
    } catch (error) {
      toast.error(messageFor(error))
    }
  }
  const kinds = (
    [
      'photo',
      'manual',
      'catalogue',
      'co_cq',
      'license',
      'calibration_cert',
      'handover',
      'maintenance_contract',
      'diagram',
      'other',
    ] as const
  ).map((value) => ({ value, label: t(`kinds.${value}`) }))
  return (
    <>
      {dialog}
      <DetailLayout
        eyebrow={t('title', { defaultValue: 'Hồ sơ thiết bị' })}
        code={row.code}
        name={row.name}
        meta={
          <>
            <PageMeta icon={<Cpu />}>{row.code}</PageMeta>
            {row.model && <PageMeta icon={<Package />}>{row.model}</PageMeta>}
            {row.department?.name && (
              <PageMeta icon={<Building2 />}>{row.department.name}</PageMeta>
            )}
            {row.location && <PageMeta icon={<MapPin />}>{row.location}</PageMeta>}
            {row.staffInCharge?.fullName && (
              <PageMeta icon={<User />}>{row.staffInCharge.fullName}</PageMeta>
            )}
          </>
        }
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
          <ActionMenu
            items={[
              canWrite && {
                key: 'status',
                label: t('actions.changeStatus'),
                variant: 'primary',
                disabled: status === 'disposed',
                onClick: () => setStatusOpen(true),
              },
              canWrite && {
                key: 'edit',
                label: t('common:actions.edit'),
                to: `/equipment/${id}/edit`,
                icon: <Pencil />,
              },
              canWrite && {
                key: 'transfer',
                label: t('actions.transfer'),
                icon: <ArrowRightLeft />,
                onClick: () => setTransferOpen(true),
              },
              canWrite && {
                key: 'clone',
                label: t('actions.clone'),
                icon: <Copy />,
                onClick: () => setCloneOpen(true),
              },
              {
                key: 'ai',
                label: t('actions.askAi'),
                icon: <Sparkles />,
                to: assistantPath({ equipmentId: id }),
              },
              {
                key: 'print',
                label: t('actions.print'),
                icon: <Printer />,
                onClick: () => {
                  void (async () => {
                    try {
                      await api.downloadQrPng(id)
                      await api.downloadQrLabels([id])
                    } catch (error) {
                      toast.error(messageFor(error))
                    }
                  })()
                },
              },
              isAdm && {
                key: 'rotate',
                label: t('actions.rotateQr'),
                icon: <QrCode />,
                onClick: () => void run(t('confirm.rotate'), () => api.rotateQr(id)),
              },
              isAdm &&
                (status === 'retired' || status === 'disposed') && {
                  key: 'delete',
                  label: t('common:actions.delete'),
                  variant: 'destructive' as const,
                  icon: <Trash2 />,
                  separator: true,
                  onClick: () =>
                    void run(
                      t('confirm.delete'),
                      async () => {
                        await api.deleteEquipment(id)
                        navigate('/equipment')
                      },
                      true,
                    ),
                },
            ]}
          />
        }
        information={
          <>
            <h2 className="mb-3 text-[15px] leading-6 font-semibold">
              {t('info.title', { defaultValue: 'Thông tin nhanh' })}
            </h2>
            <DataList
              columns={1}
              items={[
                { label: t('fields.department'), value: row.department?.name },
                { label: t('fields.location'), value: row.location },
                { label: t('fields.serial'), value: row.serial },
                { label: t('fields.manufacturer'), value: row.manufacturer?.name },
                {
                  label: t('fields.nextMaintenanceAt'),
                  value: formatDate(row.nextMaintenanceAt) || null,
                },
                {
                  label: t('fields.nextCalibrationAt'),
                  value: formatDate(row.nextCalibrationAt) || null,
                },
              ]}
            />
            <div className="border-divider mt-4 grid grid-cols-3 gap-2 border-t pt-4">
              {[
                { label: t('info.accessories'), value: row.counts.accessories, icon: Puzzle },
                {
                  label: t('info.componentsDue'),
                  value: row.counts.componentsDue,
                  icon: Gauge,
                  warn: row.counts.componentsDue > 0,
                },
                {
                  label: t('info.openRepairs'),
                  value: row.counts.openRepairs,
                  icon: Wrench,
                  warn: row.counts.openRepairs > 0,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className={cn(
                    'bg-surface-2 rounded-lg px-2 py-2 text-center',
                    stat.warn && 'bg-warning-bg',
                  )}
                >
                  <stat.icon
                    className={cn(
                      'text-muted-foreground mx-auto size-4',
                      stat.warn && 'text-warning-fg',
                    )}
                    aria-hidden
                  />
                  <p
                    className={cn(
                      'mt-1 text-[18px] leading-6 font-bold tabular-nums',
                      stat.warn && 'text-warning-fg',
                    )}
                  >
                    {stat.value}
                  </p>
                  <p className="text-muted-foreground text-[11px] leading-4">{stat.label}</p>
                </div>
              ))}
            </div>
          </>
        }
        aliases={{
          counters: 'overview',
          network: 'config',
          accessories: 'config',
          software: 'config',
          components: 'config',
          repairs: 'service',
          maintenance: 'service',
          transfers: 'history',
          timeline: 'history',
          audit: 'history',
        }}
        tabs={[
          {
            value: 'overview',
            label: t('tabs.overview'),
            content: (
              <>
                <Overview row={row} />
                <div data-testid="section-counters">
                  <CountersTab id={id} canWrite={canWrite} />
                </div>
              </>
            ),
          },
          {
            value: 'config',
            label: t('tabs.config', { defaultValue: 'Cấu hình' }),
            content: (
              <>
                <div data-testid="section-network">
                  <NetworkTab id={id} canWrite={canWrite} />
                </div>
                <div data-testid="section-accessories">
                  <AccessoriesTab id={id} canWrite={canWrite} />
                </div>
                <div data-testid="section-software">
                  <SoftwareTab id={id} canWrite={canWrite} />
                </div>
                <div data-testid="section-components">
                  <ComponentsTab
                    id={id}
                    canWrite={canWrite}
                    hours={row.currentRunHours}
                    tests={row.currentTestCount}
                  />
                </div>
              </>
            ),
          },
          {
            value: 'supplies',
            label: t('tabs.supplies'),
            content: <SuppliesTab id={id} canWrite={canWrite} />,
          },
          {
            value: 'service',
            label: t('tabs.service', { defaultValue: 'Sửa chữa & bảo dưỡng' }),
            content: (
              <>
                <RepairsTab id={id} />
                <MaintenanceTab id={id} />
              </>
            ),
          },
          {
            value: 'docs',
            label: t('tabs.docs'),
            content: (
              <SectionCard title={t('tabs.docs')}>
                <AttachmentsPanel entityType="equipment" entityId={id} kinds={kinds} />
              </SectionCard>
            ),
          },
          {
            value: 'history',
            label: t('tabs.history', { defaultValue: 'Lịch sử' }),
            content: (
              <>
                <div data-testid="section-transfers">
                  <TransfersTab
                    id={id}
                    canWrite={canWrite}
                    isAdm={isAdm}
                    userId={userId}
                    userNames={userNames}
                    departmentNames={departmentNames}
                    onCreate={() => setTransferOpen(true)}
                  />
                </div>
                <div data-testid="section-timeline">
                  <TimelineTab id={id} userNames={userNames} />
                </div>
                <SectionCard title={t('tabs.audit')}>
                  <AuditTrail entityType="equipment" entityId={id} />
                </SectionCard>
              </>
            ),
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
      {cloneOpen && <CloneDialog id={id} onClose={() => setCloneOpen(false)} onDone={invalidate} />}
      {transferOpen && (
        <TransferDialog id={id} onClose={() => setTransferOpen(false)} onDone={invalidate} />
      )}
    </>
  )
}

function Overview({ row }: { row: NonNullable<ReturnType<typeof useEquipment>['data']> }) {
  const { t } = useTranslation('equipment')
  const warrantyLeft = row.warrantyUntil && new Date(row.warrantyUntil) >= new Date()
  const general: DataListItem[] = [
    { label: t('fields.assetCode'), value: row.assetCode },
    { label: t('fields.model'), value: row.model },
    { label: t('fields.serial'), value: row.serial },
    { label: t('fields.manufacturer'), value: row.manufacturer?.name },
    { label: t('fields.group'), value: row.group?.name },
    { label: t('fields.countryOfOrigin'), value: row.countryOfOrigin },
    {
      label: t('fields.manufactureYearShort'),
      value: row.manufactureYear ? String(row.manufactureYear) : null,
    },
    { label: t('fields.testTypes'), value: row.testTypes.length ? row.testTypes.join(', ') : null },
  ]
  const purchase: DataListItem[] = [
    { label: t('fields.supplierShort'), value: row.supplier?.name },
    { label: t('fields.fundingSource'), value: row.fundingSource?.name },
    { label: t('fields.originalValue'), value: formatVnd(row.originalValue) || null },
    { label: t('fields.receivedAt'), value: formatDate(row.receivedAt) || null },
    { label: t('fields.commissionedAt'), value: formatDate(row.commissionedAt) || null },
    {
      label: t('fields.warranty'),
      value: row.warrantyUntil ? (
        <span className={warrantyLeft ? undefined : 'text-destructive'}>
          {formatDate(row.warrantyUntil)} ·{' '}
          {warrantyLeft ? t('fields.inWarranty') : t('fields.outWarranty')}
        </span>
      ) : null,
    },
    { label: t('fields.purchaseContractNo'), value: row.purchaseContractNo },
    { label: t('fields.decisionNo'), value: row.decisionNo },
  ]
  const operation: DataListItem[] = [
    { label: t('fields.department'), value: row.department?.name },
    { label: t('fields.location'), value: row.location },
    { label: t('fields.deptContact'), value: row.deptContact?.fullName },
    { label: t('fields.staffInCharge'), value: row.staffInCharge?.fullName },
    {
      label: t('fields.throughputPerHour'),
      value: row.throughputPerHour == null ? null : formatNumber(row.throughputPerHour),
    },
    { label: t('fields.currentRunHours'), value: formatQty(row.currentRunHours) || '0' },
    { label: t('fields.currentTestCount'), value: formatNumber(row.currentTestCount) },
  ]
  const upkeep: DataListItem[] = [
    { label: t('fields.lastMaintenanceAt'), value: formatDate(row.lastMaintenanceAt) || null },
    { label: t('fields.nextMaintenanceAt'), value: formatDate(row.nextMaintenanceAt) || null },
    { label: t('fields.lastCalibrationAt'), value: formatDate(row.lastCalibrationAt) || null },
    { label: t('fields.nextCalibrationAt'), value: formatDate(row.nextCalibrationAt) || null },
  ]
  const specs: DataListItem[] = [
    { label: t('fields.voltage'), value: row.specs?.voltage },
    { label: t('fields.power'), value: row.specs?.power },
    { label: t('fields.dimensions'), value: row.specs?.dimensions },
    { label: t('fields.weight'), value: row.specs?.weight },
    { label: t('fields.envTemp'), value: row.specs?.env?.temp },
    { label: t('fields.envHumidity'), value: row.specs?.env?.humidity },
    { label: t('fields.envUps'), value: row.specs?.env?.ups },
    { label: t('fields.envWater'), value: row.specs?.env?.water },
    { label: t('fields.envGas'), value: row.specs?.env?.gas },
  ]
  const notes: DataListItem[] = [
    { label: t('fields.notes'), value: row.notes, full: true },
    { label: t('fields.statusNote'), value: row.statusNote, full: true },
    { label: t('fields.createdAt'), value: formatDateTime(row.createdAt) },
    { label: t('fields.updatedAt'), value: formatDateTime(row.updatedAt) },
  ]
  return (
    <>
      <SectionCard title={t('overview.general', { defaultValue: 'Thông tin chung' })}>
        <DataList columns={3} items={general} />
      </SectionCard>
      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title={t('overview.purchase', { defaultValue: 'Mua sắm & bảo hành' })}>
          <DataList columns={2} items={purchase} />
        </SectionCard>
        <SectionCard title={t('overview.operation', { defaultValue: 'Vận hành' })}>
          <DataList columns={2} items={operation} />
        </SectionCard>
        <SectionCard title={t('overview.upkeep', { defaultValue: 'Bảo dưỡng & hiệu chuẩn' })}>
          <DataList columns={2} items={upkeep} />
        </SectionCard>
        <SectionCard title={t('overview.specs', { defaultValue: 'Thông số kỹ thuật' })}>
          <DataList columns={2} items={specs} />
        </SectionCard>
      </div>
      <SectionCard title={t('overview.notes', { defaultValue: 'Ghi chú' })}>
        <DataList columns={2} items={notes} />
      </SectionCard>
    </>
  )
}

function NetworkTab({ id, canWrite }: { id: string; canWrite: boolean }) {
  const { t } = useTranslation('equipment')
  const qc = useQueryClient()
  const detail = useEquipment(id)
  const form = useForm({
    defaultValues: {
      ip: '',
      mac: '',
      port: '' as number | '',
      protocol: '' as '' | 'HL7' | 'ASTM' | 'other',
      lisConnected: false,
      lisNote: '',
      hostPcName: '',
      hostPcSpec: '',
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
      lisNote: n.lisNote ?? '',
      hostPcName: n.hostPcName ?? '',
      hostPcSpec: n.hostPcSpec ?? '',
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
        lisNote: v.lisNote || null,
        hostPcName: v.hostPcName || null,
        hostPcSpec: v.hostPcSpec || null,
        diagramFileId: v.diagramFileId,
      })
    },
    onSuccess: () => {
      toast.success(t('network.saved'))
      void qc.invalidateQueries({ queryKey: equipmentKeys.detail(id) })
    },
    onError: (e) => toast.error(messageFor(e)),
  })
  return (
    <SectionCard
      title={t('tabs.network')}
      description={t('network.hint', { defaultValue: 'Kết nối mạng, LIS và máy tính chủ' })}
    >
      <Form {...form}>
        <form
          className="grid max-w-2xl gap-4 sm:grid-cols-2"
          onSubmit={form.handleSubmit(() => save.mutate())}
        >
          <TextField
            control={form.control}
            name="ip"
            label={t('network.ip')}
            disabled={!canWrite}
          />
          <TextField
            control={form.control}
            name="mac"
            label={t('network.mac')}
            disabled={!canWrite}
          />
          <NumberField
            control={form.control}
            name="port"
            label={t('network.port')}
            disabled={!canWrite}
          />
          <SelectField
            control={form.control}
            name="protocol"
            label={t('network.protocol')}
            disabled={!canWrite}
            emptyLabel="—"
            options={[
              { value: 'HL7', label: 'HL7' },
              { value: 'ASTM', label: 'ASTM' },
              { value: 'other', label: t('network.other') },
            ]}
          />
          <SwitchField
            control={form.control}
            name="lisConnected"
            label={t('network.lisConnected')}
            disabled={!canWrite}
          />
          <TextField
            control={form.control}
            name="lisNote"
            label={t('network.lisNote')}
            disabled={!canWrite}
          />
          <TextField
            control={form.control}
            name="hostPcName"
            label={t('network.hostPcName')}
            disabled={!canWrite}
          />
          <TextField
            control={form.control}
            name="hostPcSpec"
            label={t('network.hostPcSpec')}
            disabled={!canWrite}
          />
          <FormField
            control={form.control}
            name="diagramFileId"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FileField
                  label={t('network.diagram')}
                  value={field.value}
                  onChange={field.onChange}
                  disabled={!canWrite}
                />
                <FormMessage />
              </FormItem>
            )}
          />
          {canWrite && (
            <div className="sm:col-span-2">
              <Button type="submit" disabled={save.isPending}>
                {t('actions.saveNetwork')}
              </Button>
            </div>
          )}
        </form>
      </Form>
    </SectionCard>
  )
}

function AccessoriesTab({ id, canWrite }: { id: string; canWrite: boolean }) {
  const { t } = useTranslation('equipment')
  const { t: tc } = useTranslation()
  const qc = useQueryClient()
  const { confirm, dialog } = useConfirm()
  const list = useQuery({
    queryKey: equipmentKeys.accessories(id),
    queryFn: () => api.listAccessories(id),
  })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Accessory | null>(null)
  const form = useForm<AccessoryForm>({
    resolver: zodResolver(accessorySchema),
    defaultValues: emptyAccessory,
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: equipmentKeys.detail(id) })
  const save = useMutation({
    mutationFn: (v: AccessoryForm) => {
      const body = {
        code: v.code || null,
        name: v.name,
        type: v.type,
        quantity: v.quantity === '' ? 1 : v.quantity,
        condition: v.condition,
        replacedAt: v.replacedAt || null,
        notes: v.notes || null,
      }
      return editing ? api.updateAccessory(id, editing.id, body) : api.createAccessory(id, body)
    },
    onSuccess: () => {
      void invalidate()
      setOpen(false)
      setEditing(null)
      form.reset(emptyAccessory)
      toast.success(t('accessories.saved'))
    },
    onError: (e) => {
      if (!applyServerErrors(form, e)) toast.error(messageFor(e))
    },
  })
  const remove = useMutation({
    mutationFn: (aid: string) => api.deleteAccessory(id, aid),
    onSuccess: () => {
      void invalidate()
      toast.success(t('accessories.deleted'))
    },
    onError: (e) => toast.error(messageFor(e)),
  })
  const openCreate = () => {
    setEditing(null)
    form.reset(emptyAccessory)
    setOpen(true)
  }
  const openEdit = (row: Accessory) => {
    setEditing(row)
    form.reset({
      code: row.code ?? '',
      name: row.name,
      type: row.type as AccessoryForm['type'],
      quantity: row.quantity,
      condition: row.condition as AccessoryForm['condition'],
      replacedAt: row.replacedAt?.slice(0, 10) ?? '',
      notes: row.notes ?? '',
    })
    setOpen(true)
  }
  if (list.isPending) return <TabSkeleton label={t('accessories.loading')} />
  if (list.error) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />
  return (
    <SectionCard
      title={t('tabs.accessories')}
      description={t('countItems', { defaultValue: '{{n}} mục', n: list.data.length })}
      actions={canWrite && <Button onClick={openCreate}>{t('actions.addAccessory')}</Button>}
      flush
    >
      {dialog}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('accessories.code')}</TableHead>
            <TableHead>{t('accessories.name')}</TableHead>
            <TableHead>{t('accessories.type')}</TableHead>
            <TableHead>{t('accessories.quantity')}</TableHead>
            <TableHead>{t('accessories.condition')}</TableHead>
            <TableHead>{t('accessories.replacedAt')}</TableHead>
            <TableHead>{t('accessories.notes')}</TableHead>
            {canWrite && <TableHead>{tc('actions.more')}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.data.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.code ?? '—'}</TableCell>
              <TableCell>{row.name}</TableCell>
              <TableCell>{t(`accessories.types.${row.type}`)}</TableCell>
              <TableCell>{row.quantity}</TableCell>
              <TableCell>
                <StatusBadge value={row.condition} map={accessoryConditionMap} />
              </TableCell>
              <TableCell>{formatDate(row.replacedAt) || '—'}</TableCell>
              <TableCell>{row.notes ?? '—'}</TableCell>
              {canWrite && (
                <TableCell className="whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
                    {tc('actions.edit')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (
                        (await confirm({
                          title: t('accessories.deleteTitle'),
                          destructive: true,
                        })) !== false
                      )
                        remove.mutate(row.id)
                    }}
                  >
                    {tc('actions.delete')}
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
          {list.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-muted-foreground py-8 text-center">
                {t('accessories.empty')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <FormDialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value)
          if (!value) setEditing(null)
        }}
        title={t('accessories.title')}
        form={form}
        submitting={save.isPending}
        onSubmit={(v) => save.mutate(v)}
      >
        <TextField control={form.control} name="code" label={t('accessories.code')} />
        <TextField control={form.control} name="name" label={t('accessories.name')} />
        <SelectField
          control={form.control}
          name="type"
          label={t('accessories.type')}
          options={Object.entries(
            t('accessories.types', { returnObjects: true }) as Record<string, string>,
          ).map(([value, label]) => ({ value, label }))}
        />
        <NumberField
          control={form.control}
          name="quantity"
          label={t('accessories.quantity')}
          min={1}
        />
        <SelectField
          control={form.control}
          name="condition"
          label={t('accessories.condition')}
          options={Object.entries(
            t('accessories.conditions', { returnObjects: true }) as Record<string, string>,
          ).map(([value, label]) => ({ value, label }))}
        />
        <DateField control={form.control} name="replacedAt" label={t('accessories.replacedAt')} />
        <TextField control={form.control} name="notes" label={t('accessories.notes')} />
      </FormDialog>
    </SectionCard>
  )
}

function SoftwareTab({ id, canWrite }: { id: string; canWrite: boolean }) {
  const { t } = useTranslation('equipment')
  const { t: tc } = useTranslation()
  const qc = useQueryClient()
  const { confirm, dialog } = useConfirm()
  const list = useQuery({
    queryKey: equipmentKeys.software(id),
    queryFn: () => api.listSoftware(id),
  })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Software | null>(null)
  const [upgradeRow, setUpgradeRow] = useState<Software | null>(null)
  const [historyRow, setHistoryRow] = useState<Software | null>(null)
  const [key, setKey] = useState<string | null>(null)
  const form = useForm<SoftwareForm>({
    resolver: zodResolver(softwareSchema),
    defaultValues: emptySoftware,
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: equipmentKeys.detail(id) })
  const save = useMutation({
    mutationFn: (v: SoftwareForm) => {
      const body = {
        name: v.name,
        version: v.version || null,
        updatedOn: v.updatedOn || null,
        licenseExpiresAt: v.licenseExpiresAt || null,
        notes: v.notes || null,
        ...(v.licenseKey ? { licenseKey: v.licenseKey } : {}),
      }
      return editing ? api.updateSoftware(id, editing.id, body) : api.createSoftware(id, body)
    },
    onSuccess: () => {
      void invalidate()
      setOpen(false)
      setEditing(null)
      form.reset(emptySoftware)
      toast.success(t('software.saved'))
    },
    onError: (e) => {
      if (!applyServerErrors(form, e)) toast.error(messageFor(e))
    },
  })
  const remove = useMutation({
    mutationFn: (sid: string) => api.deleteSoftware(id, sid),
    onSuccess: () => {
      void invalidate()
      toast.success(t('software.deleted'))
    },
    onError: (e) => toast.error(messageFor(e)),
  })
  useEffect(() => {
    if (!key) return
    const timer = setTimeout(() => setKey(null), 10000)
    return () => clearTimeout(timer)
  }, [key])
  const openCreate = () => {
    setEditing(null)
    form.reset(emptySoftware)
    setOpen(true)
  }
  const openEdit = (row: Software) => {
    setEditing(row)
    form.reset({
      name: row.name,
      version: row.version ?? '',
      updatedOn: row.updatedOn?.slice(0, 10) ?? '',
      licenseExpiresAt: row.licenseExpiresAt?.slice(0, 10) ?? '',
      licenseKey: '',
      notes: row.notes ?? '',
    })
    setOpen(true)
  }
  if (list.isPending) return <TabSkeleton label={t('software.loading')} />
  if (list.error) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />
  return (
    <SectionCard
      title={t('tabs.software')}
      description={t('countItems', { defaultValue: '{{n}} mục', n: list.data.length })}
      actions={canWrite && <Button onClick={openCreate}>{t('actions.addSoftware')}</Button>}
      flush
    >
      {dialog}
      {key && (
        <div className="bg-surface-2 mx-5 mb-3 flex items-center justify-between gap-3 rounded-lg px-3 py-2 font-mono text-[13px]">
          <span className="truncate">{key}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void navigator.clipboard.writeText(key)}
          >
            {t('actions.copy')}
          </Button>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('software.name')}</TableHead>
            <TableHead>{t('software.version')}</TableHead>
            <TableHead>{t('software.updatedOn')}</TableHead>
            <TableHead>{t('software.licenseExpiresAt')}</TableHead>
            <TableHead>{t('software.notes')}</TableHead>
            {canWrite && <TableHead>{tc('actions.more')}</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {list.data.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.version ?? '—'}</TableCell>
              <TableCell>{formatDate(row.updatedOn) || '—'}</TableCell>
              <TableCell
                className={
                  row.licenseExpiresAt && new Date(row.licenseExpiresAt) < new Date()
                    ? 'text-destructive'
                    : undefined
                }
              >
                {formatDate(row.licenseExpiresAt) || '—'}
              </TableCell>
              <TableCell>{row.notes ?? '—'}</TableCell>
              {canWrite && (
                <TableCell className="whitespace-nowrap">
                  {row.hasLicenseKey && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          const result = await api.softwareLicense(id, row.id)
                          setKey(result.licenseKey)
                        } catch (e) {
                          toast.error(messageFor(e))
                        }
                      }}
                    >
                      {t('actions.viewKey')}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setUpgradeRow(row)}>
                    {t('actions.upgrade')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setHistoryRow(row)}>
                    {t('actions.history')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
                    {tc('actions.edit')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (
                        (await confirm({ title: t('software.deleteTitle'), destructive: true })) !==
                        false
                      )
                        remove.mutate(row.id)
                    }}
                  >
                    {tc('actions.delete')}
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
          {list.data.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                {t('software.empty')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <FormDialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value)
          if (!value) setEditing(null)
        }}
        title={t('software.title')}
        form={form}
        submitting={save.isPending}
        onSubmit={(v) => save.mutate(v)}
      >
        <TextField control={form.control} name="name" label={t('software.name')} />
        <TextField control={form.control} name="version" label={t('software.version')} />
        <DateField control={form.control} name="updatedOn" label={t('software.updatedOn')} />
        <DateField
          control={form.control}
          name="licenseExpiresAt"
          label={t('software.licenseExpiresAt')}
        />
        <TextField control={form.control} name="licenseKey" label={t('software.licenseKey')} />
        <TextField control={form.control} name="notes" label={t('software.notes')} />
      </FormDialog>
      {upgradeRow && (
        <UpgradeDialog
          id={id}
          row={upgradeRow}
          onClose={() => setUpgradeRow(null)}
          onDone={invalidate}
        />
      )}
      {historyRow && (
        <SoftwareHistoryDrawer id={id} row={historyRow} onClose={() => setHistoryRow(null)} />
      )}
    </SectionCard>
  )
}

function UpgradeDialog({
  id,
  row,
  onClose,
  onDone,
}: {
  id: string
  row: Software
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation('equipment')
  const form = useForm<SoftwareUpgradeForm>({
    resolver: zodResolver(softwareUpgradeSchema),
    defaultValues: { toVersion: row.version ?? '', note: '' },
  })
  const save = useMutation({
    mutationFn: (v: SoftwareUpgradeForm) =>
      api.upgradeSoftware(id, row.id, { toVersion: v.toVersion, note: v.note || null }),
    onSuccess: () => {
      onDone()
      toast.success(t('software.upgraded'))
      onClose()
    },
    onError: (e) => toast.error(messageFor(e)),
  })
  return (
    <FormDialog
      open
      onOpenChange={(value) => !value && onClose()}
      title={t('software.upgradeTitle')}
      form={form}
      submitting={save.isPending}
      onSubmit={(v) => save.mutate(v)}
    >
      <TextField control={form.control} name="toVersion" label={t('software.upgradeTo')} />
      <TextField control={form.control} name="note" label={t('software.upgradeNote')} />
    </FormDialog>
  )
}

function SoftwareHistoryDrawer({
  id,
  row,
  onClose,
}: {
  id: string
  row: Software
  onClose: () => void
}) {
  const { t } = useTranslation('equipment')
  const history = useQuery({
    queryKey: equipmentKeys.softwareHistory(id, row.id),
    queryFn: () => api.softwareHistory(id, row.id),
  })
  return (
    <Sheet open onOpenChange={(value) => !value && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {t('software.historyTitle')} · {row.name}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-3 p-4 text-sm">
          {history.isPending && <p role="status">{t('software.historyLoading')}</p>}
          {history.error && (
            <ErrorState error={history.error} onRetry={() => void history.refetch()} />
          )}
          {history.data?.map((item) => (
            <div key={item.id} className="border-divider rounded-lg border p-3">
              <p>
                {t('software.historyFrom')}: {item.fromVersion ?? '—'} → {t('software.historyTo')}:{' '}
                {item.toVersion}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(item.changedAt)} · {item.changedBy ? shortId(item.changedBy) : '—'}
              </p>
              {item.note && <p className="mt-1">{item.note}</p>}
            </div>
          ))}
          {history.data?.length === 0 && (
            <p className="text-muted-foreground">{t('software.historyEmpty')}</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
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
  const { t } = useTranslation('equipment')
  const { t: tc } = useTranslation()
  const qc = useQueryClient()
  const { confirm, dialog } = useConfirm()
  const list = useQuery({
    queryKey: equipmentKeys.components(id),
    queryFn: () => api.listComponents(id),
  })
  const types = useQuery({
    queryKey: ['reference', 'component-types', 'all'] as const,
    queryFn: () => api.catalogOptions('component-types', '', 200),
    staleTime: 300_000,
  })
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<ComponentRow | null>(null)
  const [replaceRow, setReplaceRow] = useState<ComponentRow | null>(null)
  const [historyRow, setHistoryRow] = useState<ComponentRow | null>(null)
  const form = useForm<ComponentForm>({
    resolver: zodResolver(componentSchema),
    defaultValues: emptyComponent,
  })
  const componentTypeId = form.watch('componentTypeId')
  const invalidate = () => qc.invalidateQueries({ queryKey: equipmentKeys.detail(id) })
  const save = useMutation({
    mutationFn: (v: ComponentForm) => {
      const body = {
        name: v.name,
        componentTypeId: v.componentTypeId,
        partNo: v.partNo || null,
        serial: v.serial || null,
        installedAt: v.installedAt || null,
        lifespanHours: v.lifespanHours === '' ? null : v.lifespanHours,
        lifespanTests: v.lifespanTests === '' ? null : v.lifespanTests,
        lifespanMonths: v.lifespanMonths === '' ? null : v.lifespanMonths,
        notes: v.notes || null,
      }
      return editing ? api.updateComponent(id, editing.id, body) : api.createComponent(id, body)
    },
    onSuccess: () => {
      void invalidate()
      setOpen(false)
      setEditing(null)
      form.reset(emptyComponent)
      toast.success(t('components.saved'))
    },
    onError: (e) => {
      if (!applyServerErrors(form, e)) toast.error(messageFor(e))
    },
  })
  const remove = useMutation({
    mutationFn: (cid: string) => api.deleteComponent(id, cid),
    onSuccess: () => {
      void invalidate()
      toast.success(t('components.deleted'))
    },
    onError: (e) => toast.error(messageFor(e)),
  })
  const typeName = (typeId: string | null) => {
    if (!typeId) return '—'
    const option = types.data?.find((item) => item.id === typeId)
    return option ? optionLabel(option) : shortId(typeId)
  }
  const openCreate = () => {
    setEditing(null)
    form.reset(emptyComponent)
    setOpen(true)
  }
  const openEdit = (row: ComponentRow) => {
    setEditing(row)
    form.reset({
      name: row.name,
      componentTypeId: row.componentTypeId,
      partNo: row.partNo ?? '',
      serial: row.serial ?? '',
      installedAt: row.installedAt?.slice(0, 10) ?? '',
      lifespanHours: row.lifespanHours ?? '',
      lifespanTests: row.lifespanTests ?? '',
      lifespanMonths: row.lifespanMonths ?? '',
      notes: row.notes ?? '',
    })
    setOpen(true)
  }
  if (list.isPending) return <TabSkeleton label={t('components.loading')} />
  if (list.error) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />
  return (
    <SectionCard
      title={t('tabs.components')}
      description={t('countItems', { defaultValue: '{{n}} mục', n: list.data.length })}
      actions={canWrite && <Button onClick={openCreate}>{t('actions.addComponent')}</Button>}
    >
      {dialog}
      <ul className="space-y-3">
        {list.data.map((row) => {
          const pct = api.usedPct(row, { currentRunHours: hours, currentTestCount: tests })
          const bar = Math.min(100, Math.round(pct * 100))
          const color = bar >= 100 ? 'bg-destructive' : bar >= 80 ? 'bg-warning' : 'bg-success'
          return (
            <li key={row.id} className="border-divider rounded-xl border p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[14px] font-semibold">{row.name}</span>
                <StatusBadge value={row.status} map={componentStatusMap} />
              </div>
              <dl className="mt-3 grid gap-x-4 gap-y-2 text-[13px] sm:grid-cols-3 [&_dd]:font-medium [&_dt]:text-[12px] [&_dt]:text-muted-foreground">
                <div>
                  <dt>{t('components.componentType')}</dt>
                  <dd>{typeName(row.componentTypeId)}</dd>
                </div>
                <div>
                  <dt>{t('components.partNo')}</dt>
                  <dd>{row.partNo ?? '—'}</dd>
                </div>
                <div>
                  <dt>{t('components.serial')}</dt>
                  <dd>{row.serial ?? '—'}</dd>
                </div>
                <div>
                  <dt>{t('components.installedAt')}</dt>
                  <dd>{formatDate(row.installedAt) || '—'}</dd>
                </div>
                <div>
                  <dt>{t('components.lifespanHours')}</dt>
                  <dd>{row.lifespanHours ?? '—'}</dd>
                </div>
                <div>
                  <dt>{t('components.lifespanTests')}</dt>
                  <dd>{row.lifespanTests ?? '—'}</dd>
                </div>
                <div className="sm:col-span-3">
                  <dt>{t('components.notes')}</dt>
                  <dd>{row.notes ?? '—'}</dd>
                </div>
              </dl>
              <div className="bg-muted mt-3 h-2 overflow-hidden rounded-full">
                <div
                  data-testid={`usedpct-${row.id}`}
                  className={`h-2 rounded-full ${color}`}
                  style={{ width: `${bar}%` }}
                />
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                {t('components.used', { percent: bar })}
              </p>
              {canWrite && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setReplaceRow(row)}>
                    {t('actions.replace')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setHistoryRow(row)}>
                    {t('actions.history')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
                    {tc('actions.edit')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (
                        (await confirm({
                          title: t('components.deleteTitle'),
                          destructive: true,
                        })) !== false
                      )
                        remove.mutate(row.id)
                    }}
                  >
                    {tc('actions.delete')}
                  </Button>
                </div>
              )}
            </li>
          )
        })}
        {list.data.length === 0 && (
          <li>
            <EmptyState icon={Puzzle} title={t('components.empty')} />
          </li>
        )}
      </ul>
      <FormDialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value)
          if (!value) setEditing(null)
        }}
        title={t('components.title')}
        form={form}
        submitting={save.isPending}
        onSubmit={(v) => save.mutate(v)}
      >
        <TextField control={form.control} name="name" label={t('components.name')} />
        <AsyncSelectField
          control={form.control}
          name="componentTypeId"
          label={t('components.componentType')}
          queryKey="component-types"
          loadOptions={(q) => api.catalogOptions('component-types', q)}
          selectedOptions={
            componentTypeId ? (types.data ?? []).filter((o) => o.id === componentTypeId) : []
          }
          resolveOption={(value) => resolveCatalogItem('component-types', value)}
          clearable
        />
        <TextField control={form.control} name="partNo" label={t('components.partNo')} />
        <TextField control={form.control} name="serial" label={t('components.serial')} />
        <DateField control={form.control} name="installedAt" label={t('components.installedAt')} />
        <NumberField
          control={form.control}
          name="lifespanHours"
          label={t('components.lifespanHours')}
          min={1}
        />
        <NumberField
          control={form.control}
          name="lifespanTests"
          label={t('components.lifespanTests')}
          min={1}
        />
        <NumberField
          control={form.control}
          name="lifespanMonths"
          label={t('components.lifespanMonths')}
          min={1}
        />
        <TextField control={form.control} name="notes" label={t('components.notes')} />
      </FormDialog>
      {replaceRow && (
        <ReplaceDialog
          id={id}
          row={replaceRow}
          onClose={() => setReplaceRow(null)}
          onDone={invalidate}
        />
      )}
      {historyRow && (
        <ReplacementsDrawer id={id} row={historyRow} onClose={() => setHistoryRow(null)} />
      )}
    </SectionCard>
  )
}

function ReplaceDialog({
  id,
  row,
  onClose,
  onDone,
}: {
  id: string
  row: ComponentRow
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation('equipment')
  const form = useForm<ReplaceComponentForm>({
    resolver: zodResolver(replaceComponentSchema),
    defaultValues: emptyReplace,
  })
  const tickets = async (q: string): Promise<ReferenceOption[]> => {
    const page = await api.listRepairsForEquipment(id)
    return page.items
      .filter((item) => `${item.code} ${item.description}`.toLowerCase().includes(q.toLowerCase()))
      .map((item) => ({ id: item.id, code: item.code, name: item.description.slice(0, 80) }))
  }
  const save = useMutation({
    mutationFn: (v: ReplaceComponentForm) =>
      api.replaceComponent(id, row.id, {
        reason: v.reason,
        newSerial: v.newSerial || null,
        cost: v.cost || null,
        repairTicketId: v.repairTicketId,
        replacedAt: v.replacedAt || null,
      }),
    onSuccess: () => {
      onDone()
      toast.success(t('components.replaced'))
      onClose()
    },
    onError: (e) => toast.error(messageFor(e)),
  })
  return (
    <FormDialog
      open
      onOpenChange={(value) => !value && onClose()}
      title={t('components.replaceTitle')}
      form={form}
      submitting={save.isPending}
      onSubmit={(v) => save.mutate(v)}
    >
      <TextField control={form.control} name="reason" label={t('components.replaceReason')} />
      <TextField control={form.control} name="newSerial" label={t('components.replaceNewSerial')} />
      <MoneyField control={form.control} name="cost" label={t('components.replaceCost')} />
      <AsyncSelectField
        control={form.control}
        name="repairTicketId"
        label={t('components.replaceTicket')}
        queryKey="repair-tickets"
        loadOptions={tickets}
        clearable
      />
      <DateField control={form.control} name="replacedAt" label={t('components.replaceAt')} />
    </FormDialog>
  )
}

function ReplacementsDrawer({
  id,
  row,
  onClose,
}: {
  id: string
  row: ComponentRow
  onClose: () => void
}) {
  const { t } = useTranslation('equipment')
  const history = useQuery({
    queryKey: equipmentKeys.replacements(id, row.id),
    queryFn: () => api.componentReplacements(id, row.id),
  })
  return (
    <Sheet open onOpenChange={(value) => !value && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>
            {t('components.historyTitle')} · {row.name}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-3 p-4 text-sm">
          {history.isPending && <p role="status">{t('components.historyLoading')}</p>}
          {history.error && (
            <ErrorState error={history.error} onRetry={() => void history.refetch()} />
          )}
          {history.data?.map((item) => (
            <div key={item.id} className="border-divider rounded-lg border p-3">
              <p className="font-medium">{formatDateTime(item.replacedAt)}</p>
              <p>
                {t('components.historyReason')}: {item.reason}
              </p>
              <p>
                {t('components.historyOldSerial')}: {item.oldSerial ?? '—'} →{' '}
                {t('components.historyNewSerial')}: {item.newSerial ?? '—'}
              </p>
              <p>
                {t('components.historyCost')}: {formatVnd(item.cost) || '—'}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('components.historyBy')}: {item.byUserId ? shortId(item.byUserId) : '—'} ·{' '}
                {t('components.historyTicket')}:{' '}
                {item.repairTicketId ? shortId(item.repairTicketId) : '—'}
              </p>
            </div>
          ))}
          {history.data?.length === 0 && (
            <p className="text-muted-foreground">{t('components.historyEmpty')}</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function SuppliesTab({ id, canWrite }: { id: string; canWrite: boolean }) {
  const { t } = useTranslation('equipment')
  const { t: tc } = useTranslation()
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: equipmentKeys.supplies(id),
    queryFn: () => api.listEquipmentSupplies(id),
  })
  const runway = useQuery({
    queryKey: equipmentKeys.runway(id),
    queryFn: () => api.equipmentRunway(id),
  })
  const supplies = useQuery({
    queryKey: ['reference', 'supplies', 'all'] as const,
    queryFn: () => api.supplyOptions('', 200),
    staleTime: 300_000,
  })
  const [options, setOptions] = useState<Record<string, ReferenceOption>>({})
  const form = useForm<SuppliesForm>({
    resolver: zodResolver(suppliesSchema),
    defaultValues: { rows: [] },
  })
  const rows = form.watch('rows')
  useEffect(() => {
    if (!list.data) return
    form.reset({
      rows: list.data.map((row: EquipmentSupplyLink) => ({
        supplyId: row.supplyId,
        normQtyPerDay: row.normQtyPerDay ?? '',
        normQtyPerTest: row.normQtyPerTest ?? '',
        isPrimary: row.isPrimary,
        notes: row.notes ?? '',
      })),
    })
  }, [list.data, form])
  const invalidate = () => qc.invalidateQueries({ queryKey: equipmentKeys.detail(id) })
  const save = useMutation({
    mutationFn: () =>
      api.putEquipmentSupplies(
        id,
        form.getValues('rows').map((row) => ({
          supplyId: row.supplyId,
          normQtyPerDay: row.normQtyPerDay || null,
          normQtyPerTest: row.normQtyPerTest || null,
          isPrimary: row.isPrimary,
          notes: row.notes || null,
        })),
      ),
    onSuccess: () => {
      void invalidate()
      toast.success(t('supplies.saved'))
    },
    onError: (e) => toast.error(messageFor(e)),
  })
  const nameOf = (supplyId: string) =>
    optionLabel(options[supplyId] ?? supplies.data?.find((item) => item.id === supplyId))
  const addRow = async (supplyId: string) => {
    if (form.getValues('rows').some((row) => row.supplyId === supplyId)) return
    const option =
      supplies.data?.find((item) => item.id === supplyId) ??
      (await api.resolveSupplyOption(supplyId))
    if (option) setOptions((current) => ({ ...current, [supplyId]: option }))
    form.setValue('rows', [
      ...form.getValues('rows'),
      { supplyId, normQtyPerDay: '', normQtyPerTest: '', isPrimary: false, notes: '' },
    ])
  }
  if (list.isPending) return <TabSkeleton label={t('supplies.loading')} />
  if (list.error) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />
  return (
    <SectionCard
      title={t('tabs.supplies')}
      description={t('supplies.hint', {
        defaultValue: 'Định mức tiêu hao và số ngày còn dùng được theo tồn kho',
      })}
      bodyClassName="space-y-4"
    >
      {canWrite && (
        <div className="max-w-sm">
          <AsyncSelect
            label={t('actions.addSupply')}
            queryKey="supplies"
            loadOptions={(q) => api.supplyOptions(q)}
            value={null}
            onChange={(value) => {
              if (typeof value === 'string') void addRow(value)
            }}
            selectedOptions={Object.values(options)}
            resolveOption={api.resolveSupplyOption}
          />
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(() => save.mutate())} noValidate>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('supplies.supply')}</TableHead>
                <TableHead>{t('supplies.normPerDay')}</TableHead>
                <TableHead>{t('supplies.normPerTest')}</TableHead>
                <TableHead>{t('supplies.primary')}</TableHead>
                <TableHead>{t('supplies.runway')}</TableHead>
                {canWrite && <TableHead>{tc('actions.more')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => {
                const run = runway.data?.items.find((item) => item.supplyId === row.supplyId)
                const days = run?.daysLeft
                const tone =
                  days == null
                    ? ''
                    : days < 7
                      ? 'text-destructive'
                      : days < 30
                        ? 'text-warning'
                        : ''
                return (
                  <TableRow key={row.supplyId} className="align-top">
                    <TableCell className="py-2">{nameOf(row.supplyId)}</TableCell>
                    <TableCell>
                      <QtyField
                        control={form.control}
                        name={`rows.${index}.normQtyPerDay`}
                        label={t('supplies.normPerDay')}
                        disabled={!canWrite}
                      />
                    </TableCell>
                    <TableCell>
                      <QtyField
                        control={form.control}
                        name={`rows.${index}.normQtyPerTest`}
                        label={t('supplies.normPerTest')}
                        disabled={!canWrite}
                      />
                    </TableCell>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`rows.${index}.isPrimary`}
                        render={({ field }) => (
                          <FormItem>
                            <Checkbox
                              aria-label={t('supplies.primary')}
                              checked={field.value}
                              disabled={!canWrite}
                              onCheckedChange={(value) => field.onChange(value === true)}
                            />
                          </FormItem>
                        )}
                      />
                    </TableCell>
                    <TableCell className={tone}>
                      {days == null
                        ? '—'
                        : `${t('supplies.days', { days: formatNumber(days) })} (${t(`supplies.runwayBasis.${run?.basis ?? 'unknown'}`)})`}
                    </TableCell>
                    {canWrite && (
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            form.setValue(
                              'rows',
                              form
                                .getValues('rows')
                                .filter((item) => item.supplyId !== row.supplyId),
                            )
                          }
                        >
                          {t('supplies.remove')}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    {t('supplies.empty')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {canWrite && (
            <Button className="mt-4" type="submit" disabled={save.isPending}>
              {t('actions.saveSupplies')}
            </Button>
          )}
        </form>
      </Form>
    </SectionCard>
  )
}

function CountersTab({ id, canWrite }: { id: string; canWrite: boolean }) {
  const { t } = useTranslation('equipment')
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: equipmentKeys.counters(id),
    queryFn: () => api.listCounters(id),
  })
  const [open, setOpen] = useState(false)
  const form = useForm<CounterForm>({
    resolver: zodResolver(counterSchema),
    defaultValues: { recordedAt: '', runHours: '', testCount: '', note: '' },
  })
  const save = useMutation({
    mutationFn: (v: CounterForm) =>
      api.recordCounter(id, {
        recordedAt: v.recordedAt || undefined,
        runHours: v.runHours || undefined,
        testCount: v.testCount === '' ? undefined : v.testCount,
        source: 'manual',
        note: v.note || undefined,
      }),
    onSuccess: () => {
      toast.success(t('counters.recorded'))
      void qc.invalidateQueries({ queryKey: equipmentKeys.detail(id) })
      setOpen(false)
      form.reset({ recordedAt: '', runHours: '', testCount: '', note: '' })
    },
    onError: (e) => {
      if (!applyServerErrors(form, e)) toast.error(messageFor(e))
    },
  })
  if (list.isPending) return <TabSkeleton label={t('counters.loading')} />
  if (list.error) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />
  const points = list.data.items
  const maxH = Math.max(...points.map((p) => Number(p.runHours ?? 0)), 1)
  const maxT = Math.max(...points.map((p) => p.testCount ?? 0), 1)
  const line = (value: (point: (typeof points)[number]) => number, max: number) =>
    points
      .map(
        (point, index) =>
          `${(index / Math.max(points.length - 1, 1)) * 320},${80 - (value(point) / max) * 70}`,
      )
      .join(' ')
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title={t('counters.runHoursChart')} bodyClassName="pt-0">
          <svg
            viewBox="0 0 320 80"
            className="w-full"
            role="img"
            aria-label={t('counters.runHoursChart')}
          >
            <polyline
              fill="none"
              className="text-primary"
              stroke="currentColor"
              strokeWidth="2"
              points={line((point) => Number(point.runHours ?? 0), maxH)}
            />
          </svg>
        </SectionCard>
        <SectionCard title={t('counters.testCountChart')} bodyClassName="pt-0">
          <svg
            viewBox="0 0 320 80"
            className="w-full"
            role="img"
            aria-label={t('counters.testCountChart')}
          >
            <polyline
              fill="none"
              className="text-info"
              stroke="currentColor"
              strokeWidth="2"
              points={line((point) => point.testCount ?? 0, maxT)}
            />
          </svg>
        </SectionCard>
      </div>
      <SectionCard
        title={t('tabs.counters')}
        description={t('countItems', { defaultValue: '{{n}} mục', n: points.length })}
        actions={
          canWrite && (
            <Button
              onClick={() => {
                form.reset({ recordedAt: '', runHours: '', testCount: '', note: '' })
                setOpen(true)
              }}
            >
              {t('actions.recordCounter')}
            </Button>
          )
        }
        flush
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('counters.recordedAt')}</TableHead>
              <TableHead>{t('counters.runHours')}</TableHead>
              <TableHead>{t('counters.testCount')}</TableHead>
              <TableHead>{t('counters.source')}</TableHead>
              <TableHead>{t('counters.note')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {points.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{formatDateTime(row.recordedAt)}</TableCell>
                <TableCell>{formatQty(row.runHours) || '—'}</TableCell>
                <TableCell>{row.testCount ?? '—'}</TableCell>
                <TableCell>{row.source}</TableCell>
                <TableCell>{row.note ?? '—'}</TableCell>
              </TableRow>
            ))}
            {points.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                  {t('counters.empty')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <FormDialog
          open={open}
          onOpenChange={setOpen}
          title={t('actions.recordCounter')}
          form={form}
          submitting={save.isPending}
          onSubmit={(v) => save.mutate(v)}
        >
          <DatetimeField
            control={form.control}
            name="recordedAt"
            label={t('counters.recordedAtLabel')}
          />
          <QtyField control={form.control} name="runHours" label={t('counters.runHours')} />
          <NumberField
            control={form.control}
            name="testCount"
            label={t('counters.testCount')}
            min={0}
          />
          <TextField control={form.control} name="note" label={t('counters.note')} />
        </FormDialog>
      </SectionCard>
    </>
  )
}

function RepairsTab({ id }: { id: string }) {
  const { t } = useTranslation('equipment')
  const list = useQuery({
    queryKey: equipmentKeys.repairs(id),
    queryFn: () => api.listRepairsForEquipment(id),
  })
  if (list.isPending) return <TabSkeleton label={t('repairs.loading')} />
  if (list.error) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />
  return (
    <SectionCard
      title={t('tabs.repairs')}
      description={t('countItems', { defaultValue: '{{n}} mục', n: list.data.items.length })}
      flush
    >
      {list.data.items.length === 0 ? (
        <EmptyState icon={Wrench} title={t('repairs.empty')} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">
                {t('repairs.code', { defaultValue: 'Mã phiếu' })}
              </TableHead>
              <TableHead>{t('repairs.status', { defaultValue: 'Trạng thái' })}</TableHead>
              <TableHead>{t('repairs.createdAt', { defaultValue: 'Ngày tạo' })}</TableHead>
              <TableHead className="pr-5">
                {t('repairs.assignee', { defaultValue: 'Kỹ thuật viên' })}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.data.items.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="pl-5">
                  <Link
                    className="text-primary font-semibold hover:underline"
                    to={`/repairs/${row.id}`}
                  >
                    {row.code}
                  </Link>
                </TableCell>
                <TableCell>
                  <StatusBadge value={row.status} map={repairStatusMap} />
                </TableCell>
                <TableCell className="tabular-nums">{formatDate(row.createdAt)}</TableCell>
                <TableCell className="pr-5">{row.assignee?.fullName ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SectionCard>
  )
}

function MaintenanceTab({ id }: { id: string }) {
  const { t } = useTranslation('equipment')
  const tasks = useQuery({
    queryKey: equipmentKeys.maintenance(id),
    queryFn: () => api.listMaintenanceForEquipment(id),
  })
  const cals = useQuery({
    queryKey: equipmentKeys.calibrations(id),
    queryFn: () => api.listCalibrationHistory(id),
  })
  const taskRows = tasks.data?.items ?? []
  const calRows = cals.data ?? []
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <SectionCard title={t('maintenance.tasks')} flush={taskRows.length > 0}>
        {tasks.isPending && (
          <p role="status" className="text-muted-foreground text-[13px]">
            {t('maintenance.loading')}
          </p>
        )}
        {tasks.error && <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} />}
        {tasks.data && taskRows.length === 0 && (
          <EmptyState icon={Wrench} title={t('maintenance.emptyTasks')} />
        )}
        {taskRows.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">{t('repairs.code', { defaultValue: 'Mã' })}</TableHead>
                <TableHead>{t('repairs.status', { defaultValue: 'Trạng thái' })}</TableHead>
                <TableHead className="pr-5">
                  {t('maintenance.dueAt', { defaultValue: 'Hạn' })}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {taskRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-5">
                    <Link
                      className="text-primary font-semibold hover:underline"
                      to={`/maintenance/tasks/${row.id}`}
                    >
                      {row.code}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={row.status} map={taskStatusMap} />
                  </TableCell>
                  <TableCell className="pr-5 tabular-nums">{formatDate(row.dueAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
      <SectionCard title={t('maintenance.calibrations')} flush={calRows.length > 0}>
        {cals.isPending && (
          <p role="status" className="text-muted-foreground text-[13px]">
            {t('maintenance.loading')}
          </p>
        )}
        {cals.error && <ErrorState error={cals.error} onRetry={() => void cals.refetch()} />}
        {cals.data && calRows.length === 0 && (
          <EmptyState icon={FileText} title={t('maintenance.emptyCalibrations')} />
        )}
        {calRows.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">{t('repairs.code', { defaultValue: 'Mã' })}</TableHead>
                <TableHead>{t('repairs.status', { defaultValue: 'Trạng thái' })}</TableHead>
                <TableHead className="pr-5">
                  {t('maintenance.performedAt', { defaultValue: 'Thực hiện' })}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="pl-5">
                    <Link
                      className="text-primary font-semibold hover:underline"
                      to={`/calibrations/${row.id}`}
                    >
                      {row.code}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <StatusBadge value={row.status} map={calibrationStatusMap} />
                      {row.result && <StatusBadge value={row.result} map={calibrationResultMap} />}
                    </div>
                  </TableCell>
                  <TableCell className="pr-5 tabular-nums">
                    {formatDate(row.performedAt) || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </div>
  )
}

function TransfersTab({
  id,
  canWrite,
  isAdm,
  userId,
  userNames,
  departmentNames,
  onCreate,
}: {
  id: string
  canWrite: boolean
  isAdm: boolean
  userId?: string
  userNames: Map<string, string>
  departmentNames: Map<string, string>
  onCreate: () => void
}) {
  const { t } = useTranslation('equipment')
  const qc = useQueryClient()
  const { confirm, dialog } = useConfirm()
  const list = useQuery({
    queryKey: equipmentKeys.transfers(id),
    queryFn: () => api.listTransfers(id),
  })
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: equipmentKeys.detail(id) })
    void qc.invalidateQueries({ queryKey: equipmentKeys.lists() })
    void qc.invalidateQueries({ queryKey: transferKeys.all })
  }
  const decide = useMutation({
    mutationFn: (input: {
      tid: string
      action: 'approve' | 'reject' | 'cancel'
      reason?: string
    }) =>
      input.action === 'approve'
        ? api.approveTransfer(id, input.tid)
        : input.action === 'reject'
          ? api.rejectTransfer(id, input.tid, input.reason ?? '')
          : api.cancelTransfer(id, input.tid),
    onSuccess: (_data, input) => {
      invalidate()
      toast.success(
        input.action === 'approve'
          ? t('transfers.approved')
          : input.action === 'reject'
            ? t('transfers.rejected')
            : t('transfers.cancelled'),
      )
    },
    onError: (e) => toast.error(messageFor(e)),
  })
  if (list.isPending) return <TabSkeleton label={t('transfers.loading')} />
  if (list.error) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />
  const departmentName = (departmentId: string | null) =>
    departmentId ? (departmentNames.get(departmentId) ?? shortId(departmentId)) : '—'
  const userName = (value: string | null) =>
    value ? (userNames.get(value) ?? shortId(value)) : '—'
  return (
    <SectionCard
      title={t('tabs.transfers')}
      description={t('countItems', { defaultValue: '{{n}} mục', n: list.data.items.length })}
      actions={canWrite && <Button onClick={onCreate}>{t('transfers.create')}</Button>}
    >
      {dialog}
      <ul className="space-y-3 text-sm">
        {list.data.items.map((row) => (
          <li key={row.id} className="border-divider rounded-xl border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={row.status} map={transferStatusMap} />
              <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold">
                {departmentName(row.fromDepartmentId)}
                <ArrowRightLeft className="text-subtle size-3.5" aria-hidden />
                {departmentName(row.toDepartmentId)}
              </span>
              {row.toLocation && <span className="text-muted-foreground">· {row.toLocation}</span>}
            </div>
            <p className="mt-1">{row.reason}</p>
            <p className="text-xs text-muted-foreground">
              {t('transfers.requestedBy')}: {userName(row.requestedBy)} · {t('transfers.createdAt')}
              : {formatDateTime(row.createdAt)}
              {row.approvedBy && (
                <>
                  {' · '}
                  {t('transfers.approvedBy')}: {userName(row.approvedBy)}
                </>
              )}
            </p>
            <div className="mt-2 flex gap-2">
              {isAdm && row.status === 'pending' && (
                <>
                  <Button
                    size="sm"
                    onClick={() => decide.mutate({ tid: row.id, action: 'approve' })}
                  >
                    {t('actions.approve')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      const reason = await confirm({
                        title: t('transfers.rejectTitle'),
                        requireReason: true,
                      })
                      if (reason === false) return
                      decide.mutate({ tid: row.id, action: 'reject', reason })
                    }}
                  >
                    {t('actions.reject')}
                  </Button>
                </>
              )}
              {canWrite && row.status === 'pending' && row.requestedBy === userId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    if ((await confirm({ title: t('transfers.cancelTitle') })) === false) return
                    decide.mutate({ tid: row.id, action: 'cancel' })
                  }}
                >
                  {t('actions.cancel')}
                </Button>
              )}
            </div>
          </li>
        ))}
        {list.data.items.length === 0 && (
          <li>
            <EmptyState
              icon={ArrowRightLeft}
              title={t('transfers.empty')}
              action={
                canWrite && (
                  <Button variant="outline" onClick={onCreate}>
                    {t('transfers.create')}
                  </Button>
                )
              }
            />
          </li>
        )}
      </ul>
    </SectionCard>
  )
}

const EVENT_TYPES = [
  { value: 'created', key: 'created' },
  { value: 'status_changed', key: 'status_changed' },
  { value: 'transferred', key: 'transferred' },
  { value: 'note', key: 'note' },
  { value: 'repair.*', key: 'repair' },
  { value: 'maintenance.*', key: 'maintenance' },
  { value: 'calibration.*', key: 'calibration' },
  { value: 'component.replaced', key: 'component' },
  { value: 'software.updated', key: 'software' },
  { value: 'counter.recorded', key: 'counter' },
] as const

function TimelineTab({ id, userNames }: { id: string; userNames: Map<string, string> }) {
  const { t } = useTranslation('equipment')
  const qc = useQueryClient()
  const [type, setType] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const [note, setNote] = useState('')
  const limit = 20
  const range = dayRangeToIso(from || undefined, to || undefined)
  const events = useQuery({
    queryKey: [...equipmentKeys.events(id), type, from, to, page],
    queryFn: () =>
      api.listEvents(id, {
        type: type || undefined,
        from: range.from,
        to: range.to,
        page,
        limit,
      }),
  })
  const history = useQuery({
    queryKey: equipmentKeys.statusHistory(id),
    queryFn: () => api.statusHistory(id, 1, limit),
  })
  const userName = (value: string | null | undefined) =>
    value ? (userNames.get(value) ?? shortId(value)) : null
  const items = [
    ...(events.data?.items ?? []).map((event) => ({
      at: event.at,
      title: event.title,
      summary: event.summary,
      by: userName(event.byUserId),
    })),
    ...(history.data?.items ?? []).map((row) => ({
      at: row.at,
      title: `${equipmentStatusMap[row.fromStatus]?.label ?? row.fromStatus} → ${
        equipmentStatusMap[row.toStatus]?.label ?? row.toStatus
      }`,
      summary: row.reason,
      by: userName(row.byUserId),
    })),
  ]
  const total = events.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / limit))
  const addNote = useMutation({
    mutationFn: () => api.addNote(id, note),
    onSuccess: () => {
      setNote('')
      toast.success(t('timeline.noted'))
      void qc.invalidateQueries({ queryKey: equipmentKeys.events(id) })
      void qc.invalidateQueries({ queryKey: equipmentKeys.detail(id) })
    },
    onError: (e) => toast.error(messageFor(e)),
  })
  return (
    <SectionCard
      title={t('tabs.timeline')}
      actions={
        <div className="flex flex-wrap items-end gap-2">
          <div className="w-48">
            <Select
              value={type || 'all'}
              onValueChange={(value) => {
                setType(value === 'all' ? '' : value)
                setPage(1)
              }}
            >
              <SelectTrigger aria-label={t('timeline.type')} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('timeline.all')}</SelectItem>
                {EVENT_TYPES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {t(`timeline.types.${option.key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DatePicker
            ariaLabel={t('timeline.from')}
            className="w-40"
            value={from}
            onChange={(value) => {
              setFrom(value ?? '')
              setPage(1)
            }}
          />
          <DatePicker
            ariaLabel={t('timeline.to')}
            className="w-40"
            value={to}
            onChange={(value) => {
              setTo(value ?? '')
              setPage(1)
            }}
          />
        </div>
      }
      bodyClassName="space-y-4"
    >
      <div className="bg-surface-2 flex gap-2 rounded-lg p-2">
        <Input
          aria-label={t('actions.addNote')}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t('timeline.notePlaceholder')}
        />
        <Button disabled={!note.trim() || addNote.isPending} onClick={() => addNote.mutate()}>
          {t('actions.addNote')}
        </Button>
      </div>
      {events.isPending ? (
        <p role="status" className="text-muted-foreground text-[13px]">
          {t('timeline.loading')}
        </p>
      ) : (
        <Timeline events={items} />
      )}
      {events.error && <ErrorState error={events.error} onRetry={() => void events.refetch()} />}
      {history.error && <ErrorState error={history.error} onRetry={() => void history.refetch()} />}
      <div className="flex items-center gap-2 text-sm">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          {t('timeline.prev')}
        </Button>
        <span>{t('timeline.page', { page, pages: formatNumber(pages) })}</span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => setPage((current) => current + 1)}
        >
          {t('timeline.next')}
        </Button>
      </div>
    </SectionCard>
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
  const { t } = useTranslation('equipment')
  const allowed = STATUS_TRANSITIONS[from].filter(
    (status) => isAdm || (status !== 'retired' && status !== 'disposed'),
  )
  const form = useForm<StatusChangeForm>({
    resolver: zodResolver(statusChangeSchema),
    defaultValues: { status: allowed[0] ?? from, reason: '' },
  })
  const [hint, setHint] = useState<string[]>([])
  const save = useMutation({
    mutationFn: (values: StatusChangeForm) => api.changeEquipmentStatus(id, values),
    onSuccess: () => {
      toast.success(t('statusDialog.changed'))
      onDone()
      onClose()
    },
    onError: (error) => {
      if (
        isApiError(error) &&
        error.code === 'EQUIPMENT_INVALID_STATUS_TRANSITION' &&
        error.details &&
        typeof error.details === 'object' &&
        'allowed' in error.details
      ) {
        setHint((error.details as { allowed?: string[] }).allowed ?? [])
      }
      toast.error(messageFor(error))
    },
  })
  return (
    <FormDialog
      open
      onOpenChange={(value) => !value && onClose()}
      title={t('statusDialog.title')}
      form={form}
      submitting={save.isPending}
      onSubmit={(values) => save.mutate(values)}
    >
      <SelectField
        control={form.control}
        name="status"
        label={t('statusDialog.newStatus')}
        options={allowed.map((status) => ({
          value: status,
          label: equipmentStatusMap[status]?.label ?? status,
        }))}
      />
      <TextField control={form.control} name="reason" label={t('statusDialog.reason')} />
      {hint.length > 0 && (
        <p className="text-sm">
          {t('statusDialog.allowed', {
            list: hint.map((status) => equipmentStatusMap[status]?.label ?? status).join(', '),
          })}
        </p>
      )}
    </FormDialog>
  )
}

function CloneDialog({
  id,
  onClose,
  onDone,
}: {
  id: string
  onClose: () => void
  onDone: () => void
}) {
  const { t } = useTranslation('equipment')
  const navigate = useNavigate()
  const form = useForm<CloneForm>({
    resolver: zodResolver(cloneSchema),
    defaultValues: { code: '', name: '', serial: '' },
  })
  const save = useMutation({
    mutationFn: (values: CloneForm) =>
      api.cloneEquipment(id, {
        code: values.code || undefined,
        name: values.name || undefined,
        serial: values.serial || undefined,
      }),
    onSuccess: (created) => {
      toast.success(t('cloneDialog.done'))
      onDone()
      onClose()
      navigate(`/equipment/${created.id}`)
    },
    onError: (e) => toast.error(messageFor(e)),
  })
  return (
    <FormDialog
      open
      onOpenChange={(value) => !value && onClose()}
      title={t('cloneDialog.title')}
      form={form}
      submitting={save.isPending}
      submitLabel={t('cloneDialog.submit')}
      onSubmit={(values) => save.mutate(values)}
    >
      <TextField
        control={form.control}
        name="code"
        label={t('cloneDialog.code')}
        placeholder={t('cloneDialog.codePlaceholder')}
      />
      <TextField control={form.control} name="name" label={t('cloneDialog.name')} />
      <TextField control={form.control} name="serial" label={t('cloneDialog.serial')} />
    </FormDialog>
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
  const { t } = useTranslation('equipment')
  const qc = useQueryClient()
  const form = useForm<TransferForm>({
    resolver: zodResolver(transferSchema),
    defaultValues: { toDepartmentId: '', toLocation: '', reason: '' },
  })
  const save = useMutation({
    mutationFn: (values: TransferForm) =>
      api.createTransfer(id, {
        toDepartmentId: values.toDepartmentId,
        toLocation: values.toLocation || null,
        reason: values.reason,
      }),
    onSuccess: () => {
      toast.success(t('transfers.saved'))
      void qc.invalidateQueries({ queryKey: transferKeys.all })
      onDone()
      onClose()
    },
    onError: (e) => toast.error(messageFor(e)),
  })
  return (
    <FormDialog
      open
      onOpenChange={(value) => !value && onClose()}
      title={t('actions.transfer')}
      form={form}
      submitting={save.isPending}
      submitLabel={t('actions.create')}
      onSubmit={(values) => save.mutate(values)}
    >
      <AsyncSelectField
        control={form.control}
        name="toDepartmentId"
        label={t('transfers.toDepartment')}
        queryKey="departments"
        loadOptions={departmentOptions}
        resolveOption={resolveDepartment}
        clearable
      />
      <TextField control={form.control} name="toLocation" label={t('transfers.toLocation')} />
      <TextField control={form.control} name="reason" label={t('transfers.reason')} />
    </FormDialog>
  )
}
