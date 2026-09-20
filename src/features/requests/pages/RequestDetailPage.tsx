import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Big from 'big.js'
import { Link, useNavigate, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { FormDialog } from '@/components/form/FormDialog'
import { QtyField } from '@/components/form/qty-field'
import { TextField } from '@/components/form/fields'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AsyncSelect } from '@/components/form/async-select'
import { catalogOptions } from '@/api/references'
import { StatusBadge } from '@/components/status-badge'
import { AuditTrail } from '@/components/audit-trail'
import { useConfirm } from '@/components/confirm-dialog'
import { requestStatusMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { formatQty } from '@/lib/format/number'
import { useCan } from '@/app/guards/useCan'
import { ADM, HEADS, STAFF } from '@/routes/roles'
import { useAuthStore } from '@/stores/auth.store'
import { messageFor } from '@/api/errors'
import { apiBody } from '@/api/client'
import * as api from '../api'
import { useTranslation } from 'react-i18next'

const approvalSchema = z.object({
  items: z.array(z.object({ id: z.string(), qtyApproved: z.string(), approverNote: z.string() })),
})
const issueSchema = z.object({
  warehouseId: z.string().min(1, 'Bắt buộc'),
  items: z.array(z.object({ id: z.string(), quantity: z.string() })),
})

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
  const isHead = useCan(HEADS)
  const userId = useAuthStore((s) => s.user?.id)
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['requests'] })
  }
  const { confirm, dialog } = useConfirm()
  const [comment, setComment] = useState('')
  const [approvalOpen, setApprovalOpen] = useState(false)
  const [issueOpen, setIssueOpen] = useState(false)
  const approvalForm = useForm<z.infer<typeof approvalSchema>>({
    resolver: zodResolver(approvalSchema),
    defaultValues: { items: [] },
  })
  const issueForm = useForm<z.infer<typeof issueSchema>>({
    resolver: zodResolver(issueSchema),
    defaultValues: { warehouseId: '', items: [] },
  })
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
  const sendComment = async () => {
    if (!comment.trim()) return
    try {
      await api.addComment(id, comment)
      setComment('')
      invalidate()
    } catch (error) {
      toast.error(messageFor(error))
    }
  }
  return (
    <>
      {dialog}
      <FormDialog
        open={approvalOpen}
        onOpenChange={setApprovalOpen}
        title={t('approve')}
        form={approvalForm}
        onSubmit={async (values) => {
          let invalid = false
          values.items.forEach((item, index) => {
            const requested = row.items.find((source) => source.id === item.id)?.qtyRequested ?? '0'
            if (new Big(item.qtyApproved || '0').gt(requested)) {
              approvalForm.setError(`items.${index}.qtyApproved`, { message: t('approveExceeds') })
              invalid = true
            }
            if (item.qtyApproved === '0' && !item.approverNote.trim()) {
              approvalForm.setError(`items.${index}.approverNote`, { message: t('zeroNeedsNote') })
              invalid = true
            }
          })
          if (invalid) return
          try {
            await api.approveRequest(
              id,
              apiBody({
                items: values.items.map((item) => ({
                  id: item.id,
                  qtyApproved: item.qtyApproved,
                  approverNote: item.approverNote || undefined,
                })),
              }),
            )
            toast.success(t('updated'))
            setApprovalOpen(false)
            invalidate()
          } catch (error) {
            toast.error(messageFor(error))
          }
        }}
      >
        {approvalForm.watch('items').map((item, index) => {
          const source = row.items.find((candidate) => candidate.id === item.id)
          return (
            <div key={item.id} className="space-y-2 rounded border p-3">
              <p className="text-sm font-medium">
                {source?.supply?.name ?? source?.supplyId} · {t('qtyRequested')}:{' '}
                {formatQty(source?.qtyRequested)} {source?.quotaExceeded ? '⚠' : ''}
              </p>
              <QtyField
                control={approvalForm.control}
                name={`items.${index}.qtyApproved`}
                label={t('approve')}
              />
              <TextField
                control={approvalForm.control}
                name={`items.${index}.approverNote`}
                label={t('notes')}
              />
            </div>
          )
        })}
        <p className="text-sm font-medium">
          {t('approvalSummary', {
            approved: approvalForm.watch('items').filter((item) => item.qtyApproved !== '0').length,
            rejected: approvalForm.watch('items').filter((item) => item.qtyApproved === '0').length,
          })}
        </p>
      </FormDialog>
      <FormDialog
        open={issueOpen}
        onOpenChange={setIssueOpen}
        title={t('issue')}
        form={issueForm}
        onSubmit={async (values) => {
          let invalid = false
          values.items.forEach((item, index) => {
            const source = row.items.find((candidate) => candidate.id === item.id)
            const remaining = new Big(source?.qtyApproved ?? '0').minus(source?.qtyIssued ?? '0')
            if (new Big(item.quantity || '0').gt(remaining)) {
              issueForm.setError(`items.${index}.quantity`, { message: t('issueExceeds') })
              invalid = true
            }
          })
          if (invalid) return
          try {
            const result = await api.issueRequest(id, values)
            toast.success(t('updated'))
            setIssueOpen(false)
            invalidate()
            const issueId =
              (result as { issueId?: string; id?: string }).issueId ??
              (result as { id?: string }).id
            if (issueId) navigate(`/stock/issues/${issueId}`)
          } catch (error) {
            toast.error(messageFor(error))
          }
        }}
      >
        <FormField
          control={issueForm.control}
          name="warehouseId"
          render={({ field }) => (
            <FormItem>
              <AsyncSelect
                label={t('warehouse')}
                queryKey="request-warehouses"
                loadOptions={(q) => catalogOptions('warehouses', q)}
                value={field.value || null}
                onChange={(value) => field.onChange(typeof value === 'string' ? value : '')}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        {issueForm.watch('items').map((item, index) => {
          const source = row.items.find((candidate) => candidate.id === item.id)
          return (
            <div key={item.id} className="space-y-2 rounded border p-3">
              <p className="text-sm font-medium">{source?.supply?.name ?? source?.supplyId}</p>
              <QtyField
                control={issueForm.control}
                name={`items.${index}.quantity`}
                label={t('quantity')}
              />
            </div>
          )
        })}
      </FormDialog>
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
            {['draft', 'submitted', 'dept_approved'].includes(row.status) &&
              (owner || isAdm || isHead) && (
                <Button
                  variant="outline"
                  onClick={() => void run(t('cancelConfirm'), () => api.cancelRequest(id))}
                >
                  {t('cancel')}
                </Button>
              )}
            {row.status === 'submitted' && row.approvalLevels === 2 && (isHead || isAdm) && (
              <Button onClick={() => void run(t('deptApproveConfirm'), () => api.deptApprove(id))}>
                {t('deptApprove')}
              </Button>
            )}
            {isStaff && (row.status === 'submitted' || row.status === 'dept_approved') && (
              <Button
                onClick={() => {
                  approvalForm.reset({
                    items: row.items.map((item) => ({
                      id: item.id,
                      qtyApproved: item.qtyRequested,
                      approverNote: '',
                    })),
                  })
                  setApprovalOpen(true)
                }}
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
                  try {
                    await api.rejectRequest(id, reason)
                    toast.success(t('rejected'))
                    invalidate()
                  } catch (error) {
                    toast.error(messageFor(error))
                  }
                }}
              >
                {t('reject')}
              </Button>
            )}
            {isStaff && (row.status === 'approved' || row.status === 'partially_approved') && (
              <Button
                onClick={() => {
                  issueForm.reset({
                    warehouseId: '',
                    items: row.items
                      .filter((item) => new Big(item.qtyApproved ?? '0').gt(item.qtyIssued ?? '0'))
                      .map((item) => ({
                        id: item.id,
                        quantity: new Big(item.qtyApproved ?? '0')
                          .minus(item.qtyIssued ?? '0')
                          .toString(),
                      })),
                  })
                  setIssueOpen(true)
                }}
              >
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
                  try {
                    const cloned = await api.cloneRequest(id)
                    invalidate()
                    navigate(`/requests/${cloned.id}/edit`)
                  } catch (error) {
                    toast.error(messageFor(error))
                  }
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
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault()
            void sendComment()
          }
        }}
      />
      <Button className="mt-2" onClick={() => void sendComment()}>
        {t('send')}
      </Button>
      <div className="mt-6">
        <AuditTrail entityType="request" entityId={id} />
      </div>
    </>
  )
}
