import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Thanh nút dính đáy cho trang form: Huỷ (outline) + Lưu (primary) căn phải,
 * nền mờ + viền trên. `extra` đặt bên trái (ví dụ nút "Lưu nháp").
 */
export function FormFooter({
  onCancel,
  submitting = false,
  saveLabel,
  cancelLabel,
  extra,
  className,
}: {
  onCancel: () => void
  submitting?: boolean
  saveLabel?: ReactNode
  cancelLabel?: ReactNode
  extra?: ReactNode
  className?: string
}) {
  const { t } = useTranslation()
  return (
    <div
      className={cn(
        'bg-background/90 border-divider sticky bottom-0 z-10 -mx-1 mt-6 flex items-center justify-between gap-3 border-t px-1 py-3 backdrop-blur',
        className,
      )}
    >
      <div className="flex items-center gap-2">{extra}</div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {cancelLabel ?? t('actions.cancel')}
        </Button>
        <Button type="submit" disabled={submitting}>
          {saveLabel ?? t('actions.save')}
        </Button>
      </div>
    </div>
  )
}
