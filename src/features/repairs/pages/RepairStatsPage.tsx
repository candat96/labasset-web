import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import Big from 'big.js'
import { PageHeader } from '@/components/page/PageHeader'
import { KpiCard } from '@/components/kpi-card'
import { SectionCard } from '@/components/page/SectionCard'
import { EmptyState } from '@/components/page/EmptyState'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AlertTriangle, Clock, Coins, FolderOpen, Timer, Users, Wrench } from 'lucide-react'
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
      <PageHeader title={t('stats.title')} description={t('stats.hint')} />
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
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          title={t('stats.tickets')}
          value={totals?.tickets ?? '—'}
          icon={<Wrench />}
          tone="info"
        />
        <KpiCard
          title={t('stats.open')}
          value={open.data?.total ?? '—'}
          icon={<FolderOpen />}
          tone="warning"
        />
        <KpiCard
          title={t('stats.overdue')}
          value={overdue.data?.total ?? '—'}
          icon={<AlertTriangle />}
          tone="danger"
        />
        <KpiCard
          title={t('stats.cost')}
          value={formatVnd(totals?.cost) || '—'}
          icon={<Coins />}
          tone="info"
        />
        <KpiCard
          title={t('stats.mttr')}
          value={hours(totals?.mttrHours)}
          icon={<Timer />}
          tone="neutral"
        />
        <KpiCard
          title={t('stats.mtbf')}
          value={hours(byEquipment.data?.mtbfHours)}
          icon={<Clock />}
          tone="success"
        />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <SectionCard title={t('stats.byMonth')}>
          <BarList ariaLabel={t('stats.byMonth')} items={monthItems} />
        </SectionCard>
        <SectionCard title={t('stats.topMachines')}>
          <BarList ariaLabel={t('stats.topMachines')} items={topMachines} />
        </SectionCard>
        <SectionCard title={t('stats.topFaults')}>
          <BarList ariaLabel={t('stats.topFaults')} items={topFaults} />
        </SectionCard>
        <SectionCard title={t('stats.costByDepartment')}>
          <BarList ariaLabel={t('stats.costByDepartment')} items={deptCost} />
        </SectionCard>
      </div>
      {isAdm && (
        <SectionCard
          title={t('stats.workload')}
          className="mt-5"
          flush={(workload.data ?? []).length > 0}
        >
          {(workload.data ?? []).length === 0 ? (
            <EmptyState icon={Users} title={tc('table.empty')} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">{t('stats.person')}</TableHead>
                  <TableHead className="text-right">{t('stats.openTickets')}</TableHead>
                  <TableHead className="text-right">{t('stats.overdue')}</TableHead>
                  <TableHead className="pr-5 text-right">{t('stats.awaitingResponse')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(workload.data ?? []).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="pl-5 font-medium">{row.fullName}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.open}</TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${row.overdue ? 'text-destructive font-medium' : ''}`}
                    >
                      {row.overdue}
                    </TableCell>
                    <TableCell className="pr-5 text-right tabular-nums">
                      {row.awaitingResponse}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SectionCard>
      )}
    </>
  )
}
