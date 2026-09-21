import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar, FilterField } from '@/components/filter-bar'
import { PageHeader } from '@/components/page/PageHeader'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
      { accessorKey: 'code', header: t('code') },
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
      <PageHeader
        title={t('balancesTitle')}
        description={t('balancesHint', {
          defaultValue: 'Tồn theo vật tư và kho; bật "Dưới tồn min" để lọc mặt hàng cần nhập thêm.',
        })}
      />
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t('stockValue')}
          value={formatVnd(totalValue) || '—'}
          icon={<Coins />}
          tone="info"
        />
        <KpiCard
          title={t('balanceRows', { defaultValue: 'Mặt hàng có tồn' })}
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
          title={t('warehouseCount', { defaultValue: 'Kho' })}
          value={warehouses.data?.length ?? '—'}
          icon={<Warehouse />}
          tone="neutral"
        />
      </div>
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
        toolbarLeft={
          <FilterBar>
            <FilterField label={t('searchBalance')}>
              <Input
                aria-label={t('searchBalance')}
                value={table.inputQ}
                onChange={(e) => table.setQ(e.target.value)}
              />
            </FilterField>
            <FilterField label={t('belowMin')}>
              <div className="flex h-9 items-center">
                <Switch
                  id="belowMin"
                  checked={f.belowMin === 'true'}
                  onCheckedChange={(on) => table.setFilter('belowMin', on ? 'true' : undefined)}
                  aria-label={t('belowMin')}
                />
              </div>
            </FilterField>
          </FilterBar>
        }
      />
    </>
  )
}
