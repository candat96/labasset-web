import type { ReactNode } from 'react'
import { formatDateTime } from '@/lib/format/date'
import { cn } from '@/lib/utils'

export type TimelineTone = 'primary' | 'success' | 'warning' | 'danger' | 'muted'

export interface TimelineEvent {
  at: string
  title: string
  summary?: string | null
  by?: string | null
  tone?: TimelineTone
  icon?: ReactNode
}

const DOT: Record<TimelineTone, string> = {
  primary: 'bg-primary ring-primary/20',
  success: 'bg-success ring-success/20',
  warning: 'bg-warning ring-warning/20',
  danger: 'bg-destructive ring-destructive/20',
  muted: 'bg-subtle ring-subtle/20',
}

/** Dòng thời gian: chấm màu + đường nối, mới nhất ở trên. */
export function Timeline({ events, className }: { events: TimelineEvent[]; className?: string }) {
  const sorted = [...events].sort((a, b) => b.at.localeCompare(a.at))
  return (
    <ol aria-label="Dòng thời gian" className={cn('relative', className)}>
      {sorted.map((e, i) => {
        const tone = e.tone ?? (i === 0 ? 'primary' : 'muted')
        return (
          <li key={`${e.at}-${i}`} className="relative flex gap-3 pb-5 last:pb-0">
            {i < sorted.length - 1 && (
              <span aria-hidden className="bg-divider absolute top-5 left-[7px] h-full w-0.5" />
            )}
            <span
              aria-hidden
              className={cn(
                'mt-1 flex size-4 shrink-0 items-center justify-center rounded-full ring-4 [&_svg]:size-2.5 [&_svg]:text-white dark:[&_svg]:text-background',
                DOT[tone],
              )}
            >
              {e.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="text-[14px] leading-5 font-semibold">{e.title}</p>
                <time dateTime={e.at} className="text-subtle text-[12px] tabular-nums">
                  {formatDateTime(e.at)}
                </time>
              </div>
              {e.by && <p className="text-muted-foreground text-[12.5px]">{e.by}</p>}
              {e.summary && (
                <p className="bg-surface-2 mt-2 rounded-md px-3 py-2 text-[13px] leading-5 whitespace-pre-wrap">
                  {e.summary}
                </p>
              )}
            </div>
          </li>
        )
      })}
      {events.length === 0 && (
        <li className="text-muted-foreground text-[13px]">Chưa có sự kiện</li>
      )}
    </ol>
  )
}
