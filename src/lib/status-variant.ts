import type { StatusTone } from '@/components/page/StatusBadge'
import type { BadgeProps } from '@/components/ui/badge'

/** Map tone trạng thái → variant của Badge (một chỗ duy nhất, không màu lẻ trong page). */
export const statusVariantMap: Record<StatusTone, NonNullable<BadgeProps['variant']>> = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
  muted: 'neutral',
}

export function statusVariant(tone: StatusTone): NonNullable<BadgeProps['variant']> {
  return statusVariantMap[tone]
}
