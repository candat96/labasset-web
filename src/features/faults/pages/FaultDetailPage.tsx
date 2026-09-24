import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { PageHeader, PageMeta } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { ActionMenu } from '@/components/page/ActionMenu'
import { DataList } from '@/components/page/DataList'
import { DetailSkeleton } from '@/components/page/DetailSkeleton'
import { EmptyState } from '@/components/page/EmptyState'
import { Timeline } from '@/components/timeline'
import { ErrorState } from '@/components/page/ErrorState'
import {
  AlertTriangle,
  Archive,
  CalendarClock,
  Pencil,
  Eye,
  Hash,
  ListChecks,
  Package,
  ThumbsDown,
  ThumbsUp,
  Timer,
  Wrench,
} from 'lucide-react'
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
  return (
    <img
      src={url.data.url}
      alt=""
      className="border-divider mt-2 max-h-48 rounded-lg border object-contain"
    />
  )
}

function FaultBody({ row }: { row: FaultDetail }) {
  const { t } = useTranslation('faults')
  const steps = row.steps.slice().sort((a, b) => a.order - b.order)
  return (
    <>
      {(row.symptoms || row.causes) && (
        <SectionCard title={t('detail.description', { defaultValue: 'Mô tả lỗi' })}>
          <DataList
            columns={1}
            items={[
              {
                label: t('detail.symptoms'),
                value: row.symptoms ? (
                  <span className="whitespace-pre-wrap">{row.symptoms}</span>
                ) : null,
                full: true,
              },
              {
                label: t('detail.causes'),
                value: row.causes ? (
                  <span className="whitespace-pre-wrap">{row.causes}</span>
                ) : null,
                full: true,
              },
            ]}
          />
        </SectionCard>
      )}
      <SectionCard
        title={t('detail.steps')}
        description={
          steps.length
            ? t('detail.stepCount', { defaultValue: '{{n}} bước xử lý', n: steps.length })
            : undefined
        }
      >
        {steps.length === 0 ? (
          <EmptyState icon={ListChecks} title={t('detail.noSteps')} />
        ) : (
          <ol className="space-y-4">
            {steps.map((step, index) => (
              <li key={step.id} className="flex gap-3">
                <span className="bg-primary-soft text-primary flex size-7 shrink-0 items-center justify-center rounded-full text-[12.5px] font-bold tabular-nums">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] leading-5 font-medium whitespace-pre-wrap">
                    {step.instruction}
                  </p>
                  {step.expectedResult && (
                    <p className="text-muted-foreground mt-1 text-[13px] leading-5">
                      {t('detail.expected', { text: step.expectedResult })}
                    </p>
                  )}
                  {step.cautions && (
                    <p className="bg-warning-bg text-warning-fg mt-2 inline-flex items-start gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] leading-5">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      {t('detail.cautions', { text: step.cautions })}
                    </p>
                  )}
                  {step.imageFileId && <StepImage fileId={step.imageFileId} />}
                </div>
              </li>
            ))}
          </ol>
        )}
      </SectionCard>
      <SectionCard title={t('detail.parts')}>
        {row.parts.length === 0 ? (
          <EmptyState icon={Package} title={t('detail.noParts')} />
        ) : (
          <ul className="divide-divider divide-y">
            {row.parts.map((part) => (
              <li
                key={part.id}
                className="flex items-baseline justify-between gap-3 py-2 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-medium">{part.name}</p>
                  {part.note && <p className="text-muted-foreground text-[12.5px]">{part.note}</p>}
                </div>
                <span className="bg-surface-2 shrink-0 rounded-md px-2 py-0.5 text-[13px] font-semibold tabular-nums">
                  × {part.quantity}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </>
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
  if (detail.isPending) return <DetailSkeleton label={t('detail.loading')} />
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data
  const shown = snapshot.data?.snapshot ?? row
  const canEdit = canWrite && row.status !== 'archived'
  const canVote = row.status === 'published'
  return (
    <>
      {dialog}
      <PageHeader
        eyebrow={t('title', { defaultValue: 'Thư viện lỗi' })}
        title={row.title}
        meta={
          <>
            {row.errorCode && <PageMeta icon={<Hash />}>{row.errorCode}</PageMeta>}
            {row.model && <PageMeta icon={<Wrench />}>{row.model}</PageMeta>}
            {row.estMinutes != null && (
              <PageMeta icon={<Timer />}>
                {t('detail.estMinutes', { defaultValue: '~{{n}} phút', n: row.estMinutes })}
              </PageMeta>
            )}
            <PageMeta icon={<Eye />}>{t('detail.viewCount', { n: row.viewCount })}</PageMeta>
            <PageMeta icon={<CalendarClock />}>{formatDateTime(row.updatedAt)}</PageMeta>
          </>
        }
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
          <ActionMenu
            items={[
              isAdm &&
                (row.status === 'draft' || row.status === 'archived') && {
                  key: 'publish',
                  label: t('detail.publish'),
                  variant: 'primary' as const,
                  onClick: () => {
                    void (async () => {
                      if ((await confirm({ title: t('detail.publishConfirm') })) === false) return
                      publish.mutate(id)
                    })()
                  },
                },
              canEdit && {
                key: 'edit',
                label: tc('actions.edit'),
                icon: <Pencil />,
                to: `/faults/${id}/edit`,
              },
              isAdm &&
                row.status === 'published' && {
                  key: 'archive',
                  label: t('detail.archive'),
                  icon: <Archive />,
                  onClick: () => {
                    void (async () => {
                      if (
                        (await confirm({
                          title: t('detail.archiveConfirm'),
                          destructive: true,
                        })) === false
                      )
                        return
                      archive.mutate(id)
                    })()
                  },
                },
            ]}
          />
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <FaultBody row={shown} />
          <SectionCard title={t('detail.documents')}>
            <AttachmentsPanel
              entityType="fault"
              entityId={id}
              kinds={[
                { value: 'step_image', label: t('attachments.stepImage') },
                { value: 'reference', label: t('attachments.reference') },
              ]}
              canWrite={canEdit}
            />
          </SectionCard>
        </div>
        <div className="space-y-5">
          <SectionCard
            title={t('detail.feedback')}
            actions={
              <span className="text-muted-foreground inline-flex items-center gap-3 text-[13px] tabular-nums">
                <span className="inline-flex items-center gap-1">
                  <ThumbsUp className="text-success size-3.5" aria-hidden />
                  {row.helpfulCount}
                </span>
                <span className="inline-flex items-center gap-1">
                  <ThumbsDown className="text-destructive size-3.5" aria-hidden />
                  {row.notHelpfulCount}
                </span>
              </span>
            }
          >
            {canVote ? (
              <>
                <Textarea
                  aria-label={t('detail.comment')}
                  placeholder={t('detail.commentPlaceholder')}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                />
                <div className="mt-3 flex gap-2">
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
              <p className="text-muted-foreground text-[13px]">{t('detail.feedbackLocked')}</p>
            )}
          </SectionCard>
          <SectionCard title={t('detail.versions')}>
            <Select
              value={version || '__current__'}
              onValueChange={(v) => setVersion(v === '__current__' ? '' : v)}
            >
              <SelectTrigger className="w-full" aria-label={t('detail.version')}>
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
            {snapshot.isPending && version && (
              <p role="status" className="text-muted-foreground mt-2 text-[13px]">
                {t('detail.loadingVersion')}
              </p>
            )}
            <Timeline
              className="mt-4"
              events={[
                {
                  at: row.createdAt,
                  title: t('detail.createdAt', { defaultValue: 'Tạo' }),
                  tone: 'muted',
                },
                ...(row.publishedAt
                  ? [{ at: row.publishedAt, title: t('detail.publish'), tone: 'success' as const }]
                  : []),
              ]}
            />
          </SectionCard>
          <SectionCard title={t('detail.related')}>
            <ul className="space-y-3">
              {(history.data ?? []).map((item) => (
                <li key={item.id} className="min-w-0">
                  <button
                    type="button"
                    className="text-primary text-[14px] font-semibold hover:underline"
                    onClick={() => navigate(`/repairs/${item.id}`)}
                  >
                    {item.code}
                  </button>
                  <p className="text-muted-foreground text-[12.5px]">
                    {item.equipment.code} – {item.equipment.name}
                  </p>
                  <p className="text-subtle text-[12px] tabular-nums">
                    {formatDateTime(item.createdAt)}
                  </p>
                </li>
              ))}
              {(history.data ?? []).length === 0 && (
                <li className="text-muted-foreground text-[13px]">{t('detail.noRelated')}</li>
              )}
            </ul>
          </SectionCard>
        </div>
      </div>
    </>
  )
}
