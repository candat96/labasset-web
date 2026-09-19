import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { AsyncSelect } from '@/components/form/async-select'
import { useConfirm } from '@/components/confirm-dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { suggestionStatusMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { useCan } from '@/app/guards/useCan'
import { ADM } from '@/routes/roles'
import { messageFor } from '@/api/errors'
import {
  acceptFaultSuggestion,
  getFaultSuggestion,
  listFaults,
  listFaultSuggestions,
  rejectFaultSuggestion,
} from '../api'
import { useInvalidateFaults } from '../hooks'
import type { FaultProposal } from '../types'

export function Component() {
  const isAdm = useCan(ADM)
  const table = useServerTable({ filterKeys: ['status'] })
  const status = (table.params.filters.status ?? 'pending') as 'pending' | 'accepted' | 'rejected'
  const list = useQuery({
    queryKey: ['faults', 'suggestions', { ...table.params, status }],
    queryFn: () =>
      listFaultSuggestions({
        page: table.params.page,
        limit: table.params.limit,
        status,
      }),
    enabled: isAdm,
  })
  const { confirm, dialog } = useConfirm()
  const invalidate = useInvalidateFaults()
  const [openId, setOpenId] = useState<string | null>(null)
  const [acceptOpen, setAcceptOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'merge'>('create')
  const [mergeId, setMergeId] = useState<string | null>(null)
  const detail = useQuery({
    queryKey: ['faults', 'suggestions', openId],
    queryFn: () => getFaultSuggestion(openId!),
    enabled: !!openId,
  })
  const accept = useMutation({
    mutationFn: () =>
      acceptFaultSuggestion(openId!, mode === 'merge' ? (mergeId ?? undefined) : undefined),
    onSuccess: () => {
      toast.success('Đã chấp nhận đề xuất')
      setAcceptOpen(false)
      setOpenId(null)
      void invalidate()
      void list.refetch()
    },
    onError: (error) => toast.error(messageFor(error)),
  })
  const reject = useMutation({
    mutationFn: (reviewNote: string) => rejectFaultSuggestion(openId!, reviewNote),
    onSuccess: () => {
      toast.success('Đã từ chối đề xuất')
      setOpenId(null)
      void invalidate()
      void list.refetch()
    },
    onError: (error) => toast.error(messageFor(error)),
  })
  const columns = useMemo<ColumnDef<FaultProposal>[]>(
    () => [
      {
        accessorKey: 'payload.title',
        header: 'Tiêu đề',
        cell: ({ row }) => row.original.payload.title,
      },
      {
        id: 'ticket',
        header: 'Phiếu',
        cell: ({ row }) =>
          row.original.repairTicketId ? (
            <Link
              className="text-primary hover:underline"
              to={`/repairs/${row.original.repairTicketId}`}
              onClick={(event) => event.stopPropagation()}
            >
              {row.original.repairTicketId}
            </Link>
          ) : (
            '—'
          ),
      },
      {
        accessorKey: 'proposedBy',
        header: 'Người đề xuất',
        cell: ({ row }) => row.original.proposedBy ?? '—',
      },
      {
        accessorKey: 'createdAt',
        header: 'Ngày',
        cell: ({ getValue }) => formatDateTime(getValue<string>()),
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => <StatusBadge value={row.original.status} map={suggestionStatusMap} />,
      },
    ],
    [],
  )
  if (!isAdm) return <p role="alert">Bạn không có quyền duyệt đề xuất.</p>
  const payload = detail.data?.payload
  return (
    <>
      {dialog}
      <PageHeader title="Đề xuất thư viện lỗi" />
      <DataTable
        tableId="fault-suggestions"
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
        onRowClick={(row) => setOpenId(row.id)}
      />
      <Sheet open={!!openId} onOpenChange={(open) => !open && setOpenId(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{payload?.title ?? 'Đề xuất'}</SheetTitle>
          </SheetHeader>
          {detail.isPending && <p role="status">Đang tải đề xuất…</p>}
          {detail.error && <p role="alert">{messageFor(detail.error)}</p>}
          {payload && (
            <div className="space-y-3 p-4 text-sm">
              {payload.errorCode && <p>Mã lỗi: {payload.errorCode}</p>}
              {payload.symptoms && (
                <p className="whitespace-pre-wrap">Triệu chứng: {payload.symptoms}</p>
              )}
              <div>
                <p className="font-medium">Các bước</p>
                <ol className="list-decimal pl-5">
                  {(payload.steps ?? []).map((step, index) => (
                    <li key={index}>{step.instruction}</li>
                  ))}
                </ol>
              </div>
              <div>
                <p className="font-medium">Linh kiện</p>
                <ul>
                  {(payload.parts ?? []).map((part, index) => (
                    <li key={index}>
                      {part.name} × {part.quantity}
                    </li>
                  ))}
                </ul>
              </div>
              {detail.data?.status === 'pending' && (
                <div className="flex gap-2">
                  <Button onClick={() => setAcceptOpen(true)}>Chấp nhận</Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const reason = await confirm({
                        title: 'Từ chối đề xuất?',
                        requireReason: true,
                        destructive: true,
                        confirmLabel: 'Từ chối',
                      })
                      if (reason === false) return
                      reject.mutate(reason)
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
      <Dialog open={acceptOpen} onOpenChange={setAcceptOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chấp nhận đề xuất</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="accept-mode"
                checked={mode === 'create'}
                onChange={() => setMode('create')}
              />
              Tạo lỗi mới
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="accept-mode"
                checked={mode === 'merge'}
                onChange={() => setMode('merge')}
              />
              Gộp vào lỗi có sẵn
            </label>
            {mode === 'merge' && (
              <AsyncSelect
                label="Lỗi đích"
                queryKey="faults-merge"
                loadOptions={async (q) => {
                  const page = await listFaults({ q, page: 1, limit: 50 })
                  return page.items.map((item) => ({
                    id: item.id,
                    code: item.errorCode ?? '',
                    name: item.title,
                  }))
                }}
                value={mergeId}
                onChange={(value) => setMergeId(typeof value === 'string' ? value : null)}
                clearable
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptOpen(false)}>
              Huỷ
            </Button>
            <Button
              disabled={accept.isPending || (mode === 'merge' && !mergeId)}
              onClick={() => accept.mutate()}
            >
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
