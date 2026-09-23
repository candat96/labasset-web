import { useId, useRef, useState } from 'react'
import { Camera, ImagePlus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { uploadFile } from '@/api/files'
import { messageFor } from '@/api/errors'
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
      <Input
        ref={inputRef}
        className={compact ? 'hidden' : undefined}
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
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">Đã tải tệp</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={disabled || busy}
            onClick={() => onChange(null)}
          >
            Bỏ tệp
          </Button>
        </div>
      )}
    </div>
  )
}
