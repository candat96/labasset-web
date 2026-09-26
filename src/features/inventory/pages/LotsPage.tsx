import { useMemo } from 'react'
import { Link } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
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
import { catalogOptions, supplyOptions } from '@/api/references'
import { listLots, openLot } from '../api'
import { useTranslation } from 'react-i18next'

type Lot = {
  id: string
  lotNo?: string
  supplyId: string
  supplyName?: string
  warehouseName?: string
  expiresAt?: string | null
  qtyOnHand?: string
  status?: string
}

export function Component() {
  const { t } = useTranslation('inventory')

  const canWrite = useCan(STAFF)
  const qc = useQueryClient()
  const table = useServerTable({
    filterKeys: ['supplyId', 'warehouseId', 'status', 'expiringWithinDays'],
  })
  const f = table.params.filters
  const params = {
    page: table.params.page,
    limit: table.params.limit,
    q: table.params.q || undefined,
    supplyId: f.supplyId,
    warehouseId: f.warehouseId,
    status: f.status,
    expiringWithinDays: f.expiringWithinDays ? Number(f.expiringWithinDays) : undefined,
  }
  const list = useQuery({
    queryKey: ['stock', 'lots', params],
    queryFn: () => listLots(params),
    placeholderData: (p) => p,
  })
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
    </>
  )
}
