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
import { api, unwrapAs } from '@/api/client'
import { supplyOptions } from '@/api/references'
import { downloadFile } from '@/api/download'
import { cancelReceipt, deleteReceipt, getReceipt, postReceipt, qcReceipt } from '../api'
import { useTranslation } from 'react-i18next'

export function Component() {
  const { t } = useTranslation('inventory')

  const { id = '' } = useParams()
  const navigate = useNavigate()
  const canWrite = useCan(STAFF)
  const isAdm = useCan(ADM)
  const detail = useQuery({
    queryKey: ['stock', 'receipts', id],
    queryFn: () => getReceipt(id),
    enabled: !!id,
  })
  const supplies = useQuery({
    queryKey: ['supply-options', 'receipt', id],
    queryFn: () => supplyOptions(''),
  })
  const settings = useQuery({
    queryKey: ['settings', 'stock-cancel-window'],
    queryFn: () => unwrapAs<Record<string, unknown>>(api.GET('/v1/settings')),
    enabled: isAdm,
  })
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
  const extended = row as typeof row & {
    warnings?: string[]
  }
  const receiptItems = row.items as Array<
    (typeof row.items)[number] & { lotId?: string; supplyName?: string }
  >
  const supplyNames = new Map((supplies.data ?? []).map((option) => [option.id, option.name]))
  const windowDays = Number(settings.data?.['stock.cancelWindowDays'] ?? 30)
  const daysRemaining = row.postedAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(row.postedAt).getTime() + windowDays * 86_400_000 - Date.now()) / 86_400_000,
        ),
      )
    : 0
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
                {t('cancelWithDays', { days: daysRemaining })}
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
      {!!extended.warnings?.length && (
        <div className="border-warning bg-warning/10 mb-3 rounded border p-3 text-sm" role="alert">
          <p className="font-medium">{t('receiptWarnings')}</p>
          <ul className="list-disc pl-5">
            {extended.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
      <ul className="mb-4 text-sm">
        {receiptItems.map((item, index) => (
          <li key={index}>
            {item.supplyName ?? supplyNames.get(item.supplyId) ?? item.supplyId.slice(0, 8)} ·{' '}
            {item.quantity} × {formatVnd(item.unitCost)}
            {item.lotId && (
              <>
                {' · '}
                <Link
                  className="text-primary hover:underline"
                  to={`/stock/lots?lotId=${item.lotId}`}
                >
                  {item.lotNo ?? t('lot')}
                </Link>
              </>
            )}
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
