import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { StatusBadge } from '@/components/status-badge'
import { AttachmentsPanel } from '@/components/attachments-panel'
import { useConfirm } from '@/components/confirm-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { faultSeverityMap, faultStatusMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { useCan } from '@/app/guards/useCan'
import { ADM, STAFF } from '@/routes/roles'
import { getFileUrl } from '@/api/files'
import { messageFor } from '@/api/errors'
import { getFaultVersion, listFaultHistory, listFaultVersions, sendFaultFeedback } from '../api'
import { faultKeys, useArchiveFault, useFault, useInvalidateFault, usePublishFault } from '../hooks'
import type { FaultDetail } from '../types'

function StepImage({ fileId }: { fileId: string }) {
  const url = useQuery({
    queryKey: ['file-url', fileId, true],
    queryFn: () => getFileUrl(fileId, true),
  })
  if (!url.data) return null
  return <img src={url.data.url} alt="" className="mt-2 max-h-40 rounded object-contain" />
}

function FaultBody({ row }: { row: FaultDetail }) {
  const { t } = useTranslation('faults')
  return (
    <div className="space-y-4">
      {row.symptoms && (
        <section>
          <h2 className="font-medium">{t('detail.symptoms')}</h2>
          <p className="whitespace-pre-wrap">{row.symptoms}</p>
        </section>
      )}
      {row.causes && (
        <section>
          <h2 className="font-medium">{t('detail.causes')}</h2>
          <p className="whitespace-pre-wrap">{row.causes}</p>
        </section>
      )}
      <section>
        <h2 className="font-medium">{t('detail.steps')}</h2>
        <ol className="mt-2 list-decimal space-y-3 pl-5">
          {row.steps
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((step) => (
              <li key={step.id}>
                <p>{step.instruction}</p>
                {step.expectedResult && (
                  <p className="text-muted-foreground text-sm">
                    {t('detail.expected', { text: step.expectedResult })}
                  </p>
                )}
                {step.cautions && (
                  <p className="text-destructive text-sm">
                    {t('detail.cautions', { text: step.cautions })}
                  </p>
                )}
                {step.imageFileId && <StepImage fileId={step.imageFileId} />}
              </li>
            ))}
          {row.steps.length === 0 && <p className="text-muted-foreground">{t('detail.noSteps')}</p>}
        </ol>
      </section>
      <section>
        <h2 className="font-medium">{t('detail.parts')}</h2>
        <ul className="mt-2 space-y-1">
          {row.parts.map((part) => (
            <li key={part.id}>
              {part.name} × {part.quantity}
              {part.note ? ` — ${part.note}` : ''}
            </li>
          ))}
          {row.parts.length === 0 && <p className="text-muted-foreground">{t('detail.noParts')}</p>}
        </ul>
      </section>
    </div>
  )
}

