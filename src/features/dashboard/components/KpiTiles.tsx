import { Link } from 'react-router'
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  CircleCheck,
  ClipboardList,
  Gauge,
  Hourglass,
  Microscope,
  PackageMinus,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber } from '@/lib/format/number'
import { formatVnd } from '@/lib/format/money'
import type { DashboardKpi } from '../hooks'

/** Bốn chỉ số "phải xử lý ngay" — xem plans/2026-09-26-theme-medone.md §UX quyết định 2. */
const URGENT_KEYS = [
  'equipment.broken',
  'repair.overdueSla',
  'calibration.due30',
  'stock.lowStock',
] as const

const ICONS: Record<string, LucideIcon> = {
  'equipment.total': Microscope,
  'equipment.active': CircleCheck,
  'equipment.broken': AlertTriangle,
  'repair.open': Wrench,
  'repair.overdueSla': Hourglass,
  'maintenance.due30': CalendarClock,
  'calibration.due30': Gauge,
  'stock.lowStock': PackageMinus,
  'stock.expiring30': Boxes,
  'requests.pending': ClipboardList,
  'stock.value': Wallet,
}

type ToneClass = { chip: string; value: string }
const NEUTRAL: ToneClass = { chip: 'bg-muted text-muted-foreground', value: 'text-foreground' }
const TONE_CLASS: Record<string, ToneClass> = {
  danger: { chip: 'bg-destructive-bg text-destructive-fg', value: 'text-destructive-fg' },
  warning: { chip: 'bg-warning-bg text-warning-fg', value: 'text-warning-fg' },
  success: { chip: 'bg-success-bg text-success-fg', value: 'text-foreground' },
  info: { chip: 'bg-primary-soft text-secondary-foreground', value: 'text-foreground' },
  neutral: NEUTRAL,
}

const display = (kpi: DashboardKpi) =>
  kpi.unit === 'VND' ? formatVnd(String(kpi.value)) : formatNumber(kpi.value)

/** Ô lớn: việc cần xử lý ngay — số to, có màu trạng thái, bấm sang danh sách đã lọc. */
function UrgentTile({ kpi }: { kpi: DashboardKpi }) {
  const Icon = ICONS[kpi.key] ?? Microscope
  const tone = TONE_CLASS[kpi.tone] ?? NEUTRAL
  const empty = Number(kpi.value) === 0
  return (
    <Link
      to={kpi.to}
      data-testid="kpi-urgent"
      className="border-border hover:border-primary/40 hover:bg-surface-2 flex items-center gap-3 rounded-xl border p-3 transition-colors"
    >
      <span
        className={`flex size-10 shrink-0 items-center justify-center rounded-full ${empty ? NEUTRAL.chip : tone.chip}`}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0">
        <span
          className={`block text-[26px] leading-8 font-semibold tabular-nums ${empty ? 'text-foreground' : tone.value}`}
        >
          {display(kpi)}
        </span>
        <span className="text-muted-foreground block truncate text-[13px]">{kpi.title}</span>
      </span>
    </Link>
  )
}

/** Ô nhỏ: chỉ số tham khảo — không tô màu, chữ nhỏ hơn một bậc. */
function PlainTile({ kpi }: { kpi: DashboardKpi }) {
  const Icon = ICONS[kpi.key] ?? Microscope
  return (
    <Link
      to={kpi.to}
      data-testid="kpi-plain"
      className="hover:bg-surface-2 flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors"
    >
      <Icon className="text-subtle size-4 shrink-0" aria-hidden />
      <span className="min-w-0">
        <span className="block text-[17px] leading-6 font-semibold tabular-nums">
          {display(kpi)}
        </span>
        <span className="text-muted-foreground block truncate text-[12.5px]">{kpi.title}</span>
      </span>
    </Link>
  )
}

export function KpiTiles({ kpis, loading }: { kpis: DashboardKpi[]; loading: boolean }) {
  if (loading)
    return (
      <div className="bg-card shadow-card rounded-xl p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <Skeleton className="mt-4 h-16" />
      </div>
    )

  const urgent = URGENT_KEYS.map((key) => kpis.find((k) => k.key === key)).filter(
    (k): k is DashboardKpi => !!k,
  )
  const rest = kpis.filter((k) => !URGENT_KEYS.includes(k.key as (typeof URGENT_KEYS)[number]))

  return (
    <section className="bg-card shadow-card rounded-xl p-4" aria-label="Chỉ số tổng quan">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {urgent.map((kpi) => (
          <UrgentTile key={kpi.key} kpi={kpi} />
        ))}
      </div>
      {rest.length > 0 && (
        <div className="border-divider mt-3 grid gap-1 border-t pt-3 sm:grid-cols-3 xl:grid-cols-4">
          {rest.map((kpi) => (
            <PlainTile key={kpi.key} kpi={kpi} />
          ))}
        </div>
      )}
    </section>
  )
}
