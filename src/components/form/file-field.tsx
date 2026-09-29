import { useId, useRef, useState } from 'react'
import {
  Camera,
  FileText,
  File as FileIcon,
  Image as ImageIcon,
  ImagePlus,
  Upload,
  Video,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { uploadFile } from '@/api/files'
import { messageFor } from '@/api/errors'
/** Tệp vừa chọn, giữ lại để hiện tên/dung lượng/định dạng sau khi tải xong. */
type PickedFile = { name: string; size: number; type: string }

/** Biểu tượng theo loại tệp: nhìn một cái biết ngay ảnh, video hay tài liệu. */
function iconFor(type: string) {
  if (type.startsWith('image/')) return ImageIcon
  if (type.startsWith('video/')) return Video
  if (type === 'application/pdf') return FileText
  return FileIcon
}

/** Dung lượng đọc được: 1,2 MB thay vì 1258291. */
function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(1).replace('.', ',')} ${units[unit]}`
}

export function FileField({
  label,
  value,
  onChange,
  accept,
  disabled,
  capture,
  compact = false,
}: {
  label: string
  value: string | null
  onChange: (id: string | null) => void
  accept?: string
  disabled?: boolean
  capture?: 'environment' | 'user'
  compact?: boolean
}) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [picked, setPicked] = useState<PickedFile | null>(null)
  return (
    <div className="space-y-2">
      {compact ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
        >
          {capture ? <Camera /> : <ImagePlus />}
          {busy ? 'Đang tải ảnh…' : label}
        </Button>
      ) : (
        <Label htmlFor={id}>{label}</Label>
      )}
      {/* Vùng chọn tệp tự vẽ: ô `input type=file` của trình duyệt luôn hiện
          "Choose file / No file chosen" bằng tiếng Anh và hẹp bằng nội dung. */}
      {!compact && (
        <button
          type="button"
          disabled={disabled || busy}
          onClick={() => inputRef.current?.click()}
          className="border-border bg-card hover:bg-muted/40 flex w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed px-4 py-6 text-center disabled:opacity-60"
        >
          <Upload className="text-muted-foreground size-5" aria-hidden />
          <span className="text-sm font-semibold">Chọn tệp</span>
          <span className="text-muted-foreground text-xs">
            {busy ? 'Đang tải lên…' : 'Chưa chọn tệp nào'}
          </span>
        </button>
      )}
      <Input
        ref={inputRef}
        className="hidden"
        aria-label={label}
        id={id}
        type="file"
        accept={accept}
        capture={capture}
        disabled={disabled || busy}
        onChange={async (e) => {
          const input = e.currentTarget
          const file = input.files?.[0]
          if (!file) return
          setBusy(true)
          setError('')
          try {
            onChange(await uploadFile(file))
            setPicked({ name: file.name, size: file.size, type: file.type })
          } catch (err) {
            setError(messageFor(err))
          } finally {
            setBusy(false)
            input.value = ''
          }
        }}
      />
      {busy && <p role="status">Đang tải tệp…</p>}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {value && (
        <div className="border-border bg-card flex items-center gap-2 rounded-md border px-3 py-2">
          {(() => {
            const Icon = iconFor(picked?.type ?? '')
            return <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden />
          })()}
          <span className="min-w-0 flex-1 truncate text-sm">{picked?.name ?? 'Đã tải tệp'}</span>
          {picked && (
            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {humanSize(picked.size)}
              {picked.name.includes('.') && ` · ${picked.name.split('.').pop()?.toUpperCase()}`}
            </span>
          )}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled || busy}
            onClick={() => {
              onChange(null)
              setPicked(null)
            }}
          >
            Bỏ tệp
          </Button>
        </div>
      )}
    </div>
  )
}
