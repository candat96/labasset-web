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
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { PageHeader } from '@/components/page/PageHeader'
import type { StatusTone } from '@/components/page/StatusBadge'
import { formatNumber } from '@/lib/format/number'
import { formatVnd } from '@/lib/format/money'
import { cn } from '@/lib/utils'
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

const TONE: Record<StatusTone, string> = {
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
  info: 'text-sky-600 dark:text-sky-400',
  muted: 'text-muted-foreground',
}

export function Component() {
  const { t } = useTranslation('dashboard')
  const q = useDashboard()

  return (
    <>
      <PageHeader title={t('title')} description={t('desc')} />
      {q.error && (
        <p role="alert" className="text-destructive mb-3 text-sm">
          Không tải được dashboard.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {q.isPending
          ? Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-24" />)
          : q.data?.kpis.map((k) => {
              const Icon = ICONS[k.key] ?? Microscope
              return (
                <Card key={k.key} className="py-0" data-testid="kpi-card">
                  <CardContent className="p-0">
                    <Link
                      to={k.to}
                      className="hover:bg-accent focus-visible:ring-ring flex items-center gap-3 rounded-lg p-4 outline-none focus-visible:ring-2"
                    >
                      <div
                        className={cn(
                          'bg-muted flex size-10 shrink-0 items-center justify-center rounded-md',
                          TONE[k.tone],
                        )}
                      >
                        <Icon className="size-5" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-muted-foreground truncate text-xs">{k.title}</div>
                        <div className="text-2xl font-semibold tabular-nums">
                          {k.unit === 'VND' ? formatVnd(String(k.value)) : formatNumber(k.value)}
                        </div>
                        {k.trend !== undefined && (
                          <div className="text-muted-foreground text-xs">
                            {k.trend > 0 ? '+' : ''}
                            {k.trend}%
                          </div>
                        )}
                      </div>
                      <ArrowRight className="text-muted-foreground size-4" aria-hidden />
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
      </div>
      {!q.isPending && q.data && (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="h-72 p-4">
                <h2 className="mb-2 font-medium">Sửa chữa 6 tháng</h2>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart
                    data={q.data.kpis
                      .filter((row) => row.key.startsWith('repair.'))
                      .map((row) => ({ name: row.title, value: Number(row.value) }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" hide />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" fill="var(--color-primary)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="h-72 p-4">
                <h2 className="mb-2 font-medium">Cảnh báo kho theo loại</h2>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={q.data.kpis
                        .filter((row) => row.key.startsWith('stock.') && row.unit !== 'VND')
                        .map((row) => ({ name: row.title, value: Number(row.value) }))}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={80}
                    >
                      {['#f59e0b', '#f97316', '#dc2626'].map((color) => (
                        <Cell key={color} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {[
              { title: 'Việc của tôi', to: '/my-tasks', text: '5 việc ưu tiên' },
              {
                title: 'Sắp đến hạn 7 ngày',
                to: '/maintenance/calendar',
                text: 'Xem lịch được phân công',
              },
              { title: 'Thông báo chưa đọc', to: '/notifications', text: '5 thông báo mới nhất' },
            ].map((item) => (
              <Card key={item.title}>
                <CardContent className="p-4">
                  <h2 className="font-medium">{item.title}</h2>
                  <p className="text-muted-foreground my-2 text-sm">{item.text}</p>
                  <Link className="text-primary text-sm hover:underline" to={item.to}>
                    Mở danh sách
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </>
  )
}
