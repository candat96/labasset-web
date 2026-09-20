import { useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { useTranslation } from 'react-i18next'

export function Component() {
  const { t } = useTranslation('inventory')

  const { id = '' } = useParams()
  const detail = useQuery({
    queryKey: ['stock', 'issues', id],
    queryFn: () => getIssue(id),
    enabled: !!id,
  })
  const canWrite = useCan(STAFF)
  const qc = useQueryClient()
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['stock', 'issues'] })
    void qc.invalidateQueries({ queryKey: ['stock', 'balances'] })
    void qc.invalidateQueries({ queryKey: ['stock', 'lots'] })
  }
  const { confirm, dialog } = useConfirm()
  if (detail.isPending) return <p role="status">{t('loadingIssue')}</p>
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
                if ((await confirm({ title: t('postConfirm') })) === false) return
                try {
                  await postIssue(id)
                  toast.success(t('posted'))
                  invalidate()
                } catch (error) {
                  toast.error(messageFor(error))
                }
              }}
            >
              {t('post')}
            </Button>
          )
        }
      />
      {row.fefoWarning && <p className="text-destructive text-sm">{t('fefoWarning')}</p>}
      <AttachmentsPanel
        entityType="stock_issue"
        entityId={id}
        kinds={[
          { value: 'signature', label: t('attachmentSignature') },
          { value: 'photo', label: t('attachmentPhoto') },
          { value: 'other', label: t('attachmentOther') },
        ]}
      />
      <div className="mt-4">
        <AuditTrail entityType="stock_issue" entityId={id} />
      </div>
    </>
  )
}
