import { useMemo } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterPreset } from '@/components/filter-bar'
import { FilterPanel, FilterPanelField } from '@/components/page/FilterPanel'
import { PageHeader } from '@/components/page/PageHeader'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { AsyncSelect } from '@/components/form/async-select'
import { formatVnd } from '@/lib/format/money'
import { formatQty } from '@/lib/format/number'
import { KpiCard } from '@/components/kpi-card'
import { catalogOptions } from '@/api/references'
import { AlertTriangle, Boxes, Coins, Warehouse } from 'lucide-react'
import { listBalances, stockValue } from '../api'
import type { Balance } from '../types'
import { useTranslation } from 'react-i18next'

export function Component() {
  const { t } = useTranslation('inventory')

  const table = useServerTable({ filterKeys: ['warehouseId', 'groupId', 'belowMin'] })
  const f = table.params.filters
  const params = {
    page: table.params.page,
    limit: table.params.limit,
    q: table.params.q || undefined,
    warehouseId: f.warehouseId,
    belowMin: f.belowMin === 'true' ? true : undefined,
  }
  const list = useQuery({
    queryKey: ['stock', 'balances', params],
    queryFn: () => listBalances(params),
    placeholderData: (p) => p,
  })
  const value = useQuery({
    queryKey: ['stock', 'value', f.warehouseId],
    queryFn: () => stockValue(f.warehouseId),
  })
  const belowMin = useQuery({
    queryKey: ['stock', 'balances', 'below-min', f.warehouseId],
    queryFn: () => listBalances({ page: 1, limit: 1, warehouseId: f.warehouseId, belowMin: true }),
  })
  const warehouses = useQuery({
    queryKey: ['catalog-options', 'warehouses'],
    queryFn: () => catalogOptions('warehouses', ''),
  })
  const warehouseNames = useMemo(
    () => new Map((warehouses.data ?? []).map((w) => [w.id, w.name])),
    [warehouses.data],
  )
  const columns = useMemo<ColumnDef<Balance>[]>(
    () => [
      {
        accessorKey: 'code',
        header: t('code'),
        meta: { label: t('code'), className: 'sticky left-0 z-[1] bg-card' },
        cell: ({ row }) => (
          <Link
            className="text-primary font-mono text-xs"
            to={`/supplies/${row.original.supplyId}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      { accessorKey: 'name', header: t('name') },
      {
        accessorKey: 'warehouseId',
        header: t('warehouse'),
        cell: ({ row }) => warehouseNames.get(row.original.warehouseId) ?? row.original.warehouseId,
      },
      {
        accessorKey: 'qtyOnHand',
        header: t('qty'),
        cell: ({ row }) => formatQty(row.original.qtyOnHand),
      },
      {
        accessorKey: 'value',
        header: t('value'),
        cell: ({ getValue }) => formatVnd(String(getValue() ?? '')),
      },
    ],
    [t, warehouseNames],
  )
  const totalValue =
    value.data && typeof value.data === 'object' && 'value' in value.data
      ? String((value.data as { value?: string }).value ?? '')
      : ''
  return (
    <>
      <PageHeader title={t('balancesTitle')} description={t('balancesHint')} />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t('stockValue')}
          value={formatVnd(totalValue) || '—'}
          icon={<Coins />}
          tone="info"
        />
        <KpiCard
          title={t('balanceRows')}
          value={list.data?.total ?? '—'}
          icon={<Boxes />}
          tone="neutral"
        />
        <KpiCard
          title={t('belowMin')}
          value={belowMin.data?.total ?? '—'}
          icon={<AlertTriangle />}
          tone="warning"
        />
        <KpiCard
          title={t('warehouseCount')}
          value={warehouses.data?.length ?? '—'}
          icon={<Warehouse />}
          tone="neutral"
        />
      </div>
      <FilterPanel
        storageKey="stock-balances"
        onReset={table.reset}
        activeFilters={[
          ...(f.warehouseId
            ? [
                {
                  key: 'warehouseId',
                  label: warehouseNames.get(f.warehouseId) ?? f.warehouseId,
                  onRemove: () => table.setFilter('warehouseId', undefined),
                },
              ]
            : []),
          ...(f.belowMin === 'true'
            ? [
                {
                  key: 'belowMin',
                  label: t('belowMin'),
                  onRemove: () => table.setFilter('belowMin', undefined),
                },
              ]
            : []),
        ]}
        fields={
          <>
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
            <FilterPanelField label={t('belowMin')}>
              <div className="flex h-11 items-center">
                <Switch
                  id="belowMin"
                  checked={f.belowMin === 'true'}
                  onCheckedChange={(on) => table.setFilter('belowMin', on ? 'true' : undefined)}
                  aria-label={t('belowMin')}
                />
              </div>
            </FilterPanelField>
          </>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Input
              aria-label={t('searchBalance')}
              placeholder={t('searchBalance')}
              value={table.inputQ}
              onChange={(e) => table.setQ(e.target.value)}
              className="h-9 w-56"
            />
            <FilterPreset
              active={f.belowMin === 'true'}
              onClick={() =>
                table.setFilter('belowMin', f.belowMin === 'true' ? undefined : 'true')
              }
            >
              {t('belowMin')}
            </FilterPreset>
          </div>
        }
      >
        <DataTable
          tableId="stock-balances"
          columns={columns}
          data={list.data?.items}
          total={list.data?.total ?? 0}
          params={table.params}
          onPageChange={table.setPage}
          onLimitChange={table.setLimit}
          isLoading={list.isPending}
          error={list.error}
          onRetry={() => void list.refetch()}
        />
      </FilterPanel>
    </>
  )
}
