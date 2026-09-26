import { alertSeverityLabels, enumLabel } from '@/lib/enum-labels'
import { useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterPreset } from '@/components/filter-bar'
import { FilterPanel, FilterPanelField } from '@/components/page/FilterPanel'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
      {
        accessorKey: 'severity',
        header: t('severity'),
        cell: ({ row }) => enumLabel(alertSeverityLabels, row.original.severity),
      },
      { accessorKey: 'message', header: t('message') },
      {
        accessorKey: 'createdAt',
        header: t('createdAt'),
        cell: ({ getValue }) => formatDateTime(getValue<string | undefined>()),
      },
      {
        id: 'resolve',
        header: '',
        enableHiding: false,
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
  const activeFilters = [
    ...(table.params.filters.type
      ? [
          {
            key: 'type',
            label: alertTypeMap[table.params.filters.type]?.label ?? table.params.filters.type,
            onRemove: () => table.setFilter('type', undefined),
          },
        ]
      : []),
    ...(resolved
      ? [
          {
            key: 'resolved',
            label: t('resolved'),
            onRemove: () => table.setFilter('resolved', undefined),
          },
        ]
      : []),
  ]
  return (
    <>
      <PageHeader title={t('alertsTitle')} description={t('alertsHint')} />
      <FilterPanel
        storageKey="stock-alerts"
        onReset={table.reset}
        activeFilters={activeFilters}
        fields={
          <FilterPanelField label={t('type')}>
            <Select
              value={table.params.filters.type ?? '__all__'}
              onValueChange={(value) =>
                table.setFilter('type', value === '__all__' ? undefined : value)
              }
            >
              <SelectTrigger aria-label={t('type')} className="w-full">
                <SelectValue placeholder={t('type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t('common:all')}</SelectItem>
                {Object.entries(alertTypeMap).map(([value, entry]) => (
                  <SelectItem key={value} value={value}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterPanelField>
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <FilterPreset active={!resolved} onClick={() => table.setFilter('resolved', undefined)}>
              {t('openAlerts')}
            </FilterPreset>
            <FilterPreset active={resolved} onClick={() => table.setFilter('resolved', 'true')}>
              {t('resolved')}
            </FilterPreset>
          </div>
        }
      >
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
        />
      </FilterPanel>
    </>
  )
}
