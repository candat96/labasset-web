import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { apiBody } from '@/api/client'
import * as api from '../api'
import { useTranslation } from 'react-i18next'

export function Component() {
  const { t } = useTranslation('requests')

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
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['requests'] })
  }
  const { confirm, dialog } = useConfirm()
  const [comment, setComment] = useState('')
  if (detail.isPending) return <p role="status">{t('loading')}</p>
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data
  const owner = row.requesterId === userId || isAdm
  const run = async (title: string, action: () => Promise<unknown>) => {
    if ((await confirm({ title })) === false) return
    try {
      await action()
      toast.success(t('updated'))
      invalidate()
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
              <StatusBadge
                value="urgent"
                map={{ urgent: { label: t('urgent'), tone: 'danger' } }}
              />
            )}
            {row.quotaExceeded && (
              <StatusBadge
                value="quota"
                map={{ quota: { label: t('quotaExceeded'), tone: 'warning' } }}
              />
            )}
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {row.status === 'draft' && owner && (
              <Button asChild>
                <Link to={`/requests/${id}/edit`}>{t('edit')}</Link>
              </Button>
            )}
            {row.status === 'draft' && (
              <Button onClick={() => void run(t('submitConfirm'), () => api.submitRequest(id))}>
                {t('submit')}
              </Button>
            )}
            {['draft', 'submitted', 'dept_approved'].includes(row.status) && (owner || isAdm) && (
              <Button
                variant="outline"
                onClick={() => void run(t('cancelConfirm'), () => api.cancelRequest(id))}
              >
                {t('cancel')}
              </Button>
            )}
            {row.status === 'submitted' && row.approvalLevels === 2 && (
              <Button onClick={() => void run(t('deptApproveConfirm'), () => api.deptApprove(id))}>
                {t('deptApprove')}
              </Button>
            )}
            {isStaff && (row.status === 'submitted' || row.status === 'dept_approved') && (
              <Button
                onClick={() =>
                  void run(t('approveConfirm'), () =>
                    api.approveRequest(
                      id,
                      apiBody({
                        items: row.items.map((item) => ({
                          id: item.id,
                          qtyApproved: item.qtyRequested,
                        })),
                      }),
                    ),
                  )
                }
              >
                {t('approve')}
              </Button>
            )}
            {isStaff && (row.status === 'submitted' || row.status === 'dept_approved') && (
              <Button
                variant="outline"
                onClick={async () => {
                  const reason = await confirm({
                    title: t('rejectConfirm'),
                    requireReason: true,
                    destructive: true,
                  })
                  if (reason === false) return
                  await api.rejectRequest(id, reason)
                  toast.success(t('rejected'))
                  invalidate()
                }}
              >
                {t('reject')}
              </Button>
            )}
            {isStaff && (row.status === 'approved' || row.status === 'partially_approved') && (
              <Button onClick={() => void run(t('issueConfirm'), () => api.issueRequest(id, {}))}>
                {t('issue')}
              </Button>
            )}
            {row.status === 'issued' && (
              <Button onClick={() => void run(t('receiveConfirm'), () => api.receiveRequest(id))}>
                {t('receive')}
              </Button>
            )}
            {row.type === 'supply' && (
              <Button
                variant="outline"
                onClick={async () => {
                  const cloned = await api.cloneRequest(id)
                  invalidate()
                  navigate(`/requests/${cloned.id}/edit`)
                }}
              >
                {t('clone')}
              </Button>
            )}
          </div>
        }
      />
      {row.repairTicketId && (
        <p className="mb-2 text-sm">
          {t('repairTicket')}{' '}
          <Link className="text-primary hover:underline" to={`/repairs/${row.repairTicketId}`}>
            {row.repairTicket?.code ?? row.repairTicketId}
          </Link>
        </p>
      )}
      <table className="mb-4 w-full text-sm">
        <thead>
          <tr className="text-left">
            <th>{t('supply')}</th>
            <th>{t('qtyRequested')}</th>
            <th>{t('approve')}</th>
            <th>{t('qtyIssued')}</th>
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
      <h2 className="mb-2 font-medium">{t('comments')}</h2>
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
        aria-label={t('comments')}
      />
      <Button
        className="mt-2"
        onClick={async () => {
          if (!comment.trim()) return
          await api.addComment(id, comment)
          setComment('')
          invalidate()
        }}
      >
        {t('send')}
      </Button>
      <div className="mt-6">
        <AuditTrail entityType="request" entityId={id} />
      </div>
    </>
  )
}
