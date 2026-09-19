import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/page/PageHeader'
import { KpiCard } from '@/components/kpi-card'
import { ErrorState } from '@/components/page/ErrorState'
import { Input } from '@/components/ui/input'
import { formatVnd } from '@/lib/format/money'
import { formatNumber } from '@/lib/format/number'
import { listRepairs, repairStats, repairWorkload } from '../api'
import { BarList } from '../components/BarList'
import { OPEN_STATUSES } from '../types'

function defaultFrom() {
  const date = new Date()
  date.setUTCMonth(date.getUTCMonth() - 3)
  return date.toISOString().slice(0, 10)
}

function hours(value: number | null | undefined) {
  if (value == null) return '—'
  return `${formatNumber(value, 1)} giờ`
}

export function Component() {
  const [from, setFrom] = useState(defaultFrom)
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10))
  const range = { from: `${from}T00:00:00.000Z`, to: `${to}T23:59:59.000Z` }
  const totals = useQuery({
    queryKey: ['repairs', 'stats', 'totals', range],
    queryFn: () => repairStats(range),
  })
  const byMonth = useQuery({
    queryKey: ['repairs', 'stats', 'month', range],
    queryFn: () => repairStats({ ...range, groupBy: 'month' }),
  })
  const byEquipment = useQuery({
    queryKey: ['repairs', 'stats', 'equipment', range],
    queryFn: () => repairStats({ ...range, groupBy: 'equipment' }),
  })
  const byDept = useQuery({
    queryKey: ['repairs', 'stats', 'department', range],
    queryFn: () => repairStats({ ...range, groupBy: 'department' }),
  })
  const open = useQuery({
    queryKey: ['repairs', 'open-count'],
    queryFn: () => listRepairs({ page: 1, limit: 1, status: OPEN_STATUSES.join(',') }),
  })
  const overdue = useQuery({
    queryKey: ['repairs', 'overdue-count'],
    queryFn: () => listRepairs({ page: 1, limit: 1, overdue: true }),
  })
  const workload = useQuery({
    queryKey: ['repairs', 'workload'],
    queryFn: repairWorkload,
  })
  const error = totals.error
  const monthItems = useMemo(
    () =>
      (byMonth.data?.groups ?? []).map((row) => ({
        label: row.label,
        value: row.tickets,
      })),
    [byMonth.data],
  )
  const topMachines = useMemo(
    () =>
      (byEquipment.data?.groups ?? [])
        .slice()
        .sort((a, b) => b.tickets - a.tickets)
        .slice(0, 8)
        .map((row) => ({ label: row.label, value: row.tickets })),
    [byEquipment.data],
  )
  const topFaults = useMemo(
    () =>
      (totals.data?.topFaults ?? []).map((row) => ({
        label: row.title,
        value: row.count,
      })),
    [totals.data],
  )
  const deptCost = useMemo(
    () =>
      (byDept.data?.groups ?? []).map((row) => ({
        label: row.label,
        value: Number(row.cost) || 0,
        hint: formatVnd(row.cost) || row.cost,
      })),
    [byDept.data],
  )
  return (
    <>
      <PageHeader title="Thống kê sửa chữa" />
      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          type="date"
          aria-label="Từ ngày"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Input
          type="date"
          aria-label="Đến ngày"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </div>
      {error && <ErrorState error={error} onRetry={() => void totals.refetch()} />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard title="Tổng phiếu" value={totals.data?.totals.tickets ?? '—'} />
        <KpiCard title="Đang mở" value={open.data?.total ?? '—'} />
        <KpiCard title="Quá hạn" value={overdue.data?.total ?? '—'} />
        <KpiCard title="Chi phí" value={formatVnd(totals.data?.totals.cost) || '—'} />
        <KpiCard title="MTTR" value={hours(totals.data?.totals.mttrHours)} />
        <KpiCard title="MTBF" value={hours(totals.data?.mtbfHours)} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border p-3">
          <h2 className="mb-3 font-medium">Phiếu theo tháng</h2>
          <BarList ariaLabel="Phiếu theo tháng" items={monthItems} />
        </section>
        <section className="rounded-lg border p-3">
          <h2 className="mb-3 font-medium">Top máy hỏng</h2>
          <BarList ariaLabel="Top máy hỏng" items={topMachines} />
        </section>
        <section className="rounded-lg border p-3">
          <h2 className="mb-3 font-medium">Top lỗi</h2>
          <BarList ariaLabel="Top lỗi" items={topFaults} />
        </section>
        <section className="rounded-lg border p-3">
          <h2 className="mb-3 font-medium">Chi phí theo khoa</h2>
          <BarList ariaLabel="Chi phí theo khoa" items={deptCost} />
        </section>
      </div>
      <section className="mt-6 rounded-lg border p-3">
        <h2 className="mb-3 font-medium">Khối lượng việc theo nhân viên</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="py-1">Người</th>
              <th>Phiếu mở</th>
              <th>Quá hạn</th>
              <th>Chờ phản hồi</th>
            </tr>
          </thead>
          <tbody>
            {(workload.data ?? []).map((row) => (
              <tr key={row.id} className="border-t">
                <td className="py-1">{row.fullName}</td>
                <td>{row.open}</td>
                <td>{row.overdue}</td>
                <td>{row.awaitingResponse}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {(workload.data ?? []).length === 0 && (
          <p className="text-muted-foreground text-sm">Chưa có dữ liệu</p>
        )}
      </section>
    </>
  )
}
