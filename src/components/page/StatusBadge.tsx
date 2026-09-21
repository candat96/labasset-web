import { Circle, CircleCheck, CircleX, Info, TriangleAlert, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'muted'

const TONES: Record<
  StatusTone,
  { variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral'; icon: LucideIcon }
> = {
  success: { variant: 'success', icon: CircleCheck },
  warning: { variant: 'warning', icon: TriangleAlert },
  danger: { variant: 'danger', icon: CircleX },
  info: { variant: 'info', icon: Info },
  muted: { variant: 'neutral', icon: Circle },
}

/** Badge trạng thái: variants token mới + icon (không chỉ dựa vào màu). */
export function StatusBadge({
  status,
  label,
  className,
}: {
  status: StatusTone
  label: string
  className?: string
}) {
  const { variant, icon: Icon } = TONES[status]
  return (
    <Badge variant={variant} dot className={cn('gap-1 px-2', className)}>
      <Icon className="size-3" aria-hidden />
      {label}
    </Badge>
  )
}
