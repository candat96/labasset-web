import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { DetailLayout } from '@/components/detail-layout'
import { ErrorState } from '@/components/page/ErrorState'
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
  if (detail.isPending) return <p role="status">{t('loading')}</p>
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
                {t('actions.changeStatus')}
              </Button>
            )}
            {canWrite && (
              <Button variant="outline" onClick={() => setTransferOpen(true)}>
                {t('actions.transfer')}
              </Button>
            )}
            {canWrite && (
              <Button asChild variant="outline">
                <Link to={`/equipment/${id}/edit`}>{t('common:actions.edit')}</Link>
              </Button>
            )}
            {canWrite && (
              <Button variant="outline" onClick={() => setCloneOpen(true)}>
                {t('actions.clone')}
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to={assistantPath({ equipmentId: id })}>{t('actions.askAi')}</Link>
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
              {t('actions.print')}
            </Button>
            {isAdm && (
              <Button
                variant="outline"
                onClick={() => void run(t('confirm.rotate'), () => api.rotateQr(id))}
              >
                {t('actions.rotateQr')}
              </Button>
            )}
            {isAdm && (status === 'retired' || status === 'disposed') && (
              <Button
                variant="destructive"
                onClick={() =>
                  void run(
                    t('confirm.delete'),
                    async () => {
                      await api.deleteEquipment(id)
                      navigate('/equipment')
                    },
                    true,
                  )
                }
              >
                {t('common:actions.delete')}
              </Button>
            )}
          </>
        }
        information={
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">{t('fields.department')}</dt>
              <dd>{row.department?.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('fields.location')}</dt>
              <dd>{row.location ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('info.accessories')}</dt>
              <dd>{row.counts.accessories}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('info.componentsDue')}</dt>
              <dd>{row.counts.componentsDue}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('info.openRepairs')}</dt>
              <dd>{row.counts.openRepairs}</dd>
            </div>
          </dl>
        }
        tabs={[
          { value: 'overview', label: t('tabs.overview'), content: <Overview row={row} /> },
          {
            value: 'network',
            label: t('tabs.network'),
            content: <NetworkTab id={id} canWrite={canWrite} />,
          },
          {
            value: 'accessories',
            label: t('tabs.accessories'),
            content: <AccessoriesTab id={id} canWrite={canWrite} />,
          },
          {
            value: 'software',
            label: t('tabs.software'),
            content: <SoftwareTab id={id} canWrite={canWrite} />,
          },
          {
            value: 'components',
            label: t('tabs.components'),
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
            label: t('tabs.supplies'),
            content: <SuppliesTab id={id} canWrite={canWrite} />,
          },
          {
            value: 'counters',
            label: t('tabs.counters'),
            content: <CountersTab id={id} canWrite={canWrite} />,
          },
          {
            value: 'docs',
            label: t('tabs.docs'),
            content: <AttachmentsPanel entityType="equipment" entityId={id} kinds={kinds} />,
          },
          { value: 'repairs', label: t('tabs.repairs'), content: <RepairsTab id={id} /> },
          {
            value: 'maintenance',
            label: t('tabs.maintenance'),
            content: <MaintenanceTab id={id} />,
          },
          {
            value: 'transfers',
            label: t('tabs.transfers'),
            content: (
              <TransfersTab
                id={id}
                canWrite={canWrite}
                isAdm={isAdm}
                userId={userId}
                userNames={userNames}
                departmentNames={departmentNames}
                onCreate={() => setTransferOpen(true)}
              />
            ),
          },
          {
            value: 'timeline',
            label: t('tabs.timeline'),
            content: <TimelineTab id={id} userNames={userNames} />,
          },
          {
            value: 'audit',
            label: t('tabs.audit'),
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
  const fields: [string, string][] = [
    [t('fields.assetCode'), row.assetCode ?? '—'],
    [t('fields.model'), row.model ?? '—'],
    [t('fields.serial'), row.serial ?? '—'],
    [t('fields.manufacturer'), row.manufacturer?.name ?? '—'],
    [t('fields.supplierShort'), row.supplier?.name ?? '—'],
    [t('fields.fundingSource'), row.fundingSource?.name ?? '—'],
    [t('fields.group'), row.group?.name ?? '—'],
    [t('fields.countryOfOrigin'), row.countryOfOrigin ?? '—'],
    [t('fields.manufactureYearShort'), row.manufactureYear ? String(row.manufactureYear) : '—'],
    [t('fields.receivedAt'), formatDate(row.receivedAt) || '—'],
    [t('fields.commissionedAt'), formatDate(row.commissionedAt) || '—'],
    [t('fields.originalValue'), formatVnd(row.originalValue) || '—'],
    [
      t('fields.warranty'),
      row.warrantyUntil
        ? `${formatDate(row.warrantyUntil)} · ${warrantyLeft ? t('fields.inWarranty') : t('fields.outWarranty')}`
        : '—',
    ],
    [t('fields.purchaseContractNo'), row.purchaseContractNo ?? '—'],
    [t('fields.decisionNo'), row.decisionNo ?? '—'],
    [t('fields.department'), row.department?.name ?? '—'],
    [t('fields.location'), row.location ?? '—'],
    [t('fields.deptContact'), row.deptContact?.fullName ?? '—'],
    [t('fields.staffInCharge'), row.staffInCharge?.fullName ?? '—'],
    [t('fields.testTypes'), row.testTypes.length ? row.testTypes.join(', ') : '—'],
    [
      t('fields.throughputPerHour'),
      row.throughputPerHour == null ? '—' : formatNumber(row.throughputPerHour),
    ],
    [t('fields.currentRunHours'), formatQty(row.currentRunHours) || '0'],
    [t('fields.currentTestCount'), formatNumber(row.currentTestCount)],
    [t('fields.nextMaintenanceAt'), formatDate(row.nextMaintenanceAt) || '—'],
    [t('fields.lastMaintenanceAt'), formatDate(row.lastMaintenanceAt) || '—'],
    [t('fields.nextCalibrationAt'), formatDate(row.nextCalibrationAt) || '—'],
    [t('fields.lastCalibrationAt'), formatDate(row.lastCalibrationAt) || '—'],
    [t('fields.notes'), row.notes ?? '—'],
    [t('fields.statusNote'), row.statusNote ?? '—'],
    [t('fields.voltage'), row.specs?.voltage ?? '—'],
    [t('fields.power'), row.specs?.power ?? '—'],
    [t('fields.dimensions'), row.specs?.dimensions ?? '—'],
    [t('fields.weight'), row.specs?.weight ?? '—'],
    [t('fields.envTemp'), row.specs?.env?.temp ?? '—'],
    [t('fields.envHumidity'), row.specs?.env?.humidity ?? '—'],
    [t('fields.envUps'), row.specs?.env?.ups ?? '—'],
    [t('fields.envWater'), row.specs?.env?.water ?? '—'],
    [t('fields.envGas'), row.specs?.env?.gas ?? '—'],
    [t('fields.createdAt'), formatDateTime(row.createdAt)],
    [t('fields.updatedAt'), formatDateTime(row.updatedAt)],
  ]
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      {fields.map(([k, v]) => (
        <div key={k}>
          <dt className="text-xs text-muted-foreground">{k}</dt>
          <dd
            className={
              k === t('fields.warranty') && row.warrantyUntil && !warrantyLeft
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
    <Form {...form}>
      <form
        className="grid max-w-xl gap-4 sm:grid-cols-2"
        onSubmit={form.handleSubmit(() => save.mutate())}
      >
        <TextField control={form.control} name="ip" label={t('network.ip')} disabled={!canWrite} />
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
          <Button type="submit" disabled={save.isPending}>
            {t('actions.saveNetwork')}
          </Button>
        )}
      </form>
    </Form>
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
  if (list.isPending) return <p role="status">{t('accessories.loading')}</p>
  if (list.error) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />
  return (
    <div>
      {dialog}
      {canWrite && (
        <Button className="mb-3" onClick={openCreate}>
          {t('actions.addAccessory')}
        </Button>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>{t('accessories.code')}</th>
            <th>{t('accessories.name')}</th>
            <th>{t('accessories.type')}</th>
            <th>{t('accessories.quantity')}</th>
            <th>{t('accessories.condition')}</th>
            <th>{t('accessories.replacedAt')}</th>
            <th>{t('accessories.notes')}</th>
            {canWrite && <th>{tc('actions.more')}</th>}
          </tr>
        </thead>
        <tbody>
          {list.data.map((row) => (
            <tr key={row.id} className="border-t">
              <td>{row.code ?? '—'}</td>
              <td>{row.name}</td>
              <td>{t(`accessories.types.${row.type}`)}</td>
              <td>{row.quantity}</td>
              <td>
                <StatusBadge value={row.condition} map={accessoryConditionMap} />
              </td>
              <td>{formatDate(row.replacedAt) || '—'}</td>
              <td>{row.notes ?? '—'}</td>
              {canWrite && (
                <td className="whitespace-nowrap">
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
                </td>
              )}
            </tr>
          ))}
          {list.data.length === 0 && (
            <tr>
              <td colSpan={8} className="text-muted-foreground py-3">
                {t('accessories.empty')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
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
    </div>
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
  if (list.isPending) return <p role="status">{t('software.loading')}</p>
  if (list.error) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />
  return (
    <div>
      {dialog}
      {canWrite && (
        <Button className="mb-3" onClick={openCreate}>
          {t('actions.addSoftware')}
        </Button>
      )}
      {key && (
        <p className="bg-muted mb-2 rounded p-2 font-mono text-sm">
          {key}{' '}
          <Button size="sm" onClick={() => void navigator.clipboard.writeText(key)}>
            {t('actions.copy')}
          </Button>
        </p>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>{t('software.name')}</th>
            <th>{t('software.version')}</th>
            <th>{t('software.updatedOn')}</th>
            <th>{t('software.licenseExpiresAt')}</th>
            <th>{t('software.notes')}</th>
            {canWrite && <th>{tc('actions.more')}</th>}
          </tr>
        </thead>
        <tbody>
          {list.data.map((row) => (
            <tr key={row.id} className="border-t">
              <td>{row.name}</td>
              <td>{row.version ?? '—'}</td>
              <td>{formatDate(row.updatedOn) || '—'}</td>
              <td
                className={
                  row.licenseExpiresAt && new Date(row.licenseExpiresAt) < new Date()
                    ? 'text-destructive'
                    : undefined
                }
              >
                {formatDate(row.licenseExpiresAt) || '—'}
              </td>
              <td>{row.notes ?? '—'}</td>
              {canWrite && (
                <td className="whitespace-nowrap">
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
                </td>
              )}
            </tr>
          ))}
          {list.data.length === 0 && (
            <tr>
              <td colSpan={6} className="text-muted-foreground py-3">
                {t('software.empty')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
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
    </div>
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
            <div key={item.id} className="rounded border p-2">
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
  if (list.isPending) return <p role="status">{t('components.loading')}</p>
  if (list.error) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />
  return (
    <div>
      {dialog}
      {canWrite && (
        <Button className="mb-3" onClick={openCreate}>
          {t('actions.addComponent')}
        </Button>
      )}
      <ul className="space-y-3">
        {list.data.map((row) => {
          const pct = api.usedPct(row, { currentRunHours: hours, currentTestCount: tests })
          const bar = Math.min(100, Math.round(pct * 100))
          const color = bar >= 100 ? 'bg-destructive' : bar >= 80 ? 'bg-warning' : 'bg-success'
          return (
            <li key={row.id} className="rounded border p-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{row.name}</span>
                <StatusBadge value={row.status} map={componentStatusMap} />
              </div>
              <dl className="text-muted-foreground mt-2 grid gap-2 text-xs sm:grid-cols-3">
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
              <div className="bg-muted mt-2 h-2 rounded">
                <div
                  data-testid={`usedpct-${row.id}`}
                  className={`h-2 rounded ${color}`}
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
          <li className="text-muted-foreground">{t('components.empty')}</li>
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
    </div>
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
            <div key={item.id} className="rounded border p-2">
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
  if (list.isPending) return <p role="status">{t('supplies.loading')}</p>
  if (list.error) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />
  return (
    <div className="space-y-3">
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
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th>{t('supplies.supply')}</th>
                <th>{t('supplies.normPerDay')}</th>
                <th>{t('supplies.normPerTest')}</th>
                <th>{t('supplies.primary')}</th>
                <th>{t('supplies.runway')}</th>
                {canWrite && <th>{tc('actions.more')}</th>}
              </tr>
            </thead>
            <tbody>
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
                  <tr key={row.supplyId} className="border-t align-top">
                    <td className="py-2">{nameOf(row.supplyId)}</td>
                    <td>
                      <QtyField
                        control={form.control}
                        name={`rows.${index}.normQtyPerDay`}
                        label={t('supplies.normPerDay')}
                        disabled={!canWrite}
                      />
                    </td>
                    <td>
                      <QtyField
                        control={form.control}
                        name={`rows.${index}.normQtyPerTest`}
                        label={t('supplies.normPerTest')}
                        disabled={!canWrite}
                      />
                    </td>
                    <td>
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
                    </td>
                    <td className={tone}>
                      {days == null
                        ? '—'
                        : `${t('supplies.days', { days: formatNumber(days) })} (${t(`supplies.runwayBasis.${run?.basis ?? 'unknown'}`)})`}
                    </td>
                    {canWrite && (
                      <td>
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
                      </td>
                    )}
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-muted-foreground py-3">
                    {t('supplies.empty')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {canWrite && (
            <Button className="mt-3" type="submit" disabled={save.isPending}>
              {t('actions.saveSupplies')}
            </Button>
          )}
        </form>
      </Form>
    </div>
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
  if (list.isPending) return <p role="status">{t('counters.loading')}</p>
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
    <div>
      {canWrite && (
        <Button
          className="mb-3"
          onClick={() => {
            form.reset({ recordedAt: '', runHours: '', testCount: '', note: '' })
            setOpen(true)
          }}
        >
          {t('actions.recordCounter')}
        </Button>
      )}
      <div className="mb-3 max-w-lg space-y-1">
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
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>{t('counters.recordedAt')}</th>
            <th>{t('counters.runHours')}</th>
            <th>{t('counters.testCount')}</th>
            <th>{t('counters.source')}</th>
            <th>{t('counters.note')}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((row) => (
            <tr key={row.id} className="border-t">
              <td>{formatDateTime(row.recordedAt)}</td>
              <td>{formatQty(row.runHours) || '—'}</td>
              <td>{row.testCount ?? '—'}</td>
              <td>{row.source}</td>
              <td>{row.note ?? '—'}</td>
            </tr>
          ))}
          {points.length === 0 && (
            <tr>
              <td colSpan={5} className="text-muted-foreground py-3">
                {t('counters.empty')}
              </td>
            </tr>
          )}
        </tbody>
      </table>
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
    </div>
  )
}

function RepairsTab({ id }: { id: string }) {
  const { t } = useTranslation('equipment')
  const list = useQuery({
    queryKey: equipmentKeys.repairs(id),
    queryFn: () => api.listRepairsForEquipment(id),
  })
  if (list.isPending) return <p role="status">{t('repairs.loading')}</p>
  if (list.error) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />
  return (
    <ul className="space-y-2 text-sm">
      {list.data.items.map((row) => (
        <li key={row.id} className="flex flex-wrap items-center gap-2">
          <Link className="text-primary hover:underline" to={`/repairs/${row.id}`}>
            {row.code}
          </Link>
          <StatusBadge value={row.status} map={repairStatusMap} />
          <span className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</span>
          <span>{row.assignee?.fullName ?? '—'}</span>
        </li>
      ))}
      {list.data.items.length === 0 && (
        <li className="text-muted-foreground">{t('repairs.empty')}</li>
      )}
    </ul>
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
  return (
    <div className="grid gap-4 text-sm sm:grid-cols-2">
      <div>
        <h3 className="mb-2 font-medium">{t('maintenance.tasks')}</h3>
        {tasks.isPending && <p role="status">{t('maintenance.loading')}</p>}
        {tasks.error && <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} />}
        <ul className="space-y-2">
          {(tasks.data?.items ?? []).map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-2">
              <Link className="text-primary hover:underline" to={`/maintenance/tasks/${row.id}`}>
                {row.code}
              </Link>
              <StatusBadge value={row.status} map={taskStatusMap} />
              <span className="text-xs text-muted-foreground">{formatDate(row.dueAt)}</span>
            </li>
          ))}
          {tasks.data && tasks.data.items.length === 0 && (
            <li className="text-muted-foreground">{t('maintenance.emptyTasks')}</li>
          )}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 font-medium">{t('maintenance.calibrations')}</h3>
        {cals.isPending && <p role="status">{t('maintenance.loading')}</p>}
        {cals.error && <ErrorState error={cals.error} onRetry={() => void cals.refetch()} />}
        <ul className="space-y-2">
          {(cals.data ?? []).map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-2">
              <Link className="text-primary hover:underline" to={`/calibrations/${row.id}`}>
                {row.code}
              </Link>
              <StatusBadge value={row.status} map={calibrationStatusMap} />
              {row.result && <StatusBadge value={row.result} map={calibrationResultMap} />}
              <span className="text-xs text-muted-foreground">
                {formatDate(row.performedAt) || '—'}
              </span>
            </li>
          ))}
          {cals.data && cals.data.length === 0 && (
            <li className="text-muted-foreground">{t('maintenance.emptyCalibrations')}</li>
          )}
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
  if (list.isPending) return <p role="status">{t('transfers.loading')}</p>
  if (list.error) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />
  const departmentName = (departmentId: string | null) =>
    departmentId ? (departmentNames.get(departmentId) ?? shortId(departmentId)) : '—'
  const userName = (value: string | null) =>
    value ? (userNames.get(value) ?? shortId(value)) : '—'
  return (
    <div>
      {dialog}
      {canWrite && (
        <Button className="mb-3" onClick={onCreate}>
          {t('transfers.create')}
        </Button>
      )}
      <ul className="space-y-2 text-sm">
        {list.data.items.map((row) => (
          <li key={row.id} className="rounded border p-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge value={row.status} map={transferStatusMap} />
              <span>
                {departmentName(row.fromDepartmentId)} → {departmentName(row.toDepartmentId)}
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
          <li className="text-muted-foreground">{t('transfers.empty')}</li>
        )}
      </ul>
    </div>
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-52">
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
      <div className="flex gap-2">
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
        <p role="status">{t('timeline.loading')}</p>
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
