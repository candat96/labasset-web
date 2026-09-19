import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
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
import { cancelReceipt, getReceipt, postReceipt, qcReceipt } from '../api'

export function Component() {
  const { id = '' } = useParams()
  const detail = useQuery({
    queryKey: ['stock', 'receipts', id],
    queryFn: () => getReceipt(id),
    enabled: !!id,
  })
  const canWrite = useCan(STAFF)
  const isAdm = useCan(ADM)
  const { confirm, dialog } = useConfirm()
  if (detail.isPending) return <p role="status">Đang tải phiếu nhập…</p>
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
              <Button
                onClick={async () => {
                  if ((await confirm({ title: 'Ghi sổ?' })) === false) return
                  await postReceipt(id)
                  toast.success('Đã ghi sổ')
                  void detail.refetch()
                }}
              >
                Ghi sổ
              </Button>
            )}
            {isAdm && row.status === 'posted' && (
              <Button
                variant="outline"
                onClick={async () => {
                  if ((await confirm({ title: 'Huỷ phiếu?', destructive: true })) === false) return
                  try {
                    await cancelReceipt(id)
                    toast.success('Đã huỷ')
                    void detail.refetch()
                  } catch (error) {
                    toast.error(messageFor(error))
                  }
                }}
              >
                Huỷ
              </Button>
            )}
            {canWrite && row.status === 'posted' && row.qcStatus === 'pending' && (
              <Button
                variant="outline"
                onClick={async () => {
                  await qcReceipt(id, { status: 'passed' })
                  toast.success('QC đạt')
                  void detail.refetch()
                }}
              >
                QC đạt
              </Button>
            )}
          </div>
        }
      />
      <p className="mb-2 font-medium">Tổng: {formatVnd(row.totalAmount)}</p>
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
          { value: 'invoice', label: 'Hoá đơn' },
          { value: 'delivery_note', label: 'Phiếu giao' },
          { value: 'qc_report', label: 'QC' },
          { value: 'other', label: 'Khác' },
        ]}
      />
      <div className="mt-4">
        <AuditTrail entityType="stock_receipt" entityId={id} />
      </div>
      <Button variant="link" asChild>
        <Link to="/stock/receipts">Danh sách</Link>
      </Button>
    </>
  )
}
