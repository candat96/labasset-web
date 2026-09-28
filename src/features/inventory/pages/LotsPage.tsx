import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { MapPin } from 'lucide-react'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterPreset } from '@/components/filter-bar'
import { FilterPanel, FilterPanelField } from '@/components/page/FilterPanel'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AsyncSelect } from '@/components/form/async-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/status-badge'
import { lotStatusMap } from '@/lib/status-maps'
import { formatDate } from '@/lib/format/date'
import { formatQty } from '@/lib/format/number'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { messageFor } from '@/api/errors'
import {
  catalogOptions,
  resolveStorageLocation,
  storageLocationOptions,
  supplyOptions,
} from '@/api/references'
import { listLots, openLot } from '../api'
import { MoveLotDialog, type MoveLotTarget } from '../components/MoveLotDialog'
import { useTranslation } from 'react-i18next'

type Lot = {
  id: string
  lotNo?: string
  supplyId: string
  supplyName?: string
  warehouseId?: string | null
  warehouseName?: string
  locationId?: string | null
  locationCode?: string | null
  locationName?: string | null
  expiresAt?: string | null
  qtyOnHand?: string
  status?: string
}

export function Component() {
  const { t } = useTranslation('inventory')

  const canWrite = useCan(STAFF)
  const qc = useQueryClient()
  const table = useServerTable({
    filterKeys: ['supplyId', 'warehouseId', 'locationId', 'status', 'expiringWithinDays'],
  })
  const f = table.params.filters
  const params = {
    page: table.params.page,
    limit: table.params.limit,
    q: table.params.q || undefined,
    supplyId: f.supplyId,
    warehouseId: f.warehouseId,
    locationId: f.locationId,
    status: f.status,
    expiringWithinDays: f.expiringWithinDays ? Number(f.expiringWithinDays) : undefined,
  }
  const list = useQuery({
    queryKey: ['stock', 'lots', params],
    queryFn: () => listLots(params),
    placeholderData: (p) => p,
  })
  const [moving, setMoving] = useState<MoveLotTarget | undefined>()
  const columns = useMemo<ColumnDef<Lot>[]>(
    () => [
      {
        accessorKey: 'lotNo',
        header: t('lot'),
        meta: { label: t('lot'), className: 'sticky left-0 z-[1] bg-card' },
        cell: ({ row }) => (
          <Link
            className="text-primary font-mono text-xs"
            to={`/supplies/${row.original.supplyId}`}
          >
            {row.original.lotNo ?? '—'}
          </Link>
        ),
      },
      { accessorKey: 'supplyName', header: t('supply') },
      { accessorKey: 'warehouseName', header: t('warehouse') },
      {
        id: 'locationId',
        header: t('location'),
        cell: ({ row }) => {
          const { locationCode, locationName } = row.original
          if (!locationCode && !locationName) return '—'
          return (
            <span className="inline-flex items-center gap-1">
              <MapPin className="text-muted-foreground size-3 shrink-0" aria-hidden />
              <span className="font-mono text-xs">{locationCode ?? '—'}</span>
              {locationName && (
                <span className="text-muted-foreground text-xs">{locationName}</span>
              )}
            </span>
          )
        },
      },
      {
        accessorKey: 'expiresAt',
        header: t('expiry'),
        cell: ({ row }) => {
          const exp = row.original.expiresAt
          const expiry = exp ? new Date(exp).getTime() : Number.POSITIVE_INFINITY
          const days = (expiry - Date.now()) / 86_400_000
          const overdue = days < 0
          return (
            <span className={overdue ? 'text-destructive' : days < 30 ? 'text-warning' : undefined}>
              {formatDate(exp) || '—'}
            </span>
          )
        },
      },
      {
        accessorKey: 'qtyOnHand',
        header: t('qty'),
        cell: ({ getValue }) => formatQty(String(getValue() ?? '')),
      },
      {
        accessorKey: 'status',
        header: t('status'),
        cell: ({ row }) => <StatusBadge value={row.original.status ?? ''} map={lotStatusMap} />,
      },
      {
        id: 'actions',
        header: '',
        enableHiding: false,
        cell: ({ row }) =>
          canWrite ? (
            <div className="flex justify-end gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={(event) => {
                  event.stopPropagation()
                  setMoving({
                    id: row.original.id,
                    lotNo: row.original.lotNo,
                    warehouseId: row.original.warehouseId ?? null,
                  })
                }}
              >
                <MapPin aria-hidden />
                {t('moveLocation')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async (event) => {
                  event.stopPropagation()
                  try {
                    await openLot(row.original.id)
                    toast.success(t('lotOpened'))
                    void qc.invalidateQueries({ queryKey: ['stock', 'lots'] })
                  } catch (error) {
                    toast.error(messageFor(error))
                  }
                }}
              >
                {t('openLot')}
              </Button>
            </div>
          ) : null,
      },
    ],
    [canWrite, qc, t],
  )
  return (
    <>
      <PageHeader title={t('lotsTitle')} description={t('lotsHint')} />
      <FilterPanel
        storageKey="stock-lots"
        onReset={table.reset}
        activeFilters={[
          ...(f.supplyId
            ? [
                {
                  key: 'supplyId',
                  label: t('supply'),
                  onRemove: () => table.setFilter('supplyId', undefined),
                },
              ]
            : []),
          ...(f.warehouseId
            ? [
                {
                  key: 'warehouseId',
                  label: t('warehouse'),
                  onRemove: () => table.setFilter('warehouseId', undefined),
                },
              ]
            : []),
          ...(f.locationId
            ? [
                {
                  key: 'locationId',
                  label: t('location'),
                  onRemove: () => table.setFilter('locationId', undefined),
                },
              ]
            : []),
          ...(f.status
            ? [
                {
                  key: 'status',
                  label: lotStatusMap[f.status]?.label ?? f.status,
                  onRemove: () => table.setFilter('status', undefined),
                },
              ]
            : []),
          ...(f.expiringWithinDays
            ? [
                {
                  key: 'expiringWithinDays',
                  label: `${f.expiringWithinDays} ${t('days')}`,
                  onRemove: () => table.setFilter('expiringWithinDays', undefined),
                },
              ]
            : []),
        ]}
        fields={
          <>
            <FilterPanelField label={t('supply')}>
              <AsyncSelect
                label={t('supply')}
                queryKey="supplies"
                loadOptions={supplyOptions}
                value={f.supplyId ?? null}
                onChange={(value) =>
                  table.setFilter('supplyId', typeof value === 'string' ? value : undefined)
                }
                clearable
                showLabel={false}
              />
            </FilterPanelField>
            <FilterPanelField label={t('warehouse')}>
              <AsyncSelect
                label={t('warehouse')}
                queryKey="warehouses"
                loadOptions={(q) => catalogOptions('warehouses', q)}
                value={f.warehouseId ?? null}
                onChange={(value) =>
                  table.setFilter('warehouseId', typeof value === 'string' ? value : undefined)
                }
                clearable
                showLabel={false}
              />
            </FilterPanelField>
            <FilterPanelField label={t('location')}>
              <AsyncSelect
                label={t('location')}
                queryKey={`storage-locations-filter-${f.warehouseId ?? 'all'}`}
                loadOptions={(q) => storageLocationOptions(f.warehouseId, q)}
                resolveOption={resolveStorageLocation}
                value={f.locationId ?? null}
                onChange={(value) =>
                  table.setFilter('locationId', typeof value === 'string' ? value : undefined)
                }
                clearable
                showLabel={false}
              />
            </FilterPanelField>
            <FilterPanelField label={t('status')}>
              <Select
                value={f.status ?? '__all__'}
                onValueChange={(value) =>
                  table.setFilter('status', value === '__all__' ? undefined : value)
                }
              >
                <SelectTrigger aria-label={t('status')} className="w-full">
                  <SelectValue placeholder={t('status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t('common:all')}</SelectItem>
                  {Object.entries(lotStatusMap).map(([value, entry]) => (
                    <SelectItem key={value} value={value}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterPanelField>
          </>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              aria-label={t('searchLot')}
              value={table.inputQ}
              onChange={(e) => table.setQ(e.target.value)}
              placeholder={t('searchLot')}
              className="h-9 w-56"
            />
            {[30, 60, 90].map((days) => (
              <FilterPreset
                key={days}
                active={f.expiringWithinDays === String(days)}
                onClick={() =>
                  table.setFilter(
                    'expiringWithinDays',
                    f.expiringWithinDays === String(days) ? undefined : String(days),
                  )
                }
              >
                {days} {t('days')}
              </FilterPreset>
            ))}
          </div>
        }
      >
        <DataTable
          tableId="stock-lots"
          columns={columns}
          data={(list.data as { items?: Lot[] } | undefined)?.items}
          total={(list.data as { total?: number } | undefined)?.total ?? 0}
          params={table.params}
          onPageChange={table.setPage}
          onLimitChange={table.setLimit}
          isLoading={list.isPending}
          error={list.error}
          onRetry={() => void list.refetch()}
          getRowId={(row) => row.id}
        />
      </FilterPanel>
      <MoveLotDialog
        lot={moving}
        open={!!moving}
        onOpenChange={(open) => {
          if (!open) setMoving(undefined)
        }}
      />
    </>
  )
}
