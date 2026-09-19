import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/status-badge'
import { requestStatusMap } from '@/lib/status-maps'
import { formatDate } from '@/lib/format/date'
import { useCan } from '@/app/guards/useCan'
import { HEADS, STAFF } from '@/routes/roles'
import { useConfirm } from '@/components/confirm-dialog'
import { approveBulk, listRequests } from '../api'
import type { components } from '@/api/schema'

type Row = components['schemas']['RequestResponseDto']

export function Component() {
  const canStaff = useCan(STAFF)
  const canHead = useCan(HEADS)
  const navigate = useNavigate()
  const table = useServerTable({
    filterKeys: [
      'status',
      'type',
      'departmentId',
      'priority',
      'requesterId',
      'from',
      'to',
      'pendingFor',
    ],
  })
  const f = table.params.filters
  const params = {
    page: table.params.page,
    limit: table.params.limit,
    q: table.params.q || undefined,
    status: f.status,
    type: f.type,
    pendingFor: f.pendingFor === 'me' ? 'me' : undefined,
    requesterId: f.requesterId,
    priority: f.priority,
  }
  const list = useQuery({
    queryKey: ['requests', params],
    queryFn: () => listRequests(params),
    placeholderData: (p) => p,
  })
  const pending = useQuery({
    queryKey: ['requests', 'pending-count'],
    queryFn: () => listRequests({ pendingFor: 'me', page: 1, limit: 1 }),
    enabled: canHead,
  })
  const [selected, setSelected] = useState<string[]>([])
  const { confirm, dialog } = useConfirm()
  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: 'select',
        header: '',
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Chọn ${row.original.code}`}
            checked={selected.includes(row.original.id)}
            onClick={(e) => e.stopPropagation()}
            onCheckedChange={(on) =>
              setSelected((curr) =>
                on === true
                  ? [...curr, row.original.id]
                  : curr.filter((id) => id !== row.original.id),
              )
            }
          />
        ),
      },
      {
        accessorKey: 'code',
        header: 'Mã',
        cell: ({ row }) => (
          <Link
            className="text-primary font-mono text-xs hover:underline"
            to={`/requests/${row.original.id}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      { accessorKey: 'type', header: 'Loại' },
      { accessorKey: 'departmentName', header: 'Khoa' },
      { accessorKey: 'requesterName', header: 'Người yêu cầu' },
      {
        accessorKey: 'priority',
        header: 'Ưu tiên',
        cell: ({ row }) =>
          row.original.priority === 'urgent' ? (
            <StatusBadge value="urgent" map={{ urgent: { label: 'Khẩn', tone: 'danger' } }} />
          ) : (
            'Thường'
          ),
      },
      {
        accessorKey: 'neededBy',
        header: 'Cần trước',
        cell: ({ row }) => (
          <span
            className={
              row.original.neededBy && row.original.neededBy < new Date().toISOString().slice(0, 10)
                ? 'text-destructive'
                : undefined
            }
          >
            {formatDate(row.original.neededBy)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1">
            <StatusBadge value={row.original.status} map={requestStatusMap} />
            {row.original.quotaExceeded && '⚠'}
          </span>
        ),
      },
    ],
    [selected],
  )
  return (
    <>
      {dialog}
      <PageHeader
        title="Phiếu yêu cầu"
        actions={
          <div className="flex gap-2">
            {canStaff && selected.length > 0 && (
              <Button
                variant="outline"
                onClick={async () => {
                  if ((await confirm({ title: `Duyệt ${selected.length} phiếu?` })) === false)
                    return
                  const result = await approveBulk(selected)
                  const approved = (result as { approved?: unknown }).approved
                  toast.success(
                    `Đã duyệt ${Array.isArray(approved) ? approved.length : selected.length}`,
                  )
                  setSelected([])
                  void list.refetch()
                }}
              >
                Duyệt hàng loạt
              </Button>
            )}
            <Button asChild>
              <Link to="/requests/new">Tạo phiếu</Link>
            </Button>
          </div>
        }
      />
      <div className="mb-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={!f.pendingFor && !f.status ? 'default' : 'outline'}
          onClick={() =>
            table.setFilters({ pendingFor: undefined, status: undefined, requesterId: undefined })
          }
        >
          Tất cả
        </Button>
        {canHead && (
          <Button
            size="sm"
            variant={f.pendingFor === 'me' ? 'default' : 'outline'}
            onClick={() => table.setFilters({ pendingFor: 'me', status: undefined })}
          >
            Chờ tôi duyệt{pending.data?.total ? ` (${pending.data.total})` : ''}
          </Button>
        )}
        <Button
          size="sm"
          variant={f.requesterId === 'me' ? 'default' : 'outline'}
          onClick={() => table.setFilters({ requesterId: 'me', pendingFor: undefined })}
        >
          Của tôi
        </Button>
        <Button
          size="sm"
          variant={f.status === 'approved,partially_approved' ? 'default' : 'outline'}
          onClick={() => table.setFilter('status', 'approved,partially_approved')}
        >
          Chờ cấp phát
        </Button>
        <Button
          size="sm"
          variant={f.status === 'issued' ? 'default' : 'outline'}
          onClick={() => table.setFilter('status', 'issued')}
        >
          Chờ nhận
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link to="/requests/quotas">Định mức</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link to="/requests/recurring">Phiếu định kỳ</Link>
        </Button>
      </div>
      <DataTable
        tableId="requests"
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
        onRowClick={(row) => navigate(`/requests/${row.id}`)}
        toolbarLeft={
          <Input
            aria-label="Tìm phiếu"
            value={table.inputQ}
            onChange={(e) => table.setQ(e.target.value)}
          />
        }
      />
    </>
  )
}
