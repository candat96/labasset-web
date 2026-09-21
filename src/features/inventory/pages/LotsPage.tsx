import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar, FilterField, FilterPreset } from '@/components/filter-bar'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/status-badge'
import { lotStatusMap } from '@/lib/status-maps'
import { formatDate } from '@/lib/format/date'
import { formatQty } from '@/lib/format/number'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { messageFor } from '@/api/errors'
import { listLots, openLot } from '../api'
import { useTranslation } from 'react-i18next'

type Lot = {
  id: string
  lotNo?: string
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
      { accessorKey: 'supplyName', header: t('supply') },
      { accessorKey: 'warehouseName', header: t('warehouse') },
      { accessorKey: 'lotNo', header: t('lot') },
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
      <PageHeader title={t('lotsTitle')} />
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
        toolbarLeft={
          <FilterBar
            presets={
              <>
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
              </>
            }
          >
            <FilterField label={t('searchLot')}>
              <Input
                aria-label={t('searchLot')}
                value={table.inputQ}
                onChange={(e) => table.setQ(e.target.value)}
                placeholder={t('searchLot')}
              />
            </FilterField>
          </FilterBar>
        }
      />
    </>
  )
}
