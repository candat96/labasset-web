import { Link } from 'react-router'
import { Microscope, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useEquipment } from '@/features/equipment/hooks'
import { shortId } from '@/lib/format/id'
import { cn } from '@/lib/utils'

/**
 * Chip ngữ cảnh máy: hiển thị `mã — tên` (tra từ `equipmentId`) thay vì UUID thô,
 * bấm vào mở hồ sơ máy, có nút bỏ ngữ cảnh khi tạo hội thoại mới.
 */
export function EquipmentContextChip({
  equipmentId,
  onClear,
  className,
}: {
  equipmentId: string
  onClear?: () => void
  className?: string
}) {
  const { t } = useTranslation('assistant')
  const equipment = useEquipment(equipmentId)
  const label = equipment.data
    ? `${equipment.data.code} — ${equipment.data.name}`
    : equipment.isPending
      ? t('contextLoading')
      : t('contextUnknown', { id: shortId(equipmentId) })
  return (
    <span
      className={cn(
        'border-divider bg-surface-2 inline-flex max-w-full items-center gap-1.5 rounded-full border py-1 pr-1 pl-2.5 text-[12.5px] leading-5',
        className,
      )}
    >
      <Microscope className="text-primary size-3.5 shrink-0" aria-hidden />
      <span className="text-muted-foreground shrink-0">{t('contextLabel')}:</span>
      {equipment.data ? (
        <Link
          to={`/equipment/${equipmentId}`}
          className="text-foreground hover:text-primary min-w-0 truncate font-medium underline-offset-2 hover:underline"
        >
          {label}
        </Link>
      ) : (
        <span className={cn('min-w-0 truncate', equipment.isPending && 'text-subtle')}>
          {label}
        </span>
      )}
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label={t('contextClear')}
          title={t('contextClear')}
          className="hover:bg-muted hover:text-foreground text-subtle focus-visible:ring-ring/50 grid size-5 shrink-0 place-items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      )}
    </span>
  )
}
