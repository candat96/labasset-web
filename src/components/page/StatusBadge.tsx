import { Circle, CircleCheck, CircleX, Info, TriangleAlert, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'muted'

const TONES: Record<StatusTone, { cls: string; icon: LucideIcon }> = {
  success: {
    cls: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
    icon: CircleCheck,
  },
  warning: {
    cls: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    icon: TriangleAlert,
  },
  danger: { cls: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300', icon: CircleX },
  info: { cls: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300', icon: Info },
  muted: { cls: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', icon: Circle },
}

/** Badge trạng thái: màu + icon (không chỉ dựa vào màu). */
export function StatusBadge({
  status,
  label,
  className,
}: {
  status: StatusTone
  label: string
  className?: string
}) {
  const { cls, icon: Icon } = TONES[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        cls,
        className,
      )}
    >
      <Icon className="size-3" aria-hidden />
      {label}
    </span>
  )
}
