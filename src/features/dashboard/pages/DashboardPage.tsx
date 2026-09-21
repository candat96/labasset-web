import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import {
  ArrowRight,
  Boxes,
  ClipboardList,
  FileText,
  Gauge,
  Microscope,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { SectionCard } from '@/components/page/SectionCard'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import { Skeleton } from '@/components/ui/skeleton'
import { KpiCard } from '@/components/kpi-card'
import type { StatusTone } from '@/components/page/StatusBadge'
import { formatNumber } from '@/lib/format/number'
import { formatVnd } from '@/lib/format/money'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDashboard } from '../hooks'

const ICONS: Record<string, LucideIcon> = {
  'equipment.total': Microscope,
  'equipment.active': Microscope,
  'equipment.broken': Wrench,
  'maintenance.due30': ClipboardList,
  'calibration.due30': Gauge,
  'stock.lowStock': Boxes,
  'requests.pending': FileText,
  'repair.open': Wrench,
}

const TONE: Record<StatusTone, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
  success: 'success',
  warning: 'warning',
  danger: 'danger',
  info: 'info',
  muted: 'neutral',
}

/** Palette biểu đồ Clean Enterprise (handoff 10 §6). */
const CHART_COLORS = ['#2977ff', '#60a5fa', '#14b8a6', '#f59e0b', '#ef4444', '#64748b']

export function Component() {
  const { t } = useTranslation('dashboard')
  const q = useDashboard()
  const user = useAuthStore((s) => s.user)
  const hospitalName = useUiStore((s) => s.hospitalName)
  const today = format(new Date(), 'EEEE, dd/MM/yyyy', { locale: vi })

  return (
    <>
      <section
        className="bg-brand-gradient relative mb-5 overflow-hidden rounded-2xl px-6 py-5 text-white shadow-[0_12px_32px_-12px_rgb(41_119_255/0.5)]"
        data-testid="dashboard-hero"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-28 left-1/3 size-64 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[12.5px] font-medium text-white/75 capitalize">{today}</p>
            <h1 className="mt-1 text-[26px] leading-8 font-bold tracking-[-0.02em]">
              Xin chào, {user?.fullName ?? user?.username ?? 'bạn'} 👋
            </h1>
            <p className="mt-1 text-[13.5px] text-white/80">
              {hospitalName ? `${hospitalName} · ` : ''}
              {t('desc')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" className="bg-white text-primary hover:bg-white/90">
              <Link to="/repairs/new">
                <Wrench aria-hidden /> Báo hỏng
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-white/40 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            >
              <Link to="/requests/new">
                <FileText aria-hidden /> Tạo phiếu yêu cầu
              </Link>
            </Button>
          </div>
        </div>
      </section>
      {q.error && (
        <p role="alert" className="text-destructive mb-3 text-sm">
          Không tải được dashboard.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {q.isPending
          ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-28" />)
          : q.data?.kpis.map((k) => {
              const Icon = ICONS[k.key] ?? Microscope
              return (
                <Link key={k.key} to={k.to} data-testid="kpi-link">
                  <KpiCard
                    title={k.title}
                    value={k.unit === 'VND' ? formatVnd(String(k.value)) : formatNumber(k.value)}
                    tone={TONE[k.tone]}
                    trend={k.trend}
                    icon={<Icon className="size-4" aria-hidden />}
                  />
                </Link>
              )
            })}
      </div>
      {!q.isPending && q.data && (
        <>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <SectionCard title="Sửa chữa 6 tháng" description="Số phiếu theo trạng thái">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={q.data.kpis
                      .filter((row) => row.key.startsWith('repair.'))
                      .map((row) => ({ name: row.title, value: Number(row.value) }))}
                  >
                    <CartesianGrid stroke="var(--color-divider)" vertical={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                      width={28}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      fill={CHART_COLORS[0]}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
            <SectionCard
              title="Cảnh báo kho theo loại"
              description="Vật tư dưới mức tối thiểu, sắp hết hạn"
            >
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={q.data.kpis
                        .filter((row) => row.key.startsWith('stock.') && row.unit !== 'VND')
                        .map((row) => ({ name: row.title, value: Number(row.value) }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={80}
                    >
                      {q.data.kpis
                        .filter((row) => row.key.startsWith('stock.') && row.unit !== 'VND')
                        .map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[(i + 3) % CHART_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            {[
              { title: 'Việc của tôi', to: '/my-tasks', text: '5 việc ưu tiên' },
              {
                title: 'Sắp đến hạn 7 ngày',
                to: '/maintenance/calendar',
                text: 'Xem lịch được phân công',
              },
              { title: 'Thông báo chưa đọc', to: '/notifications', text: '5 thông báo mới nhất' },
            ].map((item) => (
              <Link
                key={item.title}
                to={item.to}
                className="bg-card shadow-card hover:shadow-card-hover group flex items-center gap-4 rounded-xl p-4 transition-[box-shadow,transform] hover:-translate-y-px"
              >
                <div className="bg-primary-soft text-primary flex size-11 shrink-0 items-center justify-center rounded-lg">
                  <ArrowRight
                    className="size-5 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[14.5px] font-semibold">{item.title}</h2>
                  <p className="text-muted-foreground text-[13px]">{item.text}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  )
}
