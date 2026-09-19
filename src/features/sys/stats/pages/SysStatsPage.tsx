import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { KpiCard } from '@/components/kpi-card'
import { api, unwrap } from '@/api/client'
import { formatQty } from '@/lib/format/number'
import { commonStatusMap } from '@/lib/status-maps'

export function Component() {
  const stats = useQuery({
    queryKey: ['sys-stats'],
    queryFn: () => unwrap(api.GET('/sys/stats')),
  })
  if (stats.isPending) return <p role="status">Đang tải thống kê…</p>
  if (stats.error) return <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
  const data = stats.data
  return (
    <>
      <PageHeader title="Thống kê hệ thống" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Bệnh viện" value={data.hospitals} />
        <KpiCard title="Người dùng" value={formatQty(data.users)} />
        <KpiCard title="Dung lượng (byte)" value={formatQty(data.storageBytes)} />
        <KpiCard title="Viện có số liệu" value={data.sampledHospitals} />
      </div>
      <h2 className="mt-6 mb-2 text-lg font-semibold">Theo trạng thái</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(data.byStatus).map(([status, count]) => (
          <KpiCard key={status} title={commonStatusMap[status]?.label ?? status} value={count} />
        ))}
      </div>
    </>
  )
}
