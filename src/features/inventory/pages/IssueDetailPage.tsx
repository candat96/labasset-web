import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SignaturePad } from '@/components/signature-pad'
import { StatusBadge } from '@/components/status-badge'
import { AttachmentsPanel } from '@/components/attachments-panel'
import { AuditTrail } from '@/components/audit-trail'
import { useConfirm } from '@/components/confirm-dialog'
import { stockDocStatusMap } from '@/lib/status-maps'
import { useCan } from '@/app/guards/useCan'
import { ADM, STAFF } from '@/routes/roles'
import { messageFor } from '@/api/errors'
import { downloadFile } from '@/api/download'
import { uploadFile } from '@/api/files'
import { cancelIssue, deleteIssue, getIssue, postIssue, updateIssue } from '../api'
import { useTranslation } from 'react-i18next'

export function Component() {
  const { t } = useTranslation('inventory')

  const { id = '' } = useParams()
  const navigate = useNavigate()
  const detail = useQuery({
    queryKey: ['stock', 'issues', id],
    queryFn: () => getIssue(id),
    enabled: !!id,
  })
  const canWrite = useCan(STAFF)
  const isAdm = useCan(ADM)
  const [signOpen, setSignOpen] = useState(false)
  const [signatureFile, setSignatureFile] = useState<File | null>(null)
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
          <div className="flex flex-wrap gap-2">
            {canWrite && row.status === 'draft' && (
              <Button asChild variant="outline">
                <Link to={`/stock/issues/${id}/edit`}>{t('edit')}</Link>
              </Button>
            )}
            {canWrite && row.status === 'draft' && (
              <Button variant="outline" onClick={() => setSignOpen(true)}>
                {t('receiverSignature')}
              </Button>
            )}
            {canWrite && row.status === 'draft' && (
              <Button
                variant="outline"
                onClick={async () => {
                  if ((await confirm({ title: t('deleteConfirm'), destructive: true })) === false)
                    return
                  try {
                    await deleteIssue(id)
                    invalidate()
                    navigate('/stock/issues')
                  } catch (error) {
                    toast.error(messageFor(error))
                  }
                }}
              >
                {t('delete')}
              </Button>
            )}
            {canWrite && row.status === 'draft' && (
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
            )}
            {isAdm && row.status === 'posted' && (
              <Button
                variant="outline"
                onClick={async () => {
                  if ((await confirm({ title: t('cancelConfirm'), destructive: true })) === false)
                    return
                  try {
                    await cancelIssue(id)
                    invalidate()
                  } catch (error) {
                    toast.error(messageFor(error))
                  }
                }}
              >
                {t('cancel')}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() =>
                void downloadFile(`/v1/stock/issues/${id}/print.pdf`, {}, `${row.code}.pdf`).catch(
                  (error) => toast.error(messageFor(error)),
                )
              }
            >
              {t('print')}
            </Button>
          </div>
        }
      />
      {row.fefoWarning && <p className="text-destructive text-sm">{t('fefoWarning')}</p>}
      <ul className="my-4 space-y-1 text-sm">
        {row.items.map((item, index) => (
          <li key={`${item.supplyId}-${index}`}>
            {item.supplyId} · {item.quantity}
          </li>
        ))}
      </ul>
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
      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('receiverSignature')}</DialogTitle>
          </DialogHeader>
          <SignaturePad onFile={setSignatureFile} />
          <DialogFooter>
            <Button
              disabled={!signatureFile}
              onClick={async () => {
                if (!signatureFile) return
                try {
                  const fileId = await uploadFile(signatureFile)
                  await updateIssue(id, { receiverSignatureFileId: fileId })
                  toast.success(t('signatureSaved'))
                  setSignOpen(false)
                  invalidate()
                } catch (error) {
                  toast.error(messageFor(error))
                }
              }}
            >
              {t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
