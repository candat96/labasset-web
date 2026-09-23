import { useId, useState } from 'react'
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
}: {
  label: string
  value: string | null
  onChange: (id: string | null) => void
  accept?: string
  disabled?: boolean
  capture?: 'environment' | 'user'
}) {
  const id = useId()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
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
