import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Big from 'big.js'
import { Link, useNavigate, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader, PageMeta } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { ActionMenu } from '@/components/page/ActionMenu'
import { DataList } from '@/components/page/DataList'
import { Timeline } from '@/components/timeline'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Ban,
  Building2,
  CalendarClock,
  ClipboardList,
  Copy,
  Pencil,
  User,
  Wrench,
  XCircle,
} from 'lucide-react'
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
import { formatDate, formatDateTime } from '@/lib/format/date'
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
        eyebrow={t('title')}
        title={row.code}
        meta={
          <>
            {row.departmentName && <PageMeta icon={<Building2 />}>{row.departmentName}</PageMeta>}
            {(row.requesterName ?? row.requester?.fullName) && (
              <PageMeta icon={<User />}>{row.requesterName ?? row.requester?.fullName}</PageMeta>
            )}
            {row.neededBy && (
              <PageMeta icon={<CalendarClock />}>
                {t('neededBy')}: {formatDate(row.neededBy)}
              </PageMeta>
            )}
            {row.repairTicketId && (
              <PageMeta icon={<Wrench />}>
                <Link
                  className="text-primary hover:underline"
                  to={`/repairs/${row.repairTicketId}`}
                >
                  {row.repairTicket?.code ?? row.repairTicketId}
                </Link>
              </PageMeta>
            )}
          </>
        }
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
          <ActionMenu
            items={[
              row.status === 'draft' && {
                key: 'submit',
                label: t('submit'),
                variant: 'primary' as const,
                onClick: () => void run(t('submitConfirm'), () => api.submitRequest(id)),
              },
              row.status === 'submitted' &&
                row.approvalLevels === 2 &&
                (isHead || isAdm) && {
                  key: 'deptApprove',
                  label: t('deptApprove'),
                  variant: 'primary' as const,
                  onClick: () => void run(t('deptApproveConfirm'), () => api.deptApprove(id)),
                },
              isStaff &&
                (row.status === 'submitted' || row.status === 'dept_approved') && {
                  key: 'approve',
                  label: t('approve'),
                  variant: 'primary' as const,
                  onClick: () => {
                    approvalForm.reset({
                      items: row.items.map((item) => ({
                        id: item.id,
                        qtyApproved: item.qtyRequested,
                        approverNote: '',
                      })),
                    })
                    setApprovalOpen(true)
                  },
                },
              isStaff &&
                (row.status === 'approved' || row.status === 'partially_approved') && {
                  key: 'issue',
                  label: t('issue'),
                  variant: 'primary' as const,
                  onClick: () => {
                    issueForm.reset({
                      warehouseId: '',
                      items: row.items
                        .filter((item) =>
                          new Big(item.qtyApproved ?? '0').gt(item.qtyIssued ?? '0'),
                        )
                        .map((item) => ({
                          id: item.id,
                          quantity: new Big(item.qtyApproved ?? '0')
                            .minus(item.qtyIssued ?? '0')
                            .toString(),
                        })),
                    })
                    setIssueOpen(true)
                  },
                },
              row.status === 'issued' && {
                key: 'receive',
                label: t('receive'),
                variant: 'primary' as const,
                onClick: () => void run(t('receiveConfirm'), () => api.receiveRequest(id)),
              },
              row.status === 'draft' &&
                owner && {
                  key: 'edit',
                  label: t('edit'),
                  icon: <Pencil />,
                  to: `/requests/${id}/edit`,
                },
              isStaff &&
                (row.status === 'submitted' || row.status === 'dept_approved') && {
                  key: 'reject',
                  label: t('reject'),
                  icon: <XCircle />,
                  onClick: () => {
                    void (async () => {
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
                    })()
                  },
                },
              row.type === 'supply' && {
                key: 'clone',
                label: t('clone'),
                icon: <Copy />,
                onClick: () => {
                  void (async () => {
                    try {
                      const cloned = await api.cloneRequest(id)
                      invalidate()
                      navigate(`/requests/${cloned.id}/edit`)
                    } catch (error) {
                      toast.error(messageFor(error))
                    }
                  })()
                },
              },
              ['draft', 'submitted', 'dept_approved'].includes(row.status) &&
                (owner || isAdm || isHead) && {
                  key: 'cancel',
                  label: t('cancel'),
                  variant: 'destructive' as const,
                  icon: <Ban />,
                  separator: true,
                  onClick: () => void run(t('cancelConfirm'), () => api.cancelRequest(id)),
                },
            ]}
          />
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <SectionCard
            title={t('items')}
            description={`${row.items.length} ${t('supply').toLowerCase()}`}
            flush
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">{t('supply')}</TableHead>
                  <TableHead className="text-right">{t('qtyRequested')}</TableHead>
                  <TableHead className="text-right">{t('approve')}</TableHead>
                  <TableHead className="pr-5 text-right">{t('qtyIssued')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {row.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="pl-5 font-medium">
                      {item.supply?.name ?? item.supplyId}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatQty(item.qtyRequested)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.qtyApproved == null ? (
                        <span className="text-subtle">—</span>
                      ) : (
                        formatQty(item.qtyApproved)
                      )}
                    </TableCell>
                    <TableCell className="pr-5 text-right tabular-nums">
                      {item.qtyIssued == null || item.qtyIssued === '0' ? (
                        <span className="text-subtle">—</span>
                      ) : (
                        formatQty(item.qtyIssued)
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>

          <SectionCard
            title={t('comments')}
            description={`${row.comments.length} ${t('comments').toLowerCase()}`}
          >
            <ul className="mb-4 space-y-3 text-sm">
              {row.comments.map((item) => (
                <li key={item.id} className="flex gap-3">
                  <div className="bg-primary-soft text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold">
                    {(item.user?.fullName ?? '?').slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[13px] font-semibold">
                        {item.user?.fullName ?? '—'}
                      </span>
                      <span className="text-subtle text-[12px]">
                        {formatDateTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="bg-surface-2 mt-1 rounded-lg px-3 py-2 text-[13.5px] leading-5 whitespace-pre-wrap">
                      {item.body}
                    </p>
                  </div>
                </li>
              ))}
              {row.comments.length === 0 && (
                <li className="text-muted-foreground text-[13px]">
                  {t('noComments', { defaultValue: 'Chưa có bình luận' })}
                </li>
              )}
            </ul>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder={t('commentPlaceholder', {
                defaultValue: 'Viết bình luận… (Ctrl+Enter để gửi)',
              })}
              aria-label={t('comments')}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault()
                  void sendComment()
                }
              }}
            />
            <div className="mt-3 flex justify-end">
              <Button onClick={() => void sendComment()} disabled={!comment.trim()}>
                {t('send')}
              </Button>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard title={t('info', { defaultValue: 'Thông tin' })}>
            <DataList
              columns={1}
              items={[
                {
                  label: t('type'),
                  value:
                    row.type === 'supply'
                      ? t('typeSupply')
                      : t('typeRepair', { defaultValue: 'Sửa chữa' }),
                },
                {
                  label: t('priority'),
                  value:
                    row.priority === 'urgent'
                      ? t('urgent')
                      : t('normal', { defaultValue: 'Bình thường' }),
                },
                { label: t('department'), value: row.departmentName },
                { label: t('requester'), value: row.requesterName ?? row.requester?.fullName },
                { label: t('neededBy'), value: row.neededBy ? formatDate(row.neededBy) : null },
                { label: t('createdAt'), value: formatDateTime(row.createdAt) },
                { label: t('reason'), value: row.reason, full: true },
                ...(row.rejectedReason
                  ? [
                      {
                        label: t('rejectedReason', { defaultValue: 'Lý do từ chối' }),
                        value: row.rejectedReason,
                        full: true,
                      },
                    ]
                  : []),
              ]}
            />
          </SectionCard>
          <SectionCard title={t('history', { defaultValue: 'Lịch sử' })}>
            <Timeline
              events={[
                {
                  at: row.createdAt,
                  title: t('createdAt'),
                  by: row.requesterName ?? undefined,
                  tone: 'muted',
                  icon: <ClipboardList />,
                },
                ...(row.submittedAt
                  ? [{ at: row.submittedAt, title: t('submit'), tone: 'primary' as const }]
                  : []),
                ...(row.deptApprovedAt
                  ? [{ at: row.deptApprovedAt, title: t('deptApprove'), tone: 'success' as const }]
                  : []),
                ...(row.approvedAt
                  ? [{ at: row.approvedAt, title: t('approve'), tone: 'success' as const }]
                  : []),
                ...(row.receivedAt
                  ? [
                      {
                        at: row.receivedAt,
                        title: t('receive'),
                        tone: 'success' as const,
                        summary: row.receiveNote,
                      },
                    ]
                  : []),
              ]}
            />
          </SectionCard>
        </div>
      </div>
      <SectionCard title={t('audit', { defaultValue: 'Nhật ký thay đổi' })} className="mt-5">
        <AuditTrail entityType="request" entityId={id} />
      </SectionCard>
    </>
  )
}
