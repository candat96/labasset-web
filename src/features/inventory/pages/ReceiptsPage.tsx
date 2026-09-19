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
import { qcStatusMap, stockDocStatusMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { formatVnd } from '@/lib/format/money'
import { useCan } from '@/app/guards/useCan'
import { ADM, STAFF } from '@/routes/roles'
import { useConfirm } from '@/components/confirm-dialog'
import { messageFor } from '@/api/errors'
import { listReceipts, postReceipt } from '../api'
import type { Receipt } from '../types'

export function Component() {
  const canWrite = useCan(STAFF)
  const isAdm = useCan(ADM)
  const navigate = useNavigate()
  const table = useServerTable({
    filterKeys: ['status', 'type', 'warehouseId', 'qcStatus', 'from', 'to'],
  })
  const f = table.params.filters
  const params = {
    page: table.params.page,
    limit: table.params.limit,
    q: table.params.q || undefined,
    status: f.status,
    type: f.type,
    qcStatus: f.qcStatus,
    from: f.from,
    to: f.to,
  }
  const list = useQuery({
    queryKey: ['stock', 'receipts', params],
    queryFn: () => listReceipts(params),
    placeholderData: (p) => p,
  })
  const { confirm, dialog } = useConfirm()
  const columns = useMemo<ColumnDef<Receipt>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã',
        cell: ({ row }) => (
          <Link
            className="text-primary font-mono text-xs hover:underline"
            to={`/stock/receipts/${row.original.id}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      { accessorKey: 'type', header: 'Loại' },
      {
        accessorKey: 'totalAmount',
        header: 'Tổng',
        cell: ({ getValue }) => formatVnd(getValue<string>()),
      },
      {
        accessorKey: 'qcStatus',
        header: 'QC',
        cell: ({ row }) =>
          row.original.qcStatus ? (
            <StatusBadge value={row.original.qcStatus} map={qcStatusMap} />
          ) : (
            '—'
          ),
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => <StatusBadge value={row.original.status} map={stockDocStatusMap} />,
      },
      {
        accessorKey: 'receivedAt',
        header: 'Ngày nhận',
        cell: ({ getValue }) => formatDateTime(getValue<string | undefined>()),
      },
      {
        id: 'post',
        header: '',
        cell: ({ row }) =>
          canWrite &&
          row.original.status === 'draft' &&
          (row.original.type !== 'adjust_in' || isAdm) ? (
            <Button
              size="sm"
              onClick={async (event) => {
                event.stopPropagation()
                if ((await confirm({ title: 'Ghi sổ phiếu nhập?' })) === false) return
                try {
                  await postReceipt(row.original.id)
                  toast.success('Đã ghi sổ')
                  void list.refetch()
                } catch (error) {
                  toast.error(messageFor(error))
                }
              }}
            >
              Ghi sổ
            </Button>
          ) : null,
      },
    ],
    [canWrite, isAdm, confirm, list],
  )
  return (
    <>
      {dialog}
      <PageHeader
        title="Phiếu nhập"
        actions={
          canWrite && (
            <Button asChild>
              <Link to="/stock/receipts/new">Tạo phiếu nhập</Link>
            </Button>
          )
        }
      />
      <DataTable
        tableId="stock-receipts"
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
        onRowClick={(row) => navigate(`/stock/receipts/${row.id}`)}
        toolbarLeft={
          <Input
            aria-label="Tìm phiếu nhập"
            value={table.inputQ}
            onChange={(e) => table.setQ(e.target.value)}
          />
        }
      />
    </>
  )
}
