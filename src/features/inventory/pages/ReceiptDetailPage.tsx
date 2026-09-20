import { Link, useNavigate, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { AttachmentsPanel } from '@/components/attachments-panel'
import { AuditTrail } from '@/components/audit-trail'
import { useConfirm } from '@/components/confirm-dialog'
import { qcStatusMap, stockDocStatusMap } from '@/lib/status-maps'
import { formatVnd } from '@/lib/format/money'
import { useCan } from '@/app/guards/useCan'
import { ADM, STAFF } from '@/routes/roles'
import { messageFor } from '@/api/errors'
import { downloadFile } from '@/api/download'
import { cancelReceipt, deleteReceipt, getReceipt, postReceipt, qcReceipt } from '../api'
import { useTranslation } from 'react-i18next'

export function Component() {
  const { t } = useTranslation('inventory')

  const { id = '' } = useParams()
  const navigate = useNavigate()
  const detail = useQuery({
    queryKey: ['stock', 'receipts', id],
    queryFn: () => getReceipt(id),
    enabled: !!id,
  })
  const canWrite = useCan(STAFF)
  const isAdm = useCan(ADM)
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['stock', 'receipts'] })
    void qc.invalidateQueries({ queryKey: ['stock', 'balances'] })
    void qc.invalidateQueries({ queryKey: ['stock', 'lots'] })
  }
  const { confirm, dialog } = useConfirm()
  if (detail.isPending) return <p role="status">{t('loadingReceipt')}</p>
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data
  return (
    <>
      {dialog}
      <PageHeader
        title={row.code}
        badge={
          <div className="flex gap-1">
            <StatusBadge value={row.status} map={stockDocStatusMap} />
            {row.qcStatus && <StatusBadge value={row.qcStatus} map={qcStatusMap} />}
          </div>
        }
        actions={
          <div className="flex gap-2">
            {canWrite && row.status === 'draft' && (
              <>
                <Button asChild variant="outline">
                  <Link to={`/stock/receipts/${id}/edit`}>{t('edit')}</Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    if ((await confirm({ title: t('deleteConfirm'), destructive: true })) === false)
                      return
                    try {
                      await deleteReceipt(id)
                      invalidate()
                      navigate('/stock/receipts')
                    } catch (error) {
                      toast.error(messageFor(error))
                    }
                  }}
                >
                  {t('delete')}
                </Button>
                <Button
                  onClick={async () => {
                    if ((await confirm({ title: t('postConfirm') })) === false) return
                    try {
                      await postReceipt(id)
                      toast.success(t('posted'))
                      invalidate()
                    } catch (error) {
                      toast.error(messageFor(error))
                    }
                  }}
                >
                  {t('post')}
                </Button>
              </>
            )}
            {isAdm && row.status === 'posted' && (
              <Button
                variant="outline"
                onClick={async () => {
                  if ((await confirm({ title: t('cancelConfirm'), destructive: true })) === false)
                    return
                  try {
                    await cancelReceipt(id)
                    toast.success(t('cancelled'))
                    invalidate()
                  } catch (error) {
                    toast.error(messageFor(error))
                  }
                }}
              >
                {t('cancel')}
              </Button>
            )}
            {canWrite && row.status === 'posted' && row.qcStatus === 'pending' && (
              <>
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      await qcReceipt(id, { status: 'passed' })
                      toast.success(t('qcPassed'))
                      invalidate()
                    } catch (error) {
                      toast.error(messageFor(error))
                    }
                  }}
                >
                  {t('qcPassed')}
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const note = await confirm({ title: t('qcFailed'), requireReason: true })
                    if (note === false) return
                    try {
                      await qcReceipt(id, { status: 'failed', note })
                      toast.success(t('qcFailed'))
                      invalidate()
                    } catch (error) {
                      toast.error(messageFor(error))
                    }
                  }}
                >
                  {t('qcFailed')}
                </Button>
              </>
            )}
            <Button
              variant="outline"
              onClick={() =>
                void downloadFile(
                  `/v1/stock/receipts/${id}/print.pdf`,
                  {},
                  `${row.code}.pdf`,
                ).catch((error) => toast.error(messageFor(error)))
              }
            >
              {t('print')}
            </Button>
          </div>
        }
      />
      <p className="mb-2 font-medium">
        {t('total')} {formatVnd(row.totalAmount)}
      </p>
      <ul className="mb-4 text-sm">
        {row.items.map((item, index) => (
          <li key={index}>
            {item.supplyId} · {item.quantity} × {formatVnd(item.unitCost)}
          </li>
        ))}
      </ul>
      <AttachmentsPanel
        entityType="stock_receipt"
        entityId={id}
        kinds={[
          { value: 'invoice', label: t('attachmentInvoice') },
          { value: 'delivery_note', label: t('attachmentDelivery') },
          { value: 'qc_report', label: 'QC' },
          { value: 'other', label: t('attachmentOther') },
        ]}
      />
      <div className="mt-4">
        <AuditTrail entityType="stock_receipt" entityId={id} />
      </div>
      <Button variant="link" asChild>
        <Link to="/stock/receipts">{t('backToList')}</Link>
      </Button>
    </>
  )
}
