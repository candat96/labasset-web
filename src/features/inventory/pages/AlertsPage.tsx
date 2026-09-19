import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { alertTypeMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { messageFor } from '@/api/errors'
import { listAlerts, resolveAlert } from '../api'

type AlertRow = {
  id: string
  type: string
  message?: string
  supplyId?: string
  createdAt?: string
  resolvedAt?: string | null
}

export function Component() {
  const canWrite = useCan(STAFF)
  const table = useServerTable({ filterKeys: ['type', 'resolved', 'warehouseId'] })
  const resolved = table.params.filters.resolved === 'true'
  const list = useQuery({
    queryKey: ['stock', 'alerts', table.params],
    queryFn: () =>
      listAlerts({
        page: table.params.page,
        limit: table.params.limit,
        type: table.params.filters.type,
        resolved,
      }),
    placeholderData: (p) => p,
  })
  const columns = useMemo<ColumnDef<AlertRow>[]>(
    () => [
      {
        accessorKey: 'type',
        header: 'Loại',
        cell: ({ row }) => <StatusBadge value={row.original.type} map={alertTypeMap} />,
      },
      { accessorKey: 'message', header: 'Thông điệp' },
      {
        accessorKey: 'createdAt',
        header: 'Tạo lúc',
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
                  toast.success('Đã xử lý')
                  void list.refetch()
                } catch (error) {
                  toast.error(messageFor(error))
                }
              }}
            >
              Đánh dấu đã xử lý
            </Button>
          ) : null,
      },
    ],
    [canWrite, list],
  )
  return (
    <>
      <PageHeader
        title="Cảnh báo kho"
        actions={
          <div className="flex gap-2">
            <Button
              variant={resolved ? 'outline' : 'default'}
              onClick={() => table.setFilter('resolved', undefined)}
            >
              Đang mở
            </Button>
            <Button
              variant={resolved ? 'default' : 'outline'}
              onClick={() => table.setFilter('resolved', 'true')}
            >
              Đã xử lý
            </Button>
          </div>
        }
      />
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
    </>
  )
}
