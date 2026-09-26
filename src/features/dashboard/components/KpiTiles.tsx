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

/** Màu biểu tượng từng chỉ số — theo Figma Medone (node 3:3614). */
const ICON_CLASS: Record<string, string> = {
  'equipment.total': 'bg-primary',
  'equipment.active': 'bg-[#7828c8]',
  'equipment.broken': 'bg-success',
  'repair.open': 'bg-warning',
  'repair.overdueSla': 'bg-destructive',
  'maintenance.due30': 'bg-[#06b7db]',
  'calibration.due30': 'bg-[#ff95e1]',
  'stock.lowStock': 'bg-warning',
  'stock.expiring30': 'bg-[#ae7ede]',
  'requests.pending': 'bg-[#66aaf9]',
  'stock.value': 'bg-primary',
}

const display = (kpi: DashboardKpi) =>
  kpi.unit === 'VND' ? formatVnd(String(kpi.value)) : formatNumber(kpi.value)

function Tile({ kpi }: { kpi: DashboardKpi }) {
  const Icon = ICONS[kpi.key] ?? Microscope
  return (
    <Link
      to={kpi.to}
      data-testid="kpi-tile"
      className="hover:bg-surface-2 flex items-center gap-3 rounded-xl p-3 transition-colors"
    >
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-full text-white ${ICON_CLASS[kpi.key] ?? 'bg-primary'}`}
      >
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className="min-w-0">
        <span
          className={`block leading-8 font-semibold whitespace-nowrap tabular-nums ${kpi.unit === 'VND' ? 'text-[19px]' : 'text-[24px]'}`}
        >
          {display(kpi)}
        </span>
        <span className="text-muted-foreground block truncate text-[13px]">{kpi.title}</span>
      </span>
    </Link>
  )
}

/** Lưới chỉ số tổng quan — 4 cột, mọi ô đồng hạng như thiết kế Figma. */
export function KpiTiles({ kpis, loading }: { kpis: DashboardKpi[]; loading: boolean }) {
  return (
    <section className="bg-card shadow-card rounded-xl p-4" aria-label="Chỉ số tổng quan">
      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-16" />)
          : kpis.map((kpi) => <Tile key={kpi.key} kpi={kpi} />)}
      </div>
    </section>
  )
}
