import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/status-badge'
import { commonStatusMap } from '@/lib/status-maps'
import { formatVnd } from '@/lib/format/money'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { messageFor } from '@/api/errors'
import { asSupplyPage, exportSupplies, listSupplies } from '../api'
import type { Supply } from '../types'

export function Component() {
  const canWrite = useCan(STAFF)
  const navigate = useNavigate()
  const table = useServerTable({
    filterKeys: ['groupId', 'manufacturerId', 'isActive', 'trackLot'],
  })
  const f = table.params.filters
  const params = {
    page: table.params.page,
    limit: table.params.limit,
    q: table.params.q || undefined,
    isActive: f.isActive === undefined ? undefined : f.isActive === 'true',
  }
  const list = useQuery({
    queryKey: ['supplies', params],
    queryFn: async () => asSupplyPage(await listSupplies(params)),
    placeholderData: (p) => p,
  })
  const columns = useMemo<ColumnDef<Supply>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã',
        cell: ({ row }) => (
          <Link
            className="text-primary font-mono text-xs hover:underline"
            to={`/supplies/${row.original.id}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      { accessorKey: 'name', header: 'Tên' },
      {
        accessorKey: 'trackLot',
        header: 'Theo lô',
        cell: ({ row }) => (row.original.trackLot ? 'Lô' : '—'),
      },
      {
        accessorKey: 'minStock',
        header: 'Tồn min',
      },
      {
        accessorKey: 'refPrice',
        header: 'Giá',
        cell: ({ getValue }) => formatVnd(getValue<string | null>()),
      },
      {
        accessorKey: 'isActive',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <StatusBadge
            value={row.original.isActive ? 'active' : 'inactive'}
            map={commonStatusMap}
          />
        ),
      },
    ],
    [],
  )
  return (
    <>
      <PageHeader
        title="Danh mục vật tư"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => exportSupplies().catch((e) => toast.error(messageFor(e)))}
            >
              Xuất Excel
            </Button>
            {canWrite && (
              <Button asChild>
                <Link to="/supplies/new">Thêm vật tư</Link>
              </Button>
            )}
          </div>
        }
      />
      <DataTable
        tableId="supplies"
        columns={columns}
        data={list.data?.items}
        total={list.data?.total ?? 0}
        params={table.params}
        onPageChange={table.setPage}
        onLimitChange={table.setLimit}
        isLoading={list.isPending}
        error={list.error}
        onRetry={() => void list.refetch()}
        getRowId={(row) => row.id}
        onRowClick={(row) => navigate(`/supplies/${row.id}`)}
        toolbarLeft={
          <Input
            aria-label="Tìm vật tư"
            value={table.inputQ}
            onChange={(e) => table.setQ(e.target.value)}
          />
        }
      />
    </>
  )
}
