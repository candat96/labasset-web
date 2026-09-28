import { useState } from 'react'
import Big from 'big.js'
import { differenceInCalendarDays, isValid, parseISO } from 'date-fns'
import { Link, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { PageMeta } from '@/components/page/PageHeader'
import { DetailLayout } from '@/components/detail-layout'
import { SectionCard } from '@/components/page/SectionCard'
import { DataList } from '@/components/page/DataList'
import { DetailSkeleton } from '@/components/page/DetailSkeleton'
import { EmptyState } from '@/components/page/EmptyState'
import { KpiCard } from '@/components/kpi-card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ErrorState } from '@/components/page/ErrorState'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/page/ConfirmDialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AsyncSelect } from '@/components/form/async-select'
import {
  Boxes,
  CalendarRange,
  CircleAlert,
  Layers,
  Microscope,
  Package,
  PackageSearch,
  Plus,
  Tag,
  Trash2,
  TrendingDown,
} from 'lucide-react'
import { formatQty } from '@/lib/format/number'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { commonStatusMap, lotStatusMap } from '@/lib/status-maps'
import { formatVnd } from '@/lib/format/money'
import { formatDate } from '@/lib/format/date'
import { useCan } from '@/app/guards/useCan'
import { ADM, STAFF } from '@/routes/roles'
import { api, unwrap, unwrapAs } from '@/api/client'
import { applyServerErrors, messageFor } from '@/api/errors'
import { FormDialog } from '@/components/form/FormDialog'
import { QtyField } from '@/components/form/qty-field'
import { TextField } from '@/components/form/fields'
import { catalogOptions, supplyOptions } from '@/api/references'
import { decimalString } from '@/lib/validation/decimal'
import {
  addSupplySubstitute,
  adjustStock,
  exportSupplyCard,
  getSupply,
  getSupplyStock,
  getSupplySubstitutes,
  openLot,
  removeSupplySubstitute,
  type SupplySubstitute,
} from '../api'
import { useTranslation } from 'react-i18next'
import i18n from '@/lib/i18n'

interface CardRow {
  id?: string
  at?: string
  createdAt?: string
  type?: string
  documentCode?: string
  quantityIn?: string
  quantityOut?: string
  balanceAfter?: string
  unitCost?: string
}

const adjustSchema = z.object({
  lotId: z.string().min(1),
  newQty: decimalString({ maxScale: 3, min: '0' }),
  reason: z.string().trim().min(1, i18n.t('common:form.required')).max(2000),
})
type AdjustValues = z.infer<typeof adjustSchema>

/** Mức cảnh báo hiệu lực: đã qua → đỏ, còn ≤ 60 ngày → vàng. */
function expiryLevel(value?: string | null): { level: 'danger' | 'warning'; days: number } | null {
  if (!value) return null
  const date = parseISO(value)
  if (!isValid(date)) return null
  const days = differenceInCalendarDays(date, new Date())
  if (days < 0) return { level: 'danger', days }
  if (days <= 60) return { level: 'warning', days }
  return null
}

/**
 * Khối vật tư thay thế: danh sách (đọc hai chiều từ API), thêm bằng autocomplete
 * vật tư, xoá có xác nhận. Quan hệ lưu một chiều nên chỉ hiện vật tư còn lại.
 */
function SubstitutesSection({ supplyId, canWrite }: { supplyId: string; canWrite: boolean }) {
  const { t } = useTranslation('inventory')
  const qc = useQueryClient()
  const [chosen, setChosen] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [removing, setRemoving] = useState<SupplySubstitute | null>(null)
  const [saving, setSaving] = useState(false)
  const query = useQuery({
    queryKey: ['supplies', supplyId, 'substitutes'],
    queryFn: () => getSupplySubstitutes(supplyId),
    enabled: !!supplyId,
  })
  const rows = query.data ?? []
  const excluded = new Set([supplyId, ...rows.map((row) => row.id)])
  const invalidate = () => qc.invalidateQueries({ queryKey: ['supplies', supplyId, 'substitutes'] })
  const add = async () => {
    if (!chosen) return
    setSaving(true)
    try {
      await addSupplySubstitute(supplyId, { substituteId: chosen, notes: notes || null })
      toast.success(t('substituteAdded'))
      setChosen(null)
      setNotes('')
      void invalidate()
    } catch (error) {
      toast.error(messageFor(error))
    } finally {
      setSaving(false)
    }
  }
  const remove = async () => {
    if (!removing) return
    setSaving(true)
    try {
      await removeSupplySubstitute(supplyId, removing.id)
      toast.success(t('substituteRemoved'))
      setRemoving(null)
      void invalidate()
    } catch (error) {
      toast.error(messageFor(error))
    } finally {
      setSaving(false)
    }
  }
  return (
    <SectionCard
      title={t('substitutesSection')}
      description={t('substituteHint')}
      flush={rows.length > 0}
    >
      {canWrite && (
        <div className="flex flex-col gap-3 px-5 pt-1 pb-4 sm:flex-row sm:items-end">
          <AsyncSelect
            className="flex-1"
            label={t('substitute')}
            queryKey="supply-substitutes"
            loadOptions={(q) =>
              supplyOptions(q).then((list) => list.filter((option) => !excluded.has(option.id)))
            }
            value={chosen}
            onChange={(value) => setChosen(typeof value === 'string' ? value : null)}
            clearable
            disabled={saving}
          />
          <div className="space-y-1.5 sm:w-64">
            <Label htmlFor="substitute-notes">{t('substituteNotes')}</Label>
            <Input
              id="substitute-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <Button type="button" disabled={!chosen || saving} onClick={() => void add()}>
            <Plus className="size-4" /> {t('addSubstitute')}
          </Button>
        </div>
      )}
      {query.error ? (
        <div className="px-5 pb-5">
          <ErrorState error={query.error} onRetry={() => void query.refetch()} />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={PackageSearch} title={t('noSubstitutes')} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">{t('code')}</TableHead>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{t('unit')}</TableHead>
              <TableHead>{t('notes')}</TableHead>
              {canWrite && <TableHead className="pr-5 text-right" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="pl-5 font-mono text-[13px]">
                  <Link className="text-primary hover:underline" to={`/supplies/${item.id}`}>
                    {item.code}
                  </Link>
                </TableCell>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.unitName ?? <span className="text-subtle">—</span>}</TableCell>
                <TableCell>{item.notes ?? <span className="text-subtle">—</span>}</TableCell>
                {canWrite && (
                  <TableCell className="pr-5 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      aria-label={t('removeSubstitute')}
                      onClick={() => setRemoving(item)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={t('removeSubstitute')}
        description={t('removeSubstituteConfirm')}
        confirmLabel={t('delete')}
        destructive
        loading={saving}
        onConfirm={() => void remove()}
      />
    </SectionCard>
  )
}

export function Component() {
  const { t } = useTranslation('inventory')
  const { id = '' } = useParams()
  const canWrite = useCan(STAFF)
  const isAdm = useCan(ADM)
  const [adjusting, setAdjusting] = useState(false)
  const adjustForm = useForm<AdjustValues>({
    resolver: zodResolver(adjustSchema),
    defaultValues: { lotId: '', newQty: '0', reason: '' },
  })
  const qc = useQueryClient()
  const detail = useQuery({
    queryKey: ['supplies', id],
    queryFn: () => getSupply(id),
    enabled: !!id,
  })
  const stock = useQuery({
    queryKey: ['supplies', id, 'stock'],
    queryFn: () => getSupplyStock(id),
    enabled: !!id,
  })
  const card = useQuery({
    queryKey: ['supplies', id, 'card'],
    queryFn: () =>
      unwrapAs<{ opening?: string; closing?: string; items?: CardRow[] }>(
        api.GET('/v1/supplies/{id}/card', { params: { path: { id }, query: {} } }),
      ),
    enabled: !!id,
  })
  const equipment = useQuery({
    queryKey: ['supplies', id, 'equipment'],
    queryFn: () => unwrap(api.GET('/v1/supplies/{id}/equipment', { params: { path: { id } } })),
    enabled: !!id,
  })
  const forecast = useQuery({
    queryKey: ['stock', 'forecast', id],
    queryFn: () => unwrap(api.GET('/v1/stock/forecast', { params: { query: { supplyId: id } } })),
    enabled: !!id,
  })
  const warehouses = useQuery({
    queryKey: ['catalog-options', 'warehouses'],
    queryFn: () => catalogOptions('warehouses', ''),
  })
  const warehouseNames = new Map((warehouses.data ?? []).map((option) => [option.id, option.name]))
  const units = useQuery({
    queryKey: ['reference', 'units', ''],
    queryFn: () => catalogOptions('units', ''),
  })
  const unitName = (unitId: string | null) =>
    units.data?.find((unit) => unit.id === unitId)?.name ?? null
  if (detail.isPending) return <DetailSkeleton label={t('loadingSupply')} />
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data
  const lots = stock.data?.lots ?? []
  const compatible = equipment.data ?? []
  const sumLots = (key: 'qtyOnHand' | 'qtyReserved' | 'available') =>
    lots.reduce((acc, lot) => acc.plus(lot[key] ?? '0'), new Big(0)).toString()
  const dash = <span className="text-subtle">—</span>
  const expiryBadge = (value: string | null) => {
    const status = expiryLevel(value)
    if (!status) return null
    return (
      <Badge variant={status.level === 'danger' ? 'danger' : 'warning'} dot>
        {status.level === 'danger' ? t('expiredOn') : t('expiringSoon', { days: status.days })}
      </Badge>
    )
  }
  const dateValue = (value: string | null) =>
    value ? (
      <span className="inline-flex flex-wrap items-center gap-2">
        {formatDate(value)}
        {expiryBadge(value)}
      </span>
    ) : null
  const purchaseUnitName = unitName(row.purchaseUnitId)
  const usageUnitName = unitName(row.unitId)
  const conversionText =
    row.conversionFactor && purchaseUnitName && usageUnitName
      ? t('conversionPreview', {
          purchaseUnit: purchaseUnitName,
          factor: row.conversionFactor,
          unit: usageUnitName,
        })
      : undefined
  const circulationExpiry = expiryLevel(row.circulationValidTo)
  const bidExpiry = expiryLevel(row.bidValidTo)
  const stockTab = stock.error ? (
    <ErrorState error={stock.error} onRetry={() => void stock.refetch()} />
  ) : (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t('onHand')}
          value={formatQty(sumLots('qtyOnHand'))}
          icon={<Boxes />}
          tone="info"
        />
        <KpiCard
          title={t('reserved')}
          value={formatQty(sumLots('qtyReserved'))}
          icon={<Layers />}
          tone="warning"
        />
        <KpiCard
          title={t('available')}
          value={formatQty(sumLots('available'))}
          icon={<Package />}
          tone="success"
        />
        <KpiCard
          title={t('reorderPoint')}
          value={
            forecast.data
              ? forecast.data.reorderPoint
                ? formatQty(forecast.data.reorderPoint)
                : '—'
              : '—'
          }
          description={t('reorderPointHint')}
          icon={<PackageSearch />}
          tone="neutral"
        />
      </div>
      <SectionCard title={t('stockByLot')} description={t('lotCount', { n: lots.length })} flush>
        {lots.length === 0 ? (
          <EmptyState icon={Boxes} title={t('noLots')} />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">{t('warehouse')}</TableHead>
                <TableHead>{t('lot')}</TableHead>
                <TableHead className="text-right">{t('onHand')}</TableHead>
                <TableHead className="text-right">{t('reserved')}</TableHead>
                <TableHead className="text-right">{t('available')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead className="pr-5" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lots.map((lot) => (
                <TableRow key={lot.id}>
                  <TableCell className="pl-5 font-medium">
                    {lot.warehouseId
                      ? (warehouseNames.get(lot.warehouseId) ?? lot.warehouseId.slice(0, 8))
                      : dash}
                  </TableCell>
                  <TableCell>{lot.lotNo ?? dash}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQty(lot.qtyOnHand ?? '0')}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatQty(lot.qtyReserved ?? '0')}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatQty(lot.available ?? '0')}
                  </TableCell>
                  <TableCell>
                    <StatusBadge value={lot.status ?? 'available'} map={lotStatusMap} />
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <div className="flex justify-end gap-1.5">
                      {canWrite && row.openVialDays && lot.status === 'available' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            try {
                              await openLot(lot.id)
                              toast.success(t('lotOpened'))
                              void qc.invalidateQueries({ queryKey: ['supplies', id, 'stock'] })
                            } catch (error) {
                              toast.error(messageFor(error))
                            }
                          }}
                        >
                          {t('openLot')}
                        </Button>
                      )}
                      {isAdm && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            adjustForm.reset({
                              lotId: lot.id,
                              newQty: lot.qtyOnHand ?? '0',
                              reason: '',
                            })
                            setAdjusting(true)
                          }}
                        >
                          {t('adjust')}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </>
  )
  const cardRows = card.data?.items ?? []
  const cardTab = card.error ? (
    <ErrorState error={card.error} onRetry={() => void card.refetch()} />
  ) : (
    <SectionCard
      title={t('stockCard')}
      description={`${t('openingBalance')}: ${formatQty(card.data?.opening ?? '0')} · ${t('closingBalance')}: ${formatQty(card.data?.closing ?? '0')}`}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportSupplyCard(id).catch((error) => toast.error(messageFor(error)))}
        >
          {t('exportExcel')}
        </Button>
      }
      flush
    >
      {cardRows.length === 0 ? (
        <EmptyState icon={CalendarRange} title={t('noCardRows')} />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-5">{t('date')}</TableHead>
              <TableHead>{t('document')}</TableHead>
              <TableHead className="text-right">{t('in')}</TableHead>
              <TableHead className="text-right">{t('out')}</TableHead>
              <TableHead className="text-right">{t('balance')}</TableHead>
              <TableHead className="pr-5 text-right">{t('unitCost')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cardRows.map((item, index) => (
              <TableRow key={item.id ?? index}>
                <TableCell className="pl-5 tabular-nums">
                  {formatDate(item.at ?? item.createdAt)}
                </TableCell>
                <TableCell className="font-medium">
                  {item.documentCode ?? item.type ?? dash}
                </TableCell>
                <TableCell className="text-success text-right tabular-nums">
                  {item.quantityIn ? `+${formatQty(item.quantityIn)}` : dash}
                </TableCell>
                <TableCell className="text-destructive text-right tabular-nums">
                  {item.quantityOut ? `−${formatQty(item.quantityOut)}` : dash}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">
                  {item.balanceAfter ? formatQty(item.balanceAfter) : dash}
                </TableCell>
                <TableCell className="pr-5 text-right tabular-nums">
                  {formatVnd(item.unitCost) || dash}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SectionCard>
  )
  const equipmentTab = (
    <SectionCard title={t('compatibleEquipment')} flush={compatible.length > 0}>
      {compatible.length === 0 ? (
        <EmptyState icon={Microscope} title={t('noCompatibleEquipment')} />
      ) : (
        <ul className="divide-divider divide-y">
          {compatible.map((item) => (
            <li key={item.id}>
              <Link
                className="hover:bg-muted/60 flex items-center gap-3 px-5 py-3 transition-colors"
                to={`/equipment/${item.id}`}
              >
                <span className="bg-primary-soft text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
                  <Microscope className="size-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-semibold">{item.code}</span>
                  <span className="text-muted-foreground block truncate text-[13px]">
                    {item.name}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  )
  const forecastTab = forecast.error ? (
    <ErrorState error={forecast.error} onRetry={() => void forecast.refetch()} />
  ) : (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        title={t('avg30')}
        value={forecast.data ? formatQty(forecast.data.avg30) : '—'}
        icon={<TrendingDown />}
        tone="info"
      />
      <KpiCard
        title={t('avg90')}
        value={forecast.data ? formatQty(forecast.data.avg90) : '—'}
        icon={<TrendingDown />}
        tone="info"
      />
      <KpiCard
        title={t('dailyUsage')}
        value={forecast.data ? formatQty(forecast.data.dailyUsage) : '—'}
        icon={<CalendarRange />}
        tone="neutral"
      />
      <KpiCard
        title={t('daysLeft')}
        value={forecast.data?.daysLeft ?? '—'}
        icon={<Package />}
        tone={
          forecast.data?.daysLeft == null
            ? 'neutral'
            : forecast.data.daysLeft < 7
              ? 'danger'
              : forecast.data.daysLeft < 30
                ? 'warning'
                : 'success'
        }
      />
    </div>
  )
  const profileTab = (
    <div className="space-y-4">
      <SectionCard title={t('legalSection')}>
        <DataList
          columns={2}
          items={[
            { label: t('circulationNumber'), value: row.circulationNumber },
            { label: t('circulationValidTo'), value: dateValue(row.circulationValidTo) },
            {
              label: t('riskClass'),
              value: row.riskClass ? t(`riskClass${row.riskClass}`) : null,
            },
            { label: t('countryOfOrigin'), value: row.countryOfOrigin },
          ]}
        />
      </SectionCard>
      <SectionCard title={t('insuranceSection')}>
        <DataList
          columns={2}
          items={[
            { label: t('insuranceCode'), value: row.insuranceCode },
            { label: t('insuranceName'), value: row.insuranceName },
            {
              label: t('insuranceRate'),
              value: row.insuranceRate ? `${row.insuranceRate}%` : null,
            },
            {
              label: t('insurancePrice'),
              value: row.insurancePrice ? formatVnd(row.insurancePrice) : null,
            },
          ]}
        />
      </SectionCard>
      <SectionCard title={t('bidSection')}>
        <DataList
          columns={2}
          items={[
            { label: t('bidPackage'), value: row.bidPackage },
            { label: t('bidDecisionNo'), value: row.bidDecisionNo },
            { label: t('bidPrice'), value: row.bidPrice ? formatVnd(row.bidPrice) : null },
            { label: t('bidValidTo'), value: dateValue(row.bidValidTo) },
          ]}
        />
      </SectionCard>
      <SectionCard title={t('conversionSection')} description={conversionText}>
        <DataList
          columns={2}
          items={[
            { label: t('purchaseUnit'), value: purchaseUnitName },
            { label: t('conversionFactor'), value: row.conversionFactor },
          ]}
        />
      </SectionCard>
      <SectionCard title={t('shelfLifeSection')}>
        <DataList
          columns={2}
          items={[
            {
              label: t('minShelfLifeDays'),
              value: row.minShelfLifeDays == null ? null : `${row.minShelfLifeDays} ${t('days')}`,
            },
          ]}
        />
      </SectionCard>
      <SubstitutesSection supplyId={id} canWrite={canWrite} />
    </div>
  )
  return (
    <>
      <FormDialog
        open={adjusting}
        onOpenChange={setAdjusting}
        title={t('adjustStock')}
        form={adjustForm}
        onSubmit={async (values) => {
          try {
            await adjustStock(values)
            toast.success(t('stockAdjusted'))
            setAdjusting(false)
            void qc.invalidateQueries({ queryKey: ['supplies', id, 'stock'] })
            void qc.invalidateQueries({ queryKey: ['supplies', id, 'card'] })
            void qc.invalidateQueries({ queryKey: ['stock', 'balances'] })
            void qc.invalidateQueries({ queryKey: ['stock', 'lots'] })
          } catch (error) {
            if (!applyServerErrors(adjustForm, error)) toast.error(messageFor(error))
          }
        }}
      >
        <QtyField control={adjustForm.control} name="newQty" label={t('newQty')} />
        <TextField control={adjustForm.control} name="reason" label={t('reason')} />
      </FormDialog>
      <DetailLayout
        eyebrow={t('suppliesTitle')}
        code={row.code}
        name={row.name}
        badge={<StatusBadge value={row.isActive ? 'active' : 'inactive'} map={commonStatusMap} />}
        meta={
          <>
            <PageMeta icon={<Tag />}>{row.code}</PageMeta>
            {row.packaging && <PageMeta icon={<Package />}>{row.packaging}</PageMeta>}
            {row.refPrice && <PageMeta icon={<Boxes />}>{formatVnd(row.refPrice)}</PageMeta>}
          </>
        }
        actions={
          canWrite && (
            <Button asChild>
              <Link to={`/supplies/${id}/edit`}>{t('edit')}</Link>
            </Button>
          )
        }
        information={
          <>
            <h2 className="mb-3 text-[15px] leading-6 font-semibold">{t('info')}</h2>
            <DataList
              columns={1}
              items={[
                { label: t('refPrice'), value: formatVnd(row.refPrice) || null },
                { label: t('packaging'), value: row.packaging },
                {
                  label: t('manufacturerCode'),
                  value: row.manufacturerCode,
                },
                {
                  label: t('trackLotExpiry'),
                  value: `${row.trackLot ? t('lot') : t('no')} / ${row.trackExpiry ? t('expiry') : t('no')}`,
                },
                { label: t('minStock'), value: row.minStock ? formatQty(row.minStock) : null },
                { label: t('maxStock'), value: row.maxStock ? formatQty(row.maxStock) : null },
                {
                  label: t('leadTimeDays'),
                  value: row.leadTimeDays == null ? null : `${row.leadTimeDays} ${t('days')}`,
                },
                { label: t('openVialDays'), value: row.openVialDays },
                { label: t('storageCondition'), value: row.storageCondition },
                { label: t('notes'), value: row.notes, full: true },
              ]}
            />
            {(circulationExpiry || bidExpiry) && (
              <div className="mt-4 space-y-2">
                {circulationExpiry && (
                  <Alert
                    variant={circulationExpiry.level === 'danger' ? 'destructive' : 'warning'}
                    data-tone={circulationExpiry.level}
                  >
                    <CircleAlert />
                    <AlertTitle>{t('circulationValidTo')}</AlertTitle>
                    <AlertDescription>
                      {circulationExpiry.level === 'danger'
                        ? t('expiredOn')
                        : t('expiringSoon', { days: circulationExpiry.days })}{' '}
                      · {formatDate(row.circulationValidTo)}
                    </AlertDescription>
                  </Alert>
                )}
                {bidExpiry && (
                  <Alert
                    variant={bidExpiry.level === 'danger' ? 'destructive' : 'warning'}
                    data-tone={bidExpiry.level}
                  >
                    <CircleAlert />
                    <AlertTitle>{t('bidValidTo')}</AlertTitle>
                    <AlertDescription>
                      {bidExpiry.level === 'danger'
                        ? t('expiredOn')
                        : t('expiringSoon', { days: bidExpiry.days })}{' '}
                      · {formatDate(row.bidValidTo)}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </>
        }
        tabs={[
          { value: 'profile', label: t('supplyProfile'), content: profileTab },
          { value: 'stock', label: t('stockByLot'), content: stockTab, count: lots.length },
          { value: 'card', label: t('stockCard'), content: cardTab },
          {
            value: 'equipment',
            label: t('compatibleEquipment'),
            content: equipmentTab,
            count: compatible.length,
          },
          { value: 'forecast', label: t('forecast'), content: forecastTab },
        ]}
      />
    </>
  )
}
