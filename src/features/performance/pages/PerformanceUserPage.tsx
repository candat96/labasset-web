import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  Clock,
  Coins,
  ListChecks,
  SkipForward,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader, PageMeta } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { KpiCard } from '@/components/kpi-card'
import { DetailSkeleton } from '@/components/page/DetailSkeleton'
import { ErrorState } from '@/components/page/ErrorState'
import { EmptyState } from '@/components/page/EmptyState'
import { StatusBadge } from '@/components/page/StatusBadge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatNumber } from '@/lib/format/number'
import { formatDate } from '@/lib/format/date'
import * as api from '../api'
import type { KpiAreaScore, KpiPeriodType } from '../api'

const AREAS = ['repair', 'maintenance', 'calibration'] as const
type Area = (typeof AREAS)[number]
const VALID_TYPES: KpiPeriodType[] = ['week', 'month', 'quarter', 'year']
const CHART_COLOR = '#006fee'

function num(value: number | null | undefined, digits = 1) {
  return value == null ? '—' : formatNumber(value, digits)
}

function MetricBar({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{num(value, 1)}</span>
      </div>
      <Progress value={value ?? 0} />
    </div>
  )
}

function AreaScoreRow({ label, score }: { label: string; score: KpiAreaScore | null }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[13px]">
        <span className="font-medium">{label}</span>
        {score ? (
          <span className="font-semibold tabular-nums">{num(score.score, 1)}</span>
        ) : (
          <span className="text-subtle">—</span>
        )}
      </div>
      <Progress value={score?.score ?? 0} />
      {score && (
        <p className="text-subtle text-[12px] tabular-nums">
          {formatNumber(score.credits, 1)} công · {score.items} việc · {score.skipped} bỏ qua
        </p>
      )}
    </div>
  )
}

