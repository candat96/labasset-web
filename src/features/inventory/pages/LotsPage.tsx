import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar } from '@/components/filter-bar'
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
      { accessorKey: 'lotNo', header: t('lot') },
      {
        accessorKey: 'expiresAt',
        header: t('expiry'),
        cell: ({ row }) => {
          const exp = row.original.expiresAt
          const overdue = !!exp && exp < new Date().toISOString()
          return (
            <span className={overdue ? 'text-destructive' : undefined}>
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
      <PageHeader
        title={t('lotsTitle')}
        actions={
          <Button variant="outline" onClick={() => table.setFilter('expiringWithinDays', '30')}>
            {t('expiring30')}
          </Button>
        }
      />
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
          <FilterBar>
            <Input
              aria-label={t('searchLot')}
              value={table.inputQ}
              onChange={(e) => table.setQ(e.target.value)}
              placeholder={t('searchLot')}
            />
          </FilterBar>
        }
      />
    </>
  )
}
