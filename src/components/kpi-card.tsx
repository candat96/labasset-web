import type { ReactNode } from 'react'
import { ArrowUpRight, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

export type KpiTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const TONE_CLASSES: Record<KpiTone, string> = {
  success: 'bg-success-bg text-success-fg',
  warning: 'bg-warning-bg text-warning-fg',
  danger: 'bg-destructive-bg text-destructive-fg',
  info: 'bg-info-bg text-info-fg',
  neutral: 'bg-neutral-bg text-neutral-fg',
}

const ACCENT: Record<KpiTone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-destructive',
  info: 'bg-primary',
  neutral: 'bg-border',
}

/**
 * Thẻ KPI: chip icon màu trạng thái, số 26/700, nhãn 13 muted, badge xu hướng,
 * thanh nhấn màu bên trái; 0 → neutral. Bọc trong <Link> → hover nổi + mũi tên.
 */
export function KpiCard({
  title,
  value,
  description,
  icon,
  tone = 'neutral',
  trend,
  className,
}: {
  title: string
  value: ReactNode
  description?: string
  icon?: ReactNode
  tone?: KpiTone
  /** Phần trăm thay đổi; 0 hoặc undefined = không hiển thị hướng. */
  trend?: number
  className?: string
}) {
  const effectiveTone: KpiTone =
    (typeof value === 'number' && value === 0) || value === 0 || value === '0' ? 'neutral' : tone
  const showTrend = trend !== undefined && trend !== 0
  const TrendIcon = !showTrend ? Minus : trend > 0 ? TrendingUp : TrendingDown

  return (
    <section
      className={cn(
        'group/kpi bg-card shadow-card relative flex h-full flex-col overflow-hidden rounded-md p-4 pl-5 transition-[box-shadow,transform] duration-200',
        'hover:shadow-card-hover hover:-translate-y-px',
        className,
      )}
      data-testid="kpi-card"
      data-tone={effectiveTone}
    >
      <span
        aria-hidden
        className={cn('absolute inset-y-3 left-0 w-1 rounded-r-full', ACCENT[effectiveTone])}
      />
      <div className="flex items-start justify-between gap-3">
        {icon ? (
          <div
            data-testid="kpi-icon"
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-md [&_svg]:size-5',
              TONE_CLASSES[effectiveTone],
            )}
          >
            {icon}
          </div>
        ) : (
          <span />
        )}
        <ArrowUpRight
          aria-hidden
          className="text-subtle size-4 opacity-0 transition-opacity group-hover/kpi:opacity-100"
        />
      </div>
      <p className="mt-3 text-[24px] leading-8 font-bold tracking-[-0.02em] tabular-nums">
        {value}
      </p>
      <h2 className="text-muted-foreground mt-0.5 text-[13px] leading-5 font-medium">{title}</h2>
      {(description || trend !== undefined) && (
        <div className="mt-2 flex items-center gap-2">
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
