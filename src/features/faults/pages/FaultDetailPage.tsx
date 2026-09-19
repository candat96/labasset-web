import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
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
import { useArchiveFault, useFault, useInvalidateFaults, usePublishFault } from '../hooks'
import type { FaultDetail, FaultScope } from '../types'

const SCOPE_LABEL: Record<FaultScope, string> = {
  model: 'Model',
  group: 'Nhóm',
  all: 'Tất cả',
}

function StepImage({ fileId }: { fileId: string }) {
  const url = useQuery({
    queryKey: ['file-url', fileId],
    queryFn: () => getFileUrl(fileId, true),
  })
  if (!url.data) return null
  return <img src={url.data.url} alt="" className="mt-2 max-h-40 rounded object-contain" />
}

function FaultBody({ row }: { row: FaultDetail }) {
  return (
    <div className="space-y-4">
      {row.symptoms && (
        <section>
          <h2 className="font-medium">Triệu chứng</h2>
          <p className="whitespace-pre-wrap">{row.symptoms}</p>
        </section>
      )}
      {row.causes && (
        <section>
          <h2 className="font-medium">Nguyên nhân</h2>
          <p className="whitespace-pre-wrap">{row.causes}</p>
        </section>
      )}
      <section>
        <h2 className="font-medium">Các bước</h2>
        <ol className="mt-2 list-decimal space-y-3 pl-5">
          {row.steps
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((step) => (
              <li key={step.id}>
                <p>{step.instruction}</p>
                {step.expectedResult && (
                  <p className="text-muted-foreground text-sm">Kỳ vọng: {step.expectedResult}</p>
                )}
                {step.cautions && (
                  <p className="text-destructive text-sm">Lưu ý: {step.cautions}</p>
                )}
                {step.imageFileId && <StepImage fileId={step.imageFileId} />}
              </li>
            ))}
          {row.steps.length === 0 && <p className="text-muted-foreground">Chưa có bước xử lý</p>}
        </ol>
      </section>
      <section>
        <h2 className="font-medium">Linh kiện cần</h2>
        <ul className="mt-2 space-y-1">
          {row.parts.map((part) => (
            <li key={part.id}>
              {part.name} × {part.quantity}
              {part.note ? ` — ${part.note}` : ''}
            </li>
          ))}
          {row.parts.length === 0 && <p className="text-muted-foreground">Chưa có linh kiện</p>}
        </ul>
      </section>
    </div>
  )
}

export function Component() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const detail = useFault(id)
  const canWrite = useCan(STAFF)
  const isAdm = useCan(ADM)
  const { confirm, dialog } = useConfirm()
  const publish = usePublishFault()
  const archive = useArchiveFault()
  const invalidate = useInvalidateFaults()
  const [comment, setComment] = useState('')
  const [version, setVersion] = useState<string>('')
  const versions = useQuery({
    queryKey: ['faults', id, 'versions'],
    queryFn: () => listFaultVersions(id),
    enabled: !!id,
  })
  const snapshot = useQuery({
    queryKey: ['faults', id, 'versions', version],
    queryFn: () => getFaultVersion(id, Number(version)),
    enabled: !!id && !!version,
  })
  const history = useQuery({
    queryKey: ['faults', id, 'history'],
    queryFn: () => listFaultHistory(id),
    enabled: !!id,
  })
  const feedback = useMutation({
    mutationFn: (helpful: boolean) => sendFaultFeedback(id, { helpful, comment: comment || null }),
    onSuccess: () => {
      toast.success('Đã gửi phản hồi')
      setComment('')
      void invalidate()
    },
    onError: (error) => toast.error(messageFor(error)),
  })
  if (detail.isPending) return <p role="status">Đang tải lỗi…</p>
  if (detail.error) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
  const row = detail.data
  const shown = snapshot.data?.snapshot ?? row
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
              map={{ [row.scope]: { label: SCOPE_LABEL[row.scope], tone: 'muted' } }}
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
            {canWrite && (
              <Button variant="outline" asChild>
                <Link to={`/faults/${id}/edit`}>Sửa</Link>
              </Button>
            )}
            {isAdm && (row.status === 'draft' || row.status === 'archived') && (
              <Button
                onClick={async () => {
                  if ((await confirm({ title: 'Ban hành lỗi này?' })) === false) return
                  publish.mutate(id)
                }}
              >
                Ban hành
              </Button>
            )}
            {isAdm && row.status === 'published' && (
              <Button
                variant="outline"
                onClick={async () => {
                  if ((await confirm({ title: 'Lưu trữ lỗi này?', destructive: true })) === false)
                    return
                  archive.mutate(id)
                }}
              >
                Lưu trữ
              </Button>
            )}
          </div>
        }
      />
      <p className="text-muted-foreground mb-4 text-sm">Lượt xem: {row.viewCount}</p>
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="space-y-6">
          <FaultBody row={shown} />
          <section>
            <h2 className="mb-2 font-medium">Tài liệu</h2>
            <AttachmentsPanel
              entityType="fault"
              entityId={id}
              kinds={[
                { value: 'step_image', label: 'Ảnh bước' },
                { value: 'reference', label: 'Tài liệu tham khảo' },
              ]}
              canWrite={canWrite}
            />
          </section>
        </div>
        <aside className="space-y-4">
          <section className="rounded-lg border p-3">
            <h2 className="font-medium">Phản hồi</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              👍 {row.helpfulCount} · 👎 {row.notHelpfulCount}
            </p>
            <Textarea
              className="mt-2"
              aria-label="Góp ý"
              placeholder="Góp ý (không bắt buộc)"
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
                👍 Hữu ích
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={feedback.isPending}
                onClick={() => feedback.mutate(false)}
              >
                👎 Không hữu ích
              </Button>
            </div>
          </section>
          <section className="rounded-lg border p-3">
            <h2 className="font-medium">Lịch sử phiên bản</h2>
            <Select
              value={version || '__current__'}
              onValueChange={(v) => setVersion(v === '__current__' ? '' : v)}
            >
              <SelectTrigger className="mt-2" aria-label="Phiên bản">
                <SelectValue placeholder="Bản hiện tại" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__current__">Bản hiện tại</SelectItem>
                {(versions.data ?? []).map((item) => (
                  <SelectItem key={item.id} value={String(item.version)}>
                    v{item.version} · {formatDateTime(item.changedAt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {snapshot.isPending && version && <p role="status">Đang tải phiên bản…</p>}
          </section>
          <section className="rounded-lg border p-3">
            <h2 className="font-medium">Phiếu sửa chữa liên quan</h2>
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
                <li className="text-muted-foreground">Chưa có phiếu liên quan</li>
              )}
            </ul>
          </section>
        </aside>
      </div>
    </>
  )
}
