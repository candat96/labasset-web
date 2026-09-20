import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar } from '@/components/filter-bar'
import { PageHeader } from '@/components/page/PageHeader'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { formatVnd } from '@/lib/format/money'
import { formatQty } from '@/lib/format/number'
import { KpiCard } from '@/components/kpi-card'
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
  const columns = useMemo<ColumnDef<Balance>[]>(
    () => [
      { accessorKey: 'code', header: t('code') },
      { accessorKey: 'name', header: t('name') },
      { accessorKey: 'warehouseId', header: t('warehouse') },
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
    [t],
  )
  const totalValue =
    value.data && typeof value.data === 'object' && 'total' in value.data
      ? String((value.data as { total?: string }).total ?? '')
      : ''
  return (
    <>
      <PageHeader title={t('balancesTitle')} />
      <div className="mb-3">
        <KpiCard title={t('stockValue')} value={formatVnd(totalValue) || '—'} />
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
            <Input
              aria-label={t('searchBalance')}
              value={table.inputQ}
              onChange={(e) => table.setQ(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <Switch
                id="belowMin"
                checked={f.belowMin === 'true'}
                onCheckedChange={(on) => table.setFilter('belowMin', on ? 'true' : undefined)}
              />
              <Label htmlFor="belowMin">{t('belowMin')}</Label>
            </div>
          </FilterBar>
        }
      />
    </>
  )
}
