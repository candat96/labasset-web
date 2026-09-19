import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, unwrap } from '@/api/client'
import type { components } from '@/api/schema'
import { getFileUrl } from '@/api/files'
import { messageFor } from '@/api/errors'
import { FileField } from './form/file-field'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { useConfirm } from './confirm-dialog'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
type Attachment = components['schemas']['AttachmentViewDto']
function AttachmentItem({
  row,
  canWrite,
  remove,
}: {
  row: Attachment
  canWrite: boolean
  remove: () => void
}) {
  const [preview, setPreview] = useState(false)
  const [isImage, setIsImage] = useState(true)
  const url = useQuery({
    queryKey: ['file-url', row.fileId],
    queryFn: () => getFileUrl(row.fileId),
    staleTime: 600000,
  })
  return (
    <li className="flex items-center gap-3 rounded border p-2">
      {url.data && isImage && (
        <button
          type="button"
          aria-label={`Xem ảnh ${row.label ?? row.kind}`}
          onClick={() => setPreview(true)}
        >
          <img
            className="size-16 rounded object-cover"
            src={url.data.url}
            alt={row.label ?? row.kind}
            onError={() => setIsImage(false)}
          />
        </button>
      )}
      <div className="min-w-0 flex-1">
        {url.data ? (
          <a
            className="text-primary hover:underline"
            href={url.data.url}
            target="_blank"
            rel="noreferrer"
          >
            {row.label ?? row.kind}
          </a>
        ) : (
          <span>{row.label ?? row.kind}</span>
        )}
        {url.error && (
          <p role="alert">
            {messageFor(url.error)}{' '}
            <Button variant="ghost" size="sm" onClick={() => void url.refetch()}>
              Thử lại
            </Button>
          </p>
        )}
      </div>
      {canWrite && (
        <Button variant="ghost" onClick={remove}>
          Xoá
        </Button>
      )}
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{row.label ?? row.kind}</DialogTitle>
          </DialogHeader>
          <img
            className="max-h-[75vh] w-full object-contain"
            src={url.data?.url}
            alt={row.label ?? row.kind}
          />
        </DialogContent>
      </Dialog>
    </li>
  )
}
export function AttachmentsPanel({
  entityType,
  entityId,
  kinds,
  canWrite: permission,
}: {
  entityType: string
  entityId: string
  kinds: { value: string; label: string }[]
  canWrite?: boolean
}) {
  const staff = useCan(STAFF)
  const canWrite = permission ?? staff
  const qc = useQueryClient()
  const key = ['attachments', entityType, entityId]
  const list = useQuery({
    queryKey: key,
    queryFn: () =>
      unwrap(api.GET('/v1/attachments', { params: { query: { entityType, entityId } } })),
  })
  const { confirm, dialog } = useConfirm()
  const [pending, setPending] = useState<{ fileId: string; kind: string } | null>(null)
  const invalidate = () => qc.invalidateQueries({ queryKey: key })
  const attach = useMutation({
    mutationFn: (body: { fileId: string; kind: string }) =>
      unwrap(api.POST('/v1/attachments', { body: { ...body, entityType, entityId } })),
    onSuccess: () => {
      setPending(null)
      void invalidate()
      toast.success('Đã đính kèm')
    },
    onError: (e) => toast.error(messageFor(e)),
  })
  const remove = useMutation({
    mutationFn: (id: string) =>
      unwrap(api.DELETE('/v1/attachments/{id}', { params: { path: { id } } })),
    onSuccess: invalidate,
    onError: (e) => toast.error(messageFor(e)),
  })
  const groups = [
    ...kinds,
    ...[...new Set((list.data ?? []).map((r) => r.kind))]
      .filter((k) => !kinds.some((x) => x.value === k))
      .map((value) => ({ value, label: value })),
  ]
  return (
    <div className="space-y-4">
      {list.isPending && <p role="status">Đang tải đính kèm…</p>}
      {list.error && (
        <div role="alert">
          {messageFor(list.error)} <Button onClick={() => void list.refetch()}>Thử lại</Button>
        </div>
      )}
      {groups.map((kind) => (
        <section key={kind.value} className="space-y-2">
          <h3 className="font-medium">{kind.label}</h3>
          <ul className="space-y-2">
            {list.data
              ?.filter((r) => r.kind === kind.value)
              .map((row) => (
                <AttachmentItem
                  key={row.id}
                  row={row}
                  canWrite={canWrite && !remove.isPending}
                  remove={async () => {
                    if (
                      (await confirm({
                        title: `Xoá ${row.label ?? kind.label}?`,
                        destructive: true,
                      })) !== false
                    )
                      remove.mutate(row.id)
                  }}
                />
              ))}
          </ul>
          {canWrite && kinds.some((k) => k.value === kind.value) && (
            <FileField
              label={`Thêm ${kind.label}`}
              value={pending?.kind === kind.value ? pending.fileId : null}
              disabled={attach.isPending}
              onChange={(fileId) => {
                if (fileId) {
                  const next = { fileId, kind: kind.value }
                  setPending(next)
                  attach.mutate(next)
                } else setPending(null)
              }}
            />
          )}
        </section>
      ))}
      {pending && attach.isError && (
        <Button disabled={attach.isPending} onClick={() => attach.mutate(pending)}>
          Thử gắn lại tệp đã tải
        </Button>
      )}
      {dialog}
    </div>
  )
}
