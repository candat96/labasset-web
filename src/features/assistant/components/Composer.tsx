import { useEffect, useRef, useState, type ChangeEvent, type ClipboardEvent } from 'react'
import { ImagePlus, Loader2, Send, Square, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { uploadFile } from '@/api/files'
import { messageFor } from '@/api/errors'
import { cn } from '@/lib/utils'

export const MAX_ATTACHMENTS = 4
const LINE_HEIGHT = 22
const MAX_ROWS = 6

export interface PendingImage {
  localId: string
  name: string
  previewUrl: string
  fileId?: string
  uploading: boolean
}

/**
 * Ô soạn câu hỏi dính đáy: textarea tự cao 1–6 dòng, nút gửi/dừng nằm trong ô, đính ≤ 4 ảnh
 * (chọn tệp hoặc dán) có thumbnail — ảnh upload qua presign, gửi `attachmentFileIds`.
 * Enter gửi, Shift+Enter xuống dòng.
 */
export function Composer({
  draft,
  onDraftChange,
  onSubmit,
  onStop,
  streaming,
  disabled,
  images,
  onImagesChange,
  className,
}: {
  draft: string
  onDraftChange: (value: string) => void
  onSubmit: () => void
  onStop: () => void
  streaming: boolean
  disabled?: boolean
  images: PendingImage[]
  onImagesChange: (update: (current: PendingImage[]) => PendingImage[]) => void
  className?: string
}) {
  const { t } = useTranslation('assistant')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState(1)
  const uploading = images.some((image) => image.uploading)
  const canSend = draft.trim().length > 0 && !streaming && !disabled && !uploading

  // Tự cao theo nội dung: đo scrollHeight rồi kẹp 1–6 dòng.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const lines = Math.max(1, Math.min(MAX_ROWS, Math.round(el.scrollHeight / LINE_HEIGHT)))
    setRows(lines)
    el.style.height = `${lines * LINE_HEIGHT}px`
  }, [draft])

  const addFiles = (files: File[]) => {
    const pictures = files.filter((file) => file.type.startsWith('image/'))
    if (pictures.length === 0) return
    const room = MAX_ATTACHMENTS - images.length
    if (room <= 0) {
      toast.error(t('attachMax', { count: MAX_ATTACHMENTS }))
      return
    }
    const accepted = pictures.slice(0, room)
    if (accepted.length < pictures.length) toast.error(t('attachMax', { count: MAX_ATTACHMENTS }))
    const pending = accepted.map<PendingImage>((file) => ({
      localId: crypto.randomUUID(),
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      uploading: true,
    }))
    onImagesChange((current) => [...current, ...pending])
    accepted.forEach((file, index) => {
      const localId = pending[index]!.localId
      uploadFile(file)
        .then((fileId) =>
          onImagesChange((current) =>
            current.map((image) =>
              image.localId === localId ? { ...image, fileId, uploading: false } : image,
            ),
          ),
        )
        .catch((error: unknown) => {
          toast.error(messageFor(error))
          onImagesChange((current) => current.filter((image) => image.localId !== localId))
        })
    })
  }

  const onPick = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files ?? []))
    event.target.value = ''
  }

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData?.files ?? [])
    if (files.some((file) => file.type.startsWith('image/'))) {
      event.preventDefault()
      addFiles(files)
    }
  }

  const removeImage = (localId: string) =>
    onImagesChange((current) => {
      const target = current.find((image) => image.localId === localId)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return current.filter((image) => image.localId !== localId)
    })

  return (
    <div className={cn('border-divider bg-card border-t px-3 pt-3 pb-2 sm:px-5', className)}>
      <div className="mx-auto w-full max-w-[860px]">
        {disabled && (
          <Alert variant="warning" className="mb-3">
            <AlertTitle>{t('budgetEmptyTitle')}</AlertTitle>
            <AlertDescription>{t('budgetEmptyHint')}</AlertDescription>
          </Alert>
        )}
        <div className="border-input focus-within:border-primary focus-within:ring-primary/20 bg-card rounded-2xl border transition-[border-color,box-shadow] focus-within:ring-[3px]">
          {images.length > 0 && (
            <ul className="flex flex-wrap gap-2 px-3 pt-3" aria-label={t('attachedImages')}>
              {images.map((image) => (
                <li key={image.localId} className="group/img relative">
                  <img
                    src={image.previewUrl}
                    alt={image.name}
                    className="border-divider size-14 rounded-lg border object-cover"
                  />
                  {image.uploading && (
                    <span className="bg-background/70 absolute inset-0 grid place-items-center rounded-lg">
                      <Loader2 className="text-primary size-4 animate-spin" aria-hidden />
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`${t('attachRemove')} ${image.name}`}
                    onClick={() => removeImage(image.localId)}
                    className="bg-foreground text-background absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full opacity-0 transition-opacity group-hover/img:opacity-100 focus-visible:opacity-100"
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-end gap-1 p-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onPick}
              aria-label={t('attachImage')}
            />
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-subtle hover:text-foreground shrink-0"
              aria-label={t('attachImage')}
              title={t('attachImage')}
              disabled={disabled || images.length >= MAX_ATTACHMENTS}
              onClick={() => fileRef.current?.click()}
            >
              <ImagePlus />
            </Button>
            <textarea
              ref={textareaRef}
              rows={rows}
              className="placeholder:text-subtle min-w-0 flex-1 resize-none bg-transparent px-1.5 py-[7px] text-[14.5px] leading-[22px] outline-none disabled:opacity-60"
              style={{ maxHeight: MAX_ROWS * LINE_HEIGHT + 14 }}
              value={draft}
              onChange={(event) => onDraftChange(event.target.value)}
              onPaste={onPaste}
              aria-label={t('question')}
              placeholder={t('questionPlaceholder')}
              disabled={disabled}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  if (canSend) onSubmit()
                }
              }}
            />
            {streaming ? (
              <Button
                variant="destructive"
                size="icon-sm"
                className="shrink-0 rounded-xl"
                onClick={onStop}
                aria-label={t('stop')}
                title={t('stop')}
              >
                <Square />
              </Button>
            ) : (
              <Button
                size="icon-sm"
                className="shrink-0 rounded-xl"
                onClick={onSubmit}
                disabled={!canSend}
                aria-label={t('send')}
                title={t('send')}
              >
                <Send />
              </Button>
            )}
          </div>
        </div>
        <p className="text-subtle mt-1.5 text-center text-[11.5px]">{t('enterHint')}</p>
      </div>
    </div>
  )
}
