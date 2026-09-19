import { useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { AttachmentsPanel } from '@/components/attachments-panel'
import { AuditTrail } from '@/components/audit-trail'
import { useConfirm } from '@/components/confirm-dialog'
import { stockDocStatusMap } from '@/lib/status-maps'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { messageFor } from '@/api/errors'
import { getIssue, postIssue } from '../api'

export function Component() {
  const { id = '' } = useParams()
  const detail = useQuery({
    queryKey: ['stock', 'issues', id],
    queryFn: () => getIssue(id),
    enabled: !!id,
  })
  const canWrite = useCan(STAFF)
  const { confirm, dialog } = useConfirm()
  if (detail.isPending) return <p role="status">Đang tải phiếu xuất…</p>
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data
  return (
    <>
      {dialog}
      <PageHeader
        title={row.code}
        badge={<StatusBadge value={row.status} map={stockDocStatusMap} />}
        actions={
          canWrite &&
          row.status === 'draft' && (
            <Button
              onClick={async () => {
                if ((await confirm({ title: 'Ghi sổ?' })) === false) return
                try {
                  await postIssue(id)
                  toast.success('Đã ghi sổ')
                  void detail.refetch()
                } catch (error) {
                  toast.error(messageFor(error))
                }
              }}
            >
              Ghi sổ
            </Button>
          )
        }
      />
      {row.fefoWarning && <p className="text-destructive text-sm">Cảnh báo không theo FEFO</p>}
      <AttachmentsPanel
        entityType="stock_issue"
        entityId={id}
        kinds={[
          { value: 'signature', label: 'Chữ ký' },
          { value: 'photo', label: 'Ảnh' },
          { value: 'other', label: 'Khác' },
        ]}
      />
      <div className="mt-4">
        <AuditTrail entityType="stock_issue" entityId={id} />
      </div>
    </>
  )
}
