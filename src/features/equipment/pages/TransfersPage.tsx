import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
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
import { transferStatusMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { useCan } from '@/app/guards/useCan'
import { ADM } from '@/routes/roles'
import { useConfirm } from '@/components/confirm-dialog'
import { messageFor } from '@/api/errors'
import { approveTransfer, listAllTransfers, rejectTransfer } from '../api'
import type { Transfer } from '../types'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

const statuses = ['pending', 'approved', 'rejected', 'cancelled'] as const

export function Component() {
  const isAdm = useCan(ADM)
  const table = useServerTable({ filterKeys: ['status'] })
  const status = statuses.find((s) => s === table.params.filters.status)
  const list = useQuery({
    queryKey: ['equipment-transfers', table.params.page, table.params.limit, status],
    queryFn: () => listAllTransfers({ page: table.params.page, limit: table.params.limit, status }),
    placeholderData: (p) => p,
  })
  const [row, setRow] = useState<Transfer | null>(null)
  const qc = useQueryClient()
  const { confirm, dialog } = useConfirm()
  const columns: ColumnDef<Transfer>[] = [
    {
      accessorKey: 'equipmentId',
      header: 'Máy',
      cell: ({ row: r }) => (
        <Link className="text-primary hover:underline" to={`/equipment/${r.original.equipmentId}`}>
          {r.original.equipmentId.slice(0, 8)}
        </Link>
      ),
    },
    {
      id: 'route',
      header: 'Từ → đến',
      cell: ({ row: r }) =>
        `${r.original.fromDepartmentId ?? '—'} → ${r.original.toDepartmentId ?? '—'}`,
    },
    { accessorKey: 'reason', header: 'Lý do' },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row: r }) => <StatusBadge value={r.original.status} map={transferStatusMap} />,
    },
    { accessorKey: 'requestedBy', header: 'Người tạo' },
    {
      accessorKey: 'createdAt',
      header: 'Ngày',
      cell: ({ getValue }) => formatDateTime(getValue<string>()),
    },
  ]
  return (
    <>
      {dialog}
      <PageHeader title="Điều chuyển thiết bị" />
      <DataTable
        tableId="equipment-transfers"
        columns={columns}
        data={list.data?.items}
        total={list.data?.total ?? 0}
        params={table.params}
        onPageChange={table.setPage}
        onLimitChange={table.setLimit}
        isLoading={list.isPending}
        error={list.error}
        onRetry={() => void list.refetch()}
        getRowId={(r) => r.id}
        onRowClick={setRow}
        toolbarLeft={
          <Select
            value={status ?? 'all'}
            onValueChange={(v) => table.setFilter('status', v === 'all' ? undefined : v)}
          >
            <SelectTrigger aria-label="Trạng thái" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {transferStatusMap[s]?.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      <Sheet open={!!row} onOpenChange={(open) => !open && setRow(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Điều chuyển</SheetTitle>
          </SheetHeader>
          {row && (
            <div className="space-y-3 p-4 text-sm">
              <p>{row.reason}</p>
              <StatusBadge value={row.status} map={transferStatusMap} />
              {isAdm && row.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      try {
                        await approveTransfer(row.equipmentId, row.id)
                        toast.success('Đã duyệt')
                        void qc.invalidateQueries({ queryKey: ['equipment-transfers'] })
                        setRow(null)
                      } catch (e) {
                        toast.error(messageFor(e))
                      }
                    }}
                  >
                    Duyệt
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const reason = await confirm({ title: 'Từ chối?', requireReason: true })
                      if (reason === false) return
                      try {
                        await rejectTransfer(row.equipmentId, row.id, reason)
                        toast.success('Đã từ chối')
                        void qc.invalidateQueries({ queryKey: ['equipment-transfers'] })
                        setRow(null)
                      } catch (e) {
                        toast.error(messageFor(e))
                      }
                    }}
                  >
                    Từ chối
                  </Button>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
