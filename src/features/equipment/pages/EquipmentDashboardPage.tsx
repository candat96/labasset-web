import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { Activity, CalendarCheck, Gauge, Repeat, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { PageHeader } from '@/components/page/PageHeader'
import { DateRangePicker } from '@/components/date-picker'
import { AsyncSelect } from '@/components/form/async-select'
import { Label } from '@/components/ui/label'
import { KpiCard, type KpiTone } from '@/components/kpi-card'
import { departmentOptions } from '@/api/references'
import { runReport, type ReportParamValues, type ReportRunResult } from '@/features/reports/api'
import { last30DayRange } from '@/features/reports/schema-form'
import { formatNumber } from '@/lib/format/number'

type Row = Record<string, unknown>

const rowsOf = (result: ReportRunResult | void | undefined): Row[] => (result?.rows ?? []) as Row[]

const sum = (rows: Row[], key: string): number =>
  rows.reduce((total, row) => total + Number(row[key] ?? 0), 0)

/**
 * C5 (IMM-11) — Bảng điều hành thiết bị.
 *
 * Bốn chỉ số đọc thẳng từ bốn báo cáo thiết bị; đây là báo cáo riêng, **không**
 * lấy từ module `kpi` (chỉ số ở đó là của nhân viên và bị khoá theo kỳ đã chốt).
 * Không có việc nào đến hạn thì trả `—` chứ không phải 0%: 0% là làm trễ tất cả.
 */
export function Component() {
  const { t } = useTranslation('equipment')
  const initial = useMemo(() => last30DayRange(), [])
  const [range, setRange] = useState<{ from?: string; to?: string }>(initial)
  const [departmentId, setDepartmentId] = useState<string | null>(null)

  const params: ReportParamValues = {
    ...(range.from ? { from: range.from } : {}),
    ...(range.to ? { to: range.to } : {}),
    ...(departmentId ? { departmentId } : {}),
  }
  const load = (key: string) => runReport(key, params, 'json', 1, 1000) as Promise<ReportRunResult>

  const availability = useQuery({
    queryKey: ['equipment-dashboard', 'availability', params],
    queryFn: () => load('equipment.availability'),
    staleTime: 300_000,
  })
  const maintenance = useQuery({
    queryKey: ['equipment-dashboard', 'maintenance-compliance', params],
    queryFn: () => load('equipment.maintenanceCompliance'),
    staleTime: 300_000,
  })
  const repeat = useQuery({
    queryKey: ['equipment-dashboard', 'repeat-failures', params],
    queryFn: () => load('equipment.repeatFailures'),
    staleTime: 300_000,
  })
  const calibration = useQuery({
    queryKey: ['equipment-dashboard', 'calibration-compliance', params],
    queryFn: () => load('equipment.calibrationCompliance'),
    staleTime: 300_000,
  })

  const periodDays = useMemo(() => {
    const from = range.from ? parseISO(range.from) : null
    const to = range.to ? parseISO(range.to) : null
    if (!from || !to) return 30
    return Math.max(1, differenceInCalendarDays(to, from) + 1)
  }, [range.from, range.to])

  const availabilityValue = useMemo(() => {
    const rows = rowsOf(availability.data)
    if (availability.isPending || rows.length === 0) return '—'
    const totalHours = rows.length * periodDays * 24
    if (totalHours <= 0) return '—'
    const upRate = Math.max(0, 1 - sum(rows, 'downHours') / totalHours)
    return `${formatNumber(upRate * 100, 1)}%`
  }, [availability.data, availability.isPending, periodDays])

  const maintenanceValue = useMemo(() => {
    const rows = rowsOf(maintenance.data)
    const due = sum(rows, 'due')
    if (maintenance.isPending) return '—'
    return due > 0 ? `${formatNumber((sum(rows, 'onTime') / due) * 100, 1)}%` : '—'
  }, [maintenance.data, maintenance.isPending])

  const calibrationValue = useMemo(() => {
    const rows = rowsOf(calibration.data)
    const due = sum(rows, 'due')
    if (calibration.isPending) return '—'
    return due > 0 ? `${formatNumber((sum(rows, 'onTime') / due) * 100, 1)}%` : '—'
  }, [calibration.data, calibration.isPending])

  const repeatValue = repeat.isPending ? '—' : (repeat.data?.total ?? 0)

  const cards: {
    key: string
    reportKey: string
    title: string
    value: string | number
    icon: typeof Activity
    tone: KpiTone
  }[] = [
    {
      key: 'availability',
      reportKey: 'equipment.availability',
      title: t('dashboard.availability'),
      value: availabilityValue,
      icon: Gauge,
      tone: 'success',
    },
    {
      key: 'maintenanceCompliance',
      reportKey: 'equipment.maintenanceCompliance',
      title: t('dashboard.maintenanceCompliance'),
      value: maintenanceValue,
      icon: CalendarCheck,
      tone: 'info',
    },
    {
      key: 'repeatFailures',
      reportKey: 'equipment.repeatFailures',
      title: t('dashboard.repeatFailures'),
      value: repeatValue,
      icon: Repeat,
      tone: 'warning',
    },
    {
      key: 'calibrationCompliance',
      reportKey: 'equipment.calibrationCompliance',
      title: t('dashboard.calibrationCompliance'),
      value: calibrationValue,
      icon: ShieldCheck,
      tone: 'success',
    },
  ]

  return (
    <>
      <PageHeader title={t('dashboard.title')} description={t('dashboard.subtitle')} />
      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="equipment-dashboard-period">{t('dashboard.period')}</Label>
          <DateRangePicker
            from={range.from}
            to={range.to}
            onChange={setRange}
            ariaLabel={t('dashboard.period')}
          />
        </div>
        <AsyncSelect
          label={t('dashboard.department')}
          queryKey="equipment-dashboard-department"
          loadOptions={departmentOptions}
          value={departmentId}
          onChange={(next) => setDepartmentId(typeof next === 'string' ? next : null)}
          clearable
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ key, reportKey, title, value, icon: Icon, tone }) => (
          <Link
            key={key}
            to={`/reports?key=${reportKey}`}
            className="block"
            aria-label={`${t('dashboard.openReport')}: ${title}`}
          >
            <KpiCard
              title={title}
              value={value}
              description={t('dashboard.currentPeriod')}
              icon={<Icon />}
              tone={tone}
            />
          </Link>
        ))}
      </div>
    </>
  )
}
