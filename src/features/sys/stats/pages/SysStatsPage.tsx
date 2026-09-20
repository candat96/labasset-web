import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { KpiCard } from '@/components/kpi-card'
import { api, unwrap } from '@/api/client'
import { formatQty } from '@/lib/format/number'
import { commonStatusMap } from '@/lib/status-maps'

export function Component() {
  const { t } = useTranslation('sys')
  const stats = useQuery({
    queryKey: ['sys-stats'],
    queryFn: () => unwrap(api.GET('/sys/stats')),
  })
  if (stats.isPending) return <p role="status">{t('stat.loading')}</p>
  if (stats.error) return <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
  const data = stats.data
  return (
    <>
      <PageHeader title={t('stat.title')} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title={t('stat.hospitals')} value={data.hospitals} />
        <KpiCard title={t('stat.users')} value={formatQty(data.users)} />
        <KpiCard title={t('stat.storage')} value={formatQty(data.storageBytes)} />
        <KpiCard title={t('stat.sampled')} value={data.sampledHospitals} />
      </div>
      <h2 className="mt-6 mb-2 text-lg font-semibold">{t('stat.byStatus')}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(data.byStatus).map(([status, count]) => (
          <KpiCard key={status} title={commonStatusMap[status]?.label ?? status} value={count} />
        ))}
      </div>
    </>
  )
}
