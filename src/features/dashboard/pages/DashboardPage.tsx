import { Link } from 'react-router'
import { FileText, Wrench } from 'lucide-react'
import { SectionCard } from '@/components/page/SectionCard'
import { PageHeader } from '@/components/page/PageHeader'
import { KpiTiles } from '../components/KpiTiles'
import { WorkQueue } from '../components/WorkQueue'
import { Button } from '@/components/ui/button'
import { useUiStore } from '@/stores/ui.store'
import { format } from 'date-fns'
import { vi } from 'date-fns/locale'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useDashboard } from '../hooks'
import { useQuery } from '@tanstack/react-query'
import { repairStats } from '@/features/repairs/api'
import { endOfMonth, format as formatDate, startOfMonth, subMonths } from 'date-fns'

/** Palette biểu đồ theo token Medone (primary · tím · xanh lá · vàng · hồng · xám). */
const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
]

export function Component() {
  const q = useDashboard()
  // Biểu đồ 6 tháng lấy từ thống kê thật (/v1/repairs/stats?groupBy=month),
  // không suy từ các ô KPI — tên thẻ hứa "6 tháng" thì phải đúng 6 tháng.
  const repairMonths = useQuery({
    queryKey: ['dashboard-repair-months'],
    queryFn: () =>
      repairStats({
        from: startOfMonth(subMonths(new Date(), 5)).toISOString(),
        to: endOfMonth(new Date()).toISOString(),
        groupBy: 'month',
      }),
    staleTime: 300_000,
  })
  const hospitalName = useUiStore((s) => s.hospitalName)
  const today = format(new Date(), 'EEEE, dd/MM/yyyy', { locale: vi })
  // Cảnh báo kho: các chỉ số stock.* đếm được (bỏ giá trị tồn tính bằng tiền).
  const stockAlerts = (q.data?.kpis ?? [])
    .filter((row) => row.key.startsWith('stock.') && row.unit !== 'VND')
    .map((row) => ({ name: row.title, value: Number(row.value) }))
    .filter((row) => row.value > 0)

  return (
    <>
      <PageHeader
        title="Tổng quan"
        description={`${hospitalName ? `${hospitalName} · ` : ''}${today}`}
        actions={
          <>
            <Button asChild variant="ghost" className="h-10 gap-2 pr-3 pl-1.5 font-semibold">
              <Link to="/repairs/new">
                <span className="bg-primary flex size-8 items-center justify-center rounded-full text-primary-foreground">
                  <Wrench className="size-4" aria-hidden />
                </span>
                Báo hỏng
              </Link>
            </Button>
            <Button asChild variant="ghost" className="h-10 gap-2 pr-3 pl-1.5 font-semibold">
              <Link to="/requests/new">
                <span className="bg-primary flex size-8 items-center justify-center rounded-full text-primary-foreground">
                  <FileText className="size-4" aria-hidden />
                </span>
                Tạo phiếu yêu cầu
              </Link>
            </Button>
          </>
        }
      />
      {q.error && (
        <p role="alert" className="text-destructive mb-3 text-sm">
          Không tải được dashboard.
        </p>
      )}
      <div className="grid gap-3 min-[1440px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-3">
          <KpiTiles kpis={q.data?.kpis ?? []} loading={q.isPending} />
          {!q.isPending && q.data && (
            <div className="grid gap-3 lg:grid-cols-2">
              <SectionCard title="Sửa chữa 6 tháng" description="Số phiếu mở theo tháng">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={(repairMonths.data?.groups ?? []).map((row) => ({
                        name: row.label,
                        value: row.tickets,
                      }))}
                    >
                      <CartesianGrid stroke="var(--color-divider)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                        tickFormatter={(value: string) =>
                          /^\d{4}-\d{2}/.test(value)
                            ? formatDate(new Date(`${value.slice(0, 7)}-01`), 'MM/yy')
                            : value
                        }
                      />
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
                  {stockAlerts.length === 0 ? (
                    <p className="text-muted-foreground flex h-full items-center justify-center text-[13.5px]">
                      Không có cảnh báo kho nào.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stockAlerts}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={45}
                          outerRadius={80}
                          /* Recharts 3: để hiệu ứng động bật thì Pie không vẽ sector nào. */
                          isAnimationActive={false}
                        >
                          {stockAlerts.map((row, i) => (
                            <Cell
                              key={row.name}
                              fill={CHART_COLORS[(i + 3) % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend
                          verticalAlign="bottom"
                          iconType="circle"
                          formatter={(value: string, entry) => (
                            <span className="text-foreground text-[13px]">
                              {value} ·{' '}
                              <span className="font-semibold tabular-nums">
                                {(entry?.payload as { value?: number })?.value ?? 0}
                              </span>
                            </span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </SectionCard>
            </div>
          )}
        </div>
        <WorkQueue />
      </div>
    </>
  )
}
