import { useEffect, useRef, useState } from 'react'
import { Camera, ImagePlus, X } from 'lucide-react'
import { Button } from './ui/button'

export function ConditionPhotoPicker({
  files,
  onChange,
  disabled,
}: {
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
}) {
  const gallery = useRef<HTMLInputElement>(null)
  const camera = useRef<HTMLInputElement>(null)
  const [urls, setUrls] = useState<string[]>([])
  useEffect(() => {
    const next = files.map((file) => URL.createObjectURL(file))
    setUrls(next)
    return () => next.forEach((url) => URL.revokeObjectURL(url))
  }, [files])
  const add = (input: HTMLInputElement) => {
    onChange([
      ...files,
      ...Array.from(input.files ?? []).filter((file) => file.type.startsWith('image/')),
    ])
    input.value = ''
  }
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">
        Ảnh tình trạng khi báo hỏng sẽ được lưu trong phiếu sửa chữa này.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {files.map((file, index) => (
          <div key={`${index}-${file.name}`} className="relative overflow-hidden rounded-xl border">
            <img src={urls[index]} alt={file.name} className="aspect-square w-full object-cover" />
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute top-1 right-1 size-7"
              disabled={disabled}
              aria-label={`Bỏ ảnh ${file.name}`}
              onClick={() => onChange(files.filter((_, i) => i !== index))}
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => gallery.current?.click()}
        >
          <ImagePlus />
          Chọn ảnh
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => camera.current?.click()}
        >
          <Camera />
          Chụp ảnh
        </Button>
      </div>
      <input
        ref={gallery}
        type="file"
        accept="image/*"
        multiple
        hidden
        aria-label="Ảnh tình trạng khi báo hỏng"
        disabled={disabled}
        onChange={(e) => add(e.currentTarget)}
      />
      <input
        ref={camera}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        aria-label="Chụp ảnh khi báo hỏng"
        disabled={disabled}
        onChange={(e) => add(e.currentTarget)}
      />
    </div>
  )
}
