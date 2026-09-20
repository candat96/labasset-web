import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Big from 'big.js'
import { PageHeader } from '@/components/page/PageHeader'
import { KpiCard } from '@/components/kpi-card'
import { ErrorState } from '@/components/page/ErrorState'
import { DatePicker } from '@/components/date-picker'
import { FilterBar, FilterField } from '@/components/filter-bar'
import { useServerTable } from '@/components/data-table'
import { formatVnd } from '@/lib/format/money'
import { formatNumber } from '@/lib/format/number'
import { dayRangeToIso } from '@/lib/format/date-range'
import { useCan } from '@/app/guards/useCan'
import { ADM, STAFF } from '@/routes/roles'
import { listRepairs, repairStats, repairWorkload } from '../api'
import { BarList } from '../components/BarList'
import { OPEN_STATUSES } from '../types'

function defaultFrom() {
  const date = new Date()
  date.setUTCMonth(date.getUTCMonth() - 3)
  return date.toISOString().slice(0, 10)
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export function Component() {
  const { t } = useTranslation('repairs')
  const { t: tc } = useTranslation()
  const canViewStats = useCan(STAFF)
  const isAdm = useCan(ADM)
  // from/to giữ trên URL để F5/chia sẻ link giữ nguyên kỳ thống kê.
  const table = useServerTable({ filterKeys: ['from', 'to'] })
  const from = table.params.filters.from ?? defaultFrom()
  const to = table.params.filters.to ?? today()
  const range = dayRangeToIso(from, to)
  const statsKey = ['repairs', 'stats', range.from, range.to] as const

  // Một request groupBy=month đã có totals + topFaults → không gọi trùng.
  const byMonth = useQuery({
    queryKey: [...statsKey, 'month'],
    queryFn: () => repairStats({ ...range, groupBy: 'month' }),
    enabled: canViewStats,
  })
  const byEquipment = useQuery({
    queryKey: [...statsKey, 'equipment'],
    queryFn: () => repairStats({ ...range, groupBy: 'equipment' }),
    enabled: canViewStats,
  })
  const byDept = useQuery({
    queryKey: [...statsKey, 'department'],
    queryFn: () => repairStats({ ...range, groupBy: 'department' }),
    enabled: canViewStats,
  })
  const open = useQuery({
    queryKey: ['repairs', 'open-count'],
    queryFn: () => listRepairs({ page: 1, limit: 1, status: OPEN_STATUSES.join(',') }),
    enabled: canViewStats,
  })
  const overdue = useQuery({
    queryKey: ['repairs', 'overdue-count'],
    queryFn: () => listRepairs({ page: 1, limit: 1, overdue: true }),
    enabled: canViewStats,
  })
  // `workload` chỉ HOSPITAL_ADMIN gọi được (RepairStatsController).
  const workload = useQuery({
    queryKey: ['repairs', 'workload'],
    queryFn: repairWorkload,
    enabled: isAdm,
  })
  const totals = byMonth.data?.totals
  const error = byMonth.error ?? byEquipment.error ?? byDept.error
  const retry = () => {
    void byMonth.refetch()
    void byEquipment.refetch()
    void byDept.refetch()
  }
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
      (byMonth.data?.topFaults ?? []).map((row) => ({
        label: row.title,
        value: row.count,
      })),
    [byMonth.data],
  )
  // Tiền là chuỗi: dùng Big.js để tính bề rộng cột, không Number() giá trị tiền.
  const deptCost = useMemo(() => {
    const groups = byDept.data?.groups ?? []
    const costs = groups.map((row) => {
      try {
        return new Big(row.cost || '0')
      } catch {
        return new Big(0)
      }
    })
    const max = costs.reduce((acc, value) => (value.gt(acc) ? value : acc), new Big(0))
    return groups.map((row, index) => ({
      label: row.label,
      value: max.gt(0) ? costs[index]!.div(max).times(100).toNumber() : 0,
      hint: formatVnd(row.cost) || row.cost,
    }))
  }, [byDept.data])
  const hours = (value: number | null | undefined) =>
    value == null ? '—' : t('stats.hours', { n: formatNumber(value, 1) })
  return (
    <>
      <PageHeader title={t('stats.title')} />
      {!canViewStats && <p role="alert">{t('stats.forbidden')}</p>}
      <FilterBar
        className="mb-4"
        onClear={table.params.filters.from || table.params.filters.to ? table.reset : undefined}
      >
        <FilterField label={t('stats.from')}>
          <DatePicker
            ariaLabel={t('stats.from')}
            value={from}
            onChange={(value) => table.setFilter('from', value)}
          />
        </FilterField>
        <FilterField label={t('stats.to')}>
          <DatePicker
            ariaLabel={t('stats.to')}
            value={to}
            onChange={(value) => table.setFilter('to', value)}
          />
        </FilterField>
      </FilterBar>
      {error && <ErrorState error={error} onRetry={retry} />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard title={t('stats.tickets')} value={totals?.tickets ?? '—'} />
        <KpiCard title={t('stats.open')} value={open.data?.total ?? '—'} />
        <KpiCard title={t('stats.overdue')} value={overdue.data?.total ?? '—'} />
        <KpiCard title={t('stats.cost')} value={formatVnd(totals?.cost) || '—'} />
        <KpiCard title={t('stats.mttr')} value={hours(totals?.mttrHours)} />
        <KpiCard title={t('stats.mtbf')} value={hours(byEquipment.data?.mtbfHours)} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border p-3">
          <h2 className="mb-3 font-medium">{t('stats.byMonth')}</h2>
          <BarList ariaLabel={t('stats.byMonth')} items={monthItems} />
        </section>
        <section className="rounded-lg border p-3">
          <h2 className="mb-3 font-medium">{t('stats.topMachines')}</h2>
          <BarList ariaLabel={t('stats.topMachines')} items={topMachines} />
        </section>
        <section className="rounded-lg border p-3">
          <h2 className="mb-3 font-medium">{t('stats.topFaults')}</h2>
          <BarList ariaLabel={t('stats.topFaults')} items={topFaults} />
        </section>
        <section className="rounded-lg border p-3">
          <h2 className="mb-3 font-medium">{t('stats.costByDepartment')}</h2>
          <BarList ariaLabel={t('stats.costByDepartment')} items={deptCost} />
        </section>
      </div>
      {isAdm && (
        <section className="mt-6 rounded-lg border p-3">
          <h2 className="mb-3 font-medium">{t('stats.workload')}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="py-1">{t('stats.person')}</th>
                <th>{t('stats.openTickets')}</th>
                <th>{t('stats.overdue')}</th>
                <th>{t('stats.awaitingResponse')}</th>
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
            <p className="text-muted-foreground text-sm">{tc('table.empty')}</p>
          )}
        </section>
      )}
    </>
  )
}