export function Component() {
  const { t } = useTranslation('performance')
  const { id = '' } = useParams()
  const [sp, setSp] = useSearchParams()
  const [area, setArea] = useState<Area>('repair')

  const typeParam = sp.get('type')
  const type: KpiPeriodType = VALID_TYPES.includes(typeParam as KpiPeriodType)
    ? (typeParam as KpiPeriodType)
    : 'month'
  const start = sp.get('start') ?? undefined
  const page = Math.max(1, Number(sp.get('page')) || 1)

  const query = useQuery({
    queryKey: ['performance', 'user', id, type, start, page],
    queryFn: () => api.getUser(id, { type, start, page, limit: 20 }),
    enabled: !!id,
  })

  const setPage = (next: number) => {
    const params = new URLSearchParams(sp)
    if (next <= 1) params.delete('page')
    else params.set('page', String(next))
    setSp(params, { replace: true })
  }

  if (query.isPending) return <DetailSkeleton label={t('user.loading')} />
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  const person = query.data
  if (!person) return <EmptyState icon={BarChart3} title={t('user.notFound')} />

  const selected: KpiAreaScore | null = person.areas[area]
  const metrics: { key: 'volume' | 'onTime' | 'speed' | 'quality'; show: boolean }[] = [
    { key: 'volume', show: true },
    { key: 'onTime', show: true },
    { key: 'speed', show: area !== 'calibration' },
    { key: 'quality', show: true },
  ]
  const chartData = person.periods.map((point) => ({
    name: formatDate(point.start),
    value: point.total ?? 0,
  }))
  const taskRows = person.tasks.items

  return (
    <>
      <PageHeader
        eyebrow={t('user.eyebrow')}
        title={person.fullName}
        badge={
          person.rank !== null ? (
            <Badge variant="info">{t('user.rank', { rank: person.rank })}</Badge>
          ) : (
            <Badge variant="neutral">
              {person.insufficient ? t('user.insufficient') : t('user.noRank')}
            </Badge>
          )
        }
        meta={
          <>
            <PageMeta icon={<Clock size={14} />}>
              {t(`types.${type}`)} · {formatDate(person.start)} – {formatDate(person.end)}
            </PageMeta>
            {person.inactive && <PageMeta>{t('user.inactive')}</PageMeta>}
          </>
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to="/performance">
              <ArrowLeft aria-hidden />
              {t('user.back')}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={t('user.total')}
          value={num(person.total, 1)}
          icon={<BarChart3 />}
          tone="info"
        />
        <KpiCard
          title={t('user.credits')}
          value={formatNumber(person.credits, 1)}
          icon={<Coins />}
          tone="success"
        />
        <KpiCard
          title={t('user.items')}
          value={person.items}
          icon={<ListChecks />}
          tone="neutral"
        />
        <KpiCard
          title={t('user.skipped')}
          value={person.skipped}
          icon={<SkipForward />}
          tone="warning"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <SectionCard title={t('areas.scoreHint')}>
          <div className="space-y-4">
            {AREAS.map((value) => (
              <AreaScoreRow key={value} label={t(`areas.${value}`)} score={person.areas[value]} />
            ))}
          </div>
        </SectionCard>
        <SectionCard title={t(`areas.${area}`)}>
          {selected ? (
            <Tabs value={area} onValueChange={(value) => setArea(value as Area)}>
              <TabsList variant="line" aria-label={t('areas.scoreHint')}>
                {AREAS.map((value) => (
                  <TabsTrigger key={value} value={value}>
                    {t(`areas.${value}`)}
                  </TabsTrigger>
                ))}
              </TabsList>
              <div className="mt-4 space-y-4">
                {metrics
                  .filter((metric) => metric.show)
                  .map((metric) => (
                    <MetricBar
                      key={metric.key}
                      label={t(`areas.${metric.key}`)}
                      value={selected[metric.key]}
                    />
                  ))}
              </div>
            </Tabs>
          ) : (
            <EmptyState icon={BarChart3} title={t('areas.noArea')} />
          )}
        </SectionCard>
      </div>

      <SectionCard className="mt-5" title={t('user.chartTitle')} description={t('user.chartHint')}>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="var(--color-divider)" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                width={32}
              />
              <Tooltip />
              <Bar dataKey="value" fill={CHART_COLOR} radius={[6, 6, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard
        className="mt-5"
        title={t('user.tasksTitle')}
        description={t('user.tasksHint')}
        flush={taskRows.length > 0}
      >
        {taskRows.length === 0 ? (
          <EmptyState icon={ClipboardList} title={t('user.taskEmpty')} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">{t('user.code')}</TableHead>
                  <TableHead>{t('user.equipment')}</TableHead>
                  <TableHead>{t('user.department')}</TableHead>
                  <TableHead>{t('user.area')}</TableHead>
                  <TableHead>{t('user.completedAt')}</TableHead>
                  <TableHead>{t('user.onTime')}</TableHead>
                  <TableHead className="pr-5 text-right">{t('user.quality')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {taskRows.map((task) => (
                  <TableRow key={`${task.area}-${task.id}`}>
                    <TableCell className="pl-5 font-medium">{task.code}</TableCell>
                    <TableCell>{task.equipmentName ?? task.title}</TableCell>
                    <TableCell>{task.departmentName ?? '—'}</TableCell>
                    <TableCell>{t(`areas.${task.area}`)}</TableCell>
                    <TableCell>{formatDate(task.completedAt)}</TableCell>
                    <TableCell>
                      <StatusBadge
                        status={task.onTime ? 'success' : 'danger'}
                        label={task.onTime ? t('user.onTimeYes') : t('user.onTimeNo')}
                      />
                    </TableCell>
                    <TableCell className="pr-5 text-right tabular-nums">
                      {num(task.quality, 1)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {person.tasks.total > person.tasks.limit && (
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-subtle text-[13px]">
              {page}/{Math.max(1, Math.ceil(person.tasks.total / person.tasks.limit))}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                {t('period.prev')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= Math.ceil(person.tasks.total / person.tasks.limit)}
                onClick={() => setPage(page + 1)}
              >
                {t('period.next')}
              </Button>
            </div>
          </div>
        )}
      </SectionCard>
    </>
  )
}
