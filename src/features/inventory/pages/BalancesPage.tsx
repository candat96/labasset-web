import { useMemo, useState } from 'react'
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
import { formatNumber, formatQty } from '@/lib/format/number'
import { KpiCard } from '@/components/kpi-card'
import { catalogOptions } from '@/api/references'
import { runReport, type ReportRunResult } from '@/features/reports/api'
import { AlertTriangle, Boxes, Coins, Layers, RefreshCcw, Target, Warehouse } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LotsOfBalanceDialog } from '../components/LotsOfBalanceDialog'
import { listBalances, stockValue } from '../api'
import type { Balance } from '../types'
import { useTranslation } from 'react-i18next'

type LotsTarget = {
  supplyId: string
  supplyName: string
  warehouseId: string
  warehouseName: string
}

export function Component() {
  const { t } = useTranslation('inventory')
  const [lotsOf, setLotsOf] = useState<LotsTarget | null>(null)

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
  // Hai chỉ số báo cáo kỳ hiện tại (mặc định là 30 ngày gần nhất của API).
  const turnoverKpi = useQuery({
    queryKey: ['stock', 'kpi', 'turnover'],
    queryFn: async () =>
      (await runReport('stock.turnover', {}, 'json', 1, 1000)) as ReportRunResult,
    staleTime: 300_000,
  })
  const accuracyKpi = useQuery({
    queryKey: ['stock', 'kpi', 'count-accuracy'],
    queryFn: async () =>
      (await runReport('stock.count-accuracy', {}, 'json', 1, 1000)) as ReportRunResult,
    staleTime: 300_000,
  })
  const turnoverValue = useMemo(() => {
    let outValue = 0
    let avgValue = 0
    for (const row of turnoverKpi.data?.rows ?? []) {
      outValue += Number(row.outValue ?? 0)
      avgValue += Number(row.avgValue ?? 0)
    }
    return avgValue > 0 ? formatNumber(outValue / avgValue, 2) : '—'
  }, [turnoverKpi.data])
  const accuracyValue = useMemo(() => {
    let totalLines = 0
    let matchedLines = 0
    for (const row of accuracyKpi.data?.rows ?? []) {
      totalLines += Number(row.totalLines ?? 0)
      matchedLines += Number(row.matchedLines ?? 0)
    }
    return totalLines > 0 ? `${formatNumber((matchedLines / totalLines) * 100, 1)}%` : '—'
  }, [accuracyKpi.data])
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
      {
        id: 'lots',
        header: '',
        // Một dòng tồn kho gộp nhiều lô hạn dùng khác nhau; mở ngay tại chỗ thay vì
        // bắt người dùng sang màn Lô rồi tự lọc lại theo vật tư và kho.
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setLotsOf({
                supplyId: row.original.supplyId,
                supplyName: row.original.name,
                warehouseId: row.original.warehouseId,
                warehouseName:
                  warehouseNames.get(row.original.warehouseId) ?? row.original.warehouseId,
              })
            }
          >
            <Layers aria-hidden /> {t('viewLots')}
          </Button>
        ),
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
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
        <Link to="/reports?key=stock.turnover" className="block" aria-label={t('turnover')}>
          <KpiCard
            title={t('turnover')}
            value={turnoverValue}
            description={t('currentPeriod')}
            icon={<RefreshCcw />}
            tone="info"
          />
        </Link>
        <Link
          to="/reports?key=stock.count-accuracy"
          className="block"
          aria-label={t('countAccuracy')}
        >
          <KpiCard
            title={t('countAccuracy')}
            value={accuracyValue}
            description={t('currentPeriod')}
            icon={<Target />}
            tone="success"
          />
        </Link>
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
      {lotsOf && (
        <LotsOfBalanceDialog
          supplyId={lotsOf.supplyId}
          supplyName={lotsOf.supplyName}
          warehouseId={lotsOf.warehouseId}
          warehouseName={lotsOf.warehouseName}
          onClose={() => setLotsOf(null)}
        />
      )}
    </>
  )
}
