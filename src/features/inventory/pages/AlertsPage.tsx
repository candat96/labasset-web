import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar, FilterPreset } from '@/components/filter-bar'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { alertTypeMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { messageFor } from '@/api/errors'
import { listAlerts, resolveAlert } from '../api'
import { useTranslation } from 'react-i18next'

type AlertRow = {
  id: string
  type: string
  message?: string
  supplyId?: string
  supplyName?: string
  warehouseName?: string
  lotNo?: string
  severity?: string
  createdAt?: string
  resolvedAt?: string | null
}

export function Component() {
  const { t } = useTranslation('inventory')

  const canWrite = useCan(STAFF)
  const qc = useQueryClient()
  const table = useServerTable({ filterKeys: ['type', 'resolved', 'warehouseId'] })
  const resolved = table.params.filters.resolved === 'true'
  const list = useQuery({
    queryKey: ['stock', 'alerts', table.params],
    queryFn: () =>
      listAlerts({
        page: table.params.page,
        limit: table.params.limit,
        type: table.params.filters.type,
        warehouseId: table.params.filters.warehouseId,
        resolved,
      }),
    placeholderData: (p) => p,
  })
  const columns = useMemo<ColumnDef<AlertRow>[]>(
    () => [
      {
        accessorKey: 'type',
        header: t('type'),
        cell: ({ row }) => <StatusBadge value={row.original.type} map={alertTypeMap} />,
      },
      { accessorKey: 'supplyName', header: t('supply') },
      { accessorKey: 'warehouseName', header: t('warehouse') },
      { accessorKey: 'lotNo', header: t('lot') },
      { accessorKey: 'severity', header: t('severity') },
      { accessorKey: 'message', header: t('message') },
      {
        accessorKey: 'createdAt',
        header: t('createdAt'),
        cell: ({ getValue }) => formatDateTime(getValue<string | undefined>()),
      },
      {
        id: 'resolve',
        header: '',
        cell: ({ row }) =>
          canWrite && row.original.type === 'stale' && !row.original.resolvedAt ? (
            <Button
              size="sm"
              onClick={async () => {
                try {
                  await resolveAlert(row.original.id)
                  toast.success(t('resolved'))
                  void qc.invalidateQueries({ queryKey: ['stock', 'alerts'] })
                } catch (error) {
                  toast.error(messageFor(error))
                }
              }}
            >
              {t('resolveAlert')}
            </Button>
          ) : null,
      },
    ],
    [canWrite, qc, t],
  )
  return (
    <>
      <PageHeader title={t('alertsTitle')} />
      <DataTable
        tableId="stock-alerts"
        columns={columns}
        data={(list.data as { items?: AlertRow[] } | undefined)?.items}
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
                <FilterPreset
                  active={!resolved}
                  onClick={() => table.setFilter('resolved', undefined)}
                >
                  {t('openAlerts')}
                </FilterPreset>
                <FilterPreset active={resolved} onClick={() => table.setFilter('resolved', 'true')}>
                  {t('resolved')}
                </FilterPreset>
              </>
            }
          >
            {null}
          </FilterBar>
        }
      />
    </>
  )
}
