import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/status-badge'
import { AuditTrail } from '@/components/audit-trail'
import { useConfirm } from '@/components/confirm-dialog'
import { requestStatusMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { formatQty } from '@/lib/format/number'
import { useCan } from '@/app/guards/useCan'
import { ADM, STAFF } from '@/routes/roles'
import { useAuthStore } from '@/stores/auth.store'
import { messageFor } from '@/api/errors'
import * as api from '../api'

export function Component() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const detail = useQuery({
    queryKey: ['requests', id],
    queryFn: () => api.getRequest(id),
    enabled: !!id,
  })
  const isStaff = useCan(STAFF)
  const isAdm = useCan(ADM)
  const userId = useAuthStore((s) => s.user?.id)
  const { confirm, dialog } = useConfirm()
  const [comment, setComment] = useState('')
  if (detail.isPending) return <p role="status">Đang tải phiếu yêu cầu…</p>
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data
  const owner = row.requesterId === userId || isAdm
  const run = async (title: string, action: () => Promise<unknown>) => {
    if ((await confirm({ title })) === false) return
    try {
      await action()
      toast.success('Đã cập nhật phiếu')
      void detail.refetch()
    } catch (error) {
      toast.error(messageFor(error))
    }
  }
  return (
    <>
      {dialog}
      <PageHeader
        title={row.code}
        badge={
          <div className="flex gap-1">
            <StatusBadge value={row.status} map={requestStatusMap} />
            {row.priority === 'urgent' && (
              <StatusBadge value="urgent" map={{ urgent: { label: 'Khẩn', tone: 'danger' } }} />
            )}
            {row.quotaExceeded && (
              <StatusBadge
                value="quota"
                map={{ quota: { label: 'Vượt định mức', tone: 'warning' } }}
              />
            )}
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {row.status === 'draft' && owner && (
              <Button asChild>
                <Link to={`/requests/${id}/edit`}>Sửa</Link>
              </Button>
            )}
            {row.status === 'draft' && (
              <Button onClick={() => void run('Gửi duyệt?', () => api.submitRequest(id))}>
                Gửi duyệt
              </Button>
            )}
            {['draft', 'submitted', 'dept_approved'].includes(row.status) && (owner || isAdm) && (
              <Button
                variant="outline"
                onClick={() => void run('Huỷ phiếu?', () => api.cancelRequest(id))}
              >
                Huỷ
              </Button>
            )}
            {row.status === 'submitted' && row.approvalLevels === 2 && (
              <Button onClick={() => void run('Duyệt cấp khoa?', () => api.deptApprove(id))}>
                Duyệt cấp khoa
              </Button>
            )}
            {isStaff && (row.status === 'submitted' || row.status === 'dept_approved') && (
              <Button
                onClick={() =>
                  void run('Duyệt phiếu?', () =>
                    api.approveRequest(id, {
                      items: row.items.map((item) => ({
                        id: item.id,
                        qtyApproved: item.qtyRequested,
                      })),
                    } as never),
                  )
                }
              >
                Duyệt
              </Button>
            )}
            {isStaff && (row.status === 'submitted' || row.status === 'dept_approved') && (
              <Button
                variant="outline"
                onClick={async () => {
                  const reason = await confirm({
                    title: 'Từ chối?',
                    requireReason: true,
                    destructive: true,
                  })
                  if (reason === false) return
                  await api.rejectRequest(id, reason)
                  toast.success('Đã từ chối')
                  void detail.refetch()
                }}
              >
                Từ chối
              </Button>
            )}
            {isStaff && (row.status === 'approved' || row.status === 'partially_approved') && (
              <Button onClick={() => void run('Cấp phát?', () => api.issueRequest(id, {}))}>
                Cấp phát
              </Button>
            )}
            {row.status === 'issued' && (
              <Button onClick={() => void run('Xác nhận đã nhận?', () => api.receiveRequest(id))}>
                Xác nhận đã nhận
              </Button>
            )}
            {row.type === 'supply' && (
              <Button
                variant="outline"
                onClick={async () => {
                  const cloned = await api.cloneRequest(id)
                  navigate(`/requests/${cloned.id}/edit`)
                }}
              >
                Tạo lại
              </Button>
            )}
          </div>
        }
      />
      {row.repairTicketId && (
        <p className="mb-2 text-sm">
          Phiếu sửa:{' '}
          <Link className="text-primary hover:underline" to={`/repairs/${row.repairTicketId}`}>
            {row.repairTicket?.code ?? row.repairTicketId}
          </Link>
        </p>
      )}
      <table className="mb-4 w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>Vật tư</th>
            <th>Yêu cầu</th>
            <th>Duyệt</th>
            <th>Đã cấp</th>
          </tr>
        </thead>
        <tbody>
          {row.items.map((item) => (
            <tr key={item.id} className="border-t">
              <td>{item.supply?.name ?? item.supplyId}</td>
              <td>{formatQty(item.qtyRequested)}</td>
              <td>{formatQty(item.qtyApproved)}</td>
              <td>{formatQty(item.qtyIssued)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="mb-2 font-medium">Bình luận</h2>
      <ul className="mb-2 space-y-2 text-sm">
        {row.comments.map((item) => (
          <li key={item.id}>
            <span className="text-muted-foreground">{formatDateTime(item.createdAt)}</span>{' '}
            {item.body}
          </li>
        ))}
      </ul>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={2000}
        aria-label="Bình luận"
      />
      <Button
        className="mt-2"
        onClick={async () => {
          if (!comment.trim()) return
          await api.addComment(id, comment)
          setComment('')
          void detail.refetch()
        }}
      >
        Gửi
      </Button>
      <div className="mt-6">
        <AuditTrail entityType="request" entityId={id} />
      </div>
    </>
  )
}
