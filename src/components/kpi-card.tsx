import type { ReactNode } from 'react'
import { TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

export type KpiTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const TONE_CLASSES: Record<KpiTone, string> = {
  success: 'bg-success-bg text-success-fg',
  warning: 'bg-warning-bg text-warning-fg',
  danger: 'bg-destructive-bg text-destructive-fg',
  info: 'bg-info-bg text-info-fg',
  neutral: 'bg-neutral-bg text-neutral-fg',
}

/**
 * KpiCard Clean Enterprise (handoff 10 §4):
 * icon tròn 36 nền bg trạng thái, nhãn 13 muted, số 26/700 tabular,
 * xu hướng ±% dạng badge; 0 → neutral (không xanh lá).
 */
export function KpiCard({
  title,
  value,
  description,
  icon,
  tone = 'neutral',
  trend,
}: {
  title: string
  value: ReactNode
  description?: string
  icon?: ReactNode
  tone?: KpiTone
  /** Phần trăm thay đổi; 0 hoặc undefined = không hiển thị hướng. */
  trend?: number
}) {
  // 0 giá trị → neutral, không dùng màu xanh lá/đỏ.
  const effectiveTone: KpiTone =
    (typeof value === 'number' && value === 0) || value === 0 || value === '0' ? 'neutral' : tone

  const showTrend = trend !== undefined && trend !== 0
  const TrendIcon = !showTrend ? Minus : trend > 0 ? TrendingUp : TrendingDown

  return (
    <section
      className="bg-card rounded-xl shadow-[var(--shadow-card)] border-0 dark:border dark:border-border p-4"
      data-testid="kpi-card"
      data-tone={effectiveTone}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-muted-foreground text-[13px] font-medium">{title}</h2>
        {icon && (
          <div
            data-testid="kpi-icon"
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-full',
              TONE_CLASSES[effectiveTone],
            )}
          >
            {icon}
          </div>
        )}
      </div>
      <p className="mt-2 text-[26px] font-bold leading-8 tabular-nums">{value}</p>
      {(description || trend !== undefined) && (
        <div className="mt-1 flex items-center gap-2">
          {trend !== undefined && (
            <span
              data-testid="kpi-trend"
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums',
                showTrend ? TONE_CLASSES[effectiveTone] : 'bg-neutral-bg text-neutral-fg',
              )}
            >
              <TrendIcon className="size-3" aria-hidden />
              {trend > 0 ? '+' : ''}
              {trend}%
            </span>
          )}
          {description && <p className="text-subtle text-xs">{description}</p>}
        </div>
      )}
    </section>
  )
}
