import { useState } from 'react'
import { ImageIcon, Trash2 } from 'lucide-react'
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
type Attachment = components['schemas']['AttachmentViewDto'] & { mime?: string }

function looksLikeImage(row: Attachment) {
  if (row.kind === 'photo') return true
  const mime = row.mime ?? ''
  if (mime.startsWith('image/')) return true
  const name = `${row.label ?? ''} ${row.kind ?? ''}`
  return /\.(png|jpe?g|gif|webp)$/i.test(name)
}

function AttachmentItem({
  row,
  canWrite,
  remove,
  grid = false,
}: {
  row: Attachment
  canWrite: boolean
  remove: () => void
  grid?: boolean
}) {
  const [preview, setPreview] = useState(false)
  const isImage = looksLikeImage(row)
  const name = row.label || (row.kind === 'photo' ? 'Ảnh tình trạng' : row.kind)
  const url = useQuery({
    queryKey: ['file-url', row.fileId, isImage],
    queryFn: () => getFileUrl(row.fileId, isImage),
    staleTime: 600000,
  })
  const original = useQuery({
    queryKey: ['file-url', row.fileId, false],
    queryFn: () => getFileUrl(row.fileId),
    enabled: preview && isImage,
    staleTime: 600000,
  })
  return (
    <li
      className={
        grid
          ? 'border-divider overflow-hidden rounded-xl border'
          : 'border-divider flex items-center gap-3 rounded-lg border p-2.5'
      }
    >
      {grid ? (
        <button
          type="button"
          className="bg-muted/40 block aspect-square w-full overflow-hidden focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`Xem ảnh ${name}`}
          onClick={() => setPreview(true)}
          disabled={!url.data}
        >
          {url.data ? (
            <img
              className="size-full object-cover transition-transform hover:scale-105"
              src={url.data.url}
              alt={name}
              loading="lazy"
            />
          ) : (
            <ImageIcon className="text-muted-foreground mx-auto size-8" />
          )}
        </button>
      ) : (
        url.data &&
        isImage && (
          <button
            type="button"
            aria-label={`Xem ảnh ${row.label ?? row.kind}`}
            onClick={() => setPreview(true)}
          >
            <img
              className="size-16 rounded object-cover"
              src={url.data.url}
              alt={row.label ?? row.kind}
            />
          </button>
        )
      )}
      <div className={grid ? 'flex min-w-0 items-center gap-1 px-2 py-1.5' : 'min-w-0 flex-1'}>
        {grid ? (
          <span className="min-w-0 flex-1 truncate text-xs" title={name}>
            {name}
          </span>
        ) : (
          <>
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
          </>
        )}
        {grid && canWrite && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive size-7 shrink-0"
            aria-label={`Xoá ${name}`}
            onClick={remove}
          >
            <Trash2 className="size-3.5" />
          </Button>
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
      {!grid && canWrite && (
        <Button variant="ghost" onClick={remove}>
          Xoá
        </Button>
      )}
      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
          </DialogHeader>
          {original.isPending && <p role="status">Đang tải ảnh gốc…</p>}
          {original.error && <p role="alert">{messageFor(original.error)}</p>}
          <img className="max-h-[75vh] w-full object-contain" src={original.data?.url} alt={name} />
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
  photosOnly = false,
}: {
  entityType: string
  entityId: string
  kinds: { value: string; label: string }[]
  canWrite?: boolean
  photosOnly?: boolean
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
    ...[...new Set((photosOnly ? [] : (list.data ?? [])).map((r) => r.kind))]
      .filter((k) => !kinds.some((x) => x.value === k))
      .map((value) => ({ value, label: value })),
  ]
  return (
    <div className="space-y-4">
      {photosOnly && (
        <p className="text-muted-foreground text-sm">
          Ảnh chỉ thuộc lần xử lý này. Bấm vào ảnh để xem lớn.
        </p>
      )}
      {list.isPending && <p role="status">Đang tải đính kèm…</p>}
      {list.error && (
        <div role="alert">
          {messageFor(list.error)} <Button onClick={() => void list.refetch()}>Thử lại</Button>
        </div>
      )}
      {groups.map((kind) => (
        <section key={kind.value} className="space-y-2">
          {!photosOnly && (
            <h3 className="text-muted-foreground text-[12.5px] font-semibold tracking-[0.04em] uppercase">
              {kind.label}
            </h3>
          )}
          <ul
            className={
              kind.value === 'photo'
                ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                : 'space-y-2'
            }
          >
            {list.data
              ?.filter((r) => r.kind === kind.value)
              .map((row) => (
                <AttachmentItem
                  key={row.id}
                  row={row}
                  grid={kind.value === 'photo'}
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
          <div className="flex flex-wrap items-start gap-2 pt-1">
            {canWrite && kinds.some((k) => k.value === kind.value) && (
              <FileField
                label={kind.value === 'photo' ? 'Chọn ảnh' : `Thêm ${kind.label}`}
                compact={kind.value === 'photo'}
                accept={kind.value === 'photo' ? 'image/*' : undefined}
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
            {canWrite && kind.value === 'photo' && (
              <FileField
                label="Chụp ảnh tình trạng"
                compact
                accept="image/*"
                capture="environment"
                value={null}
                disabled={attach.isPending || pending !== null}
                onChange={(fileId) => {
                  if (!fileId) return
                  const next = { fileId, kind: 'photo' }
                  setPending(next)
                  attach.mutate(next)
                }}
              />
            )}
          </div>
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