export function Component() {
  const { t } = useTranslation('faults')
  const { t: tc } = useTranslation()
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const detail = useFault(id)
  const canWrite = useCan(STAFF)
  const isAdm = useCan(ADM)
  const { confirm, dialog } = useConfirm()
  const publish = usePublishFault()
  const archive = useArchiveFault()
  const invalidate = useInvalidateFault()
  const [comment, setComment] = useState('')
  const [version, setVersion] = useState<string>('')
  const versions = useQuery({
    queryKey: faultKeys.versions(id),
    queryFn: () => listFaultVersions(id),
    enabled: !!id,
  })
  const snapshot = useQuery({
    queryKey: faultKeys.version(id, version),
    queryFn: () => getFaultVersion(id, Number(version)),
    enabled: !!id && !!version,
  })
  const history = useQuery({
    queryKey: faultKeys.history(id),
    queryFn: () => listFaultHistory(id),
    enabled: !!id,
  })
  const feedback = useMutation({
    mutationFn: (helpful: boolean) => sendFaultFeedback(id, { helpful, comment: comment || null }),
    onSuccess: () => {
      toast.success(t('detail.feedbackSent'))
      setComment('')
      invalidate(id)
    },
    onError: (error) => toast.error(messageFor(error)),
  })
  if (detail.isPending) return <p role="status">{t('detail.loading')}</p>
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data
  const shown = snapshot.data?.snapshot ?? row
  const canEdit = canWrite && row.status !== 'archived'
  const canVote = row.status === 'published'
  return (
    <>
      {dialog}
      <PageHeader
        title={row.title}
        description={row.errorCode ?? undefined}
        badge={
          <div className="flex flex-wrap gap-1">
            <StatusBadge
              value={row.scope}
              map={{ [row.scope]: { label: t(`scope.${row.scope}`), tone: 'muted' } }}
            />
            <StatusBadge value={row.severity} map={faultSeverityMap} />
            <StatusBadge value={row.status} map={faultStatusMap} />
            <StatusBadge
              value={`v${row.version}`}
              map={{ [`v${row.version}`]: { label: `v${row.version}`, tone: 'muted' } }}
            />
          </div>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Button variant="outline" asChild>
                <Link to={`/faults/${id}/edit`}>{tc('actions.edit')}</Link>
              </Button>
            )}
            {isAdm && (row.status === 'draft' || row.status === 'archived') && (
              <Button
                onClick={async () => {
                  if ((await confirm({ title: t('detail.publishConfirm') })) === false) return
                  publish.mutate(id)
                }}
              >
                {t('detail.publish')}
              </Button>
            )}
            {isAdm && row.status === 'published' && (
              <Button
                variant="outline"
                onClick={async () => {
                  if (
                    (await confirm({ title: t('detail.archiveConfirm'), destructive: true })) ===
                    false
                  )
                    return
                  archive.mutate(id)
                }}
              >
                {t('detail.archive')}
              </Button>
            )}
          </div>
        }
      />
      <p className="text-muted-foreground mb-4 text-sm">
        {t('detail.viewCount', { n: row.viewCount })}
      </p>
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <FaultBody row={shown} />
          <section>
            <h2 className="mb-2 font-medium">{t('detail.documents')}</h2>
            <AttachmentsPanel
              entityType="fault"
              entityId={id}
              kinds={[
                { value: 'step_image', label: t('attachments.stepImage') },
                { value: 'reference', label: t('attachments.reference') },
              ]}
              canWrite={canEdit}
            />
          </section>
        </div>
        <aside className="space-y-4">
          <section className="rounded-lg border p-3">
            <h2 className="font-medium">{t('detail.feedback')}</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              👍 {row.helpfulCount} · 👎 {row.notHelpfulCount}
            </p>
            {canVote ? (
              <>
                <Textarea
                  className="mt-2"
                  aria-label={t('detail.comment')}
                  placeholder={t('detail.commentPlaceholder')}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={feedback.isPending}
                    onClick={() => feedback.mutate(true)}
                  >
                    {t('detail.helpful')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={feedback.isPending}
                    onClick={() => feedback.mutate(false)}
                  >
                    {t('detail.notHelpful')}
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground mt-2 text-xs">{t('detail.feedbackLocked')}</p>
            )}
          </section>
          <section className="rounded-lg border p-3">
            <h2 className="font-medium">{t('detail.versions')}</h2>
            <Select
              value={version || '__current__'}
              onValueChange={(v) => setVersion(v === '__current__' ? '' : v)}
            >
              <SelectTrigger className="mt-2" aria-label={t('detail.version')}>
                <SelectValue placeholder={t('detail.currentVersion')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__current__">{t('detail.currentVersion')}</SelectItem>
                {(versions.data ?? []).map((item) => (
                  <SelectItem key={item.id} value={String(item.version)}>
                    v{item.version} · {formatDateTime(item.changedAt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {snapshot.isPending && version && <p role="status">{t('detail.loadingVersion')}</p>}
          </section>
          <section className="rounded-lg border p-3">
            <h2 className="font-medium">{t('detail.related')}</h2>
            <ul className="mt-2 space-y-2 text-sm">
              {(history.data ?? []).map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => navigate(`/repairs/${item.id}`)}
                  >
                    {item.code}
                  </button>
                  <span className="text-muted-foreground">
                    {' '}
                    · {item.equipment.code} – {item.equipment.name} ·{' '}
                    {formatDateTime(item.createdAt)}
                  </span>
                </li>
              ))}
              {(history.data ?? []).length === 0 && (
                <li className="text-muted-foreground">{t('detail.noRelated')}</li>
              )}
            </ul>
          </section>
        </aside>
      </div>
    </>
  )
}
