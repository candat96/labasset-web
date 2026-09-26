import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Clock, Gauge, ListChecks, Percent, Timer, Users } from 'lucide-react'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { KpiCard } from '@/components/kpi-card'
import { EmptyState } from '@/components/page/EmptyState'
import { ErrorState } from '@/components/page/ErrorState'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useConfirm } from '@/components/confirm-dialog'
import { useDepartmentLookup, useUserLookup, shortId } from '@/api/lookups'
import { messageFor } from '@/api/errors'
import { formatNumber } from '@/lib/format/number'
import { useCan } from '@/app/guards/useCan'
import { ADM, STAFF } from '@/routes/roles'
import { PeriodBar } from '../components/PeriodBar'
import { RankingTable } from '../components/RankingTable'
import * as api from '../api'
import type { KpiAreaScore, KpiPeriodType, KpiStaffRow, KpiWeights } from '../api'

const VALID_TYPES: KpiPeriodType[] = ['week', 'month', 'quarter', 'year']
const AREAS = ['repair', 'maintenance', 'calibration'] as const
type Area = (typeof AREAS)[number]
const ALL_DEPARTMENTS = '__all__'

function num(value: number | null | undefined, digits = 1): string {
  return value == null ? '—' : formatNumber(value, digits)
}

function pct(value: number | null | undefined): string {
  return value == null ? '—' : `${formatNumber(value, 1)}%`
}

/** Chênh lệch % so kỳ trước; null khi thiếu dữ liệu hoặc mốc trước bằng 0. */
function trendOf(current: number | null | undefined, previous: number | null | undefined) {
  if (current == null || previous == null || previous === 0) return undefined
  return Math.round(((current - previous) / previous) * 1000) / 10
}

function AreaTab({
  area,
  rows,
  deptNames,
  isLoading,
}: {
  area: Area
  rows: KpiStaffRow[]
  deptNames: Map<string, string>
  isLoading: boolean
}) {
  const { t } = useTranslation('performance')
  const withArea = useMemo(
    () =>
      rows
        .filter((row) => row.areas[area] !== null)
        .sort((a, b) => (b.areas[area]?.score ?? -1) - (a.areas[area]?.score ?? -1)),
    [rows, area],
  )
  const cell = (value: number | null | undefined) => (
    <span className="tabular-nums">{num(value, 1)}</span>
  )
  if (isLoading) {
    return (
      <SectionCard flush>
        <div className="space-y-2 p-5" aria-busy>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </SectionCard>
    )
  }
  return (
    <SectionCard
      title={t(`areas.${area}`)}
      description={t('areas.scoreHint')}
      flush={withArea.length > 0}
    >
      {withArea.length === 0 ? (
        <EmptyState icon={Gauge} title={t('areas.noArea')} description={t('ranking.emptyHint')} />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">{t('ranking.person')}</TableHead>
                <TableHead className="text-right">{t('areas.credits')}</TableHead>
                <TableHead className="text-right">{t('areas.items')}</TableHead>
                <TableHead className="text-right">{t('areas.skipped')}</TableHead>
                <TableHead className="text-right">{t('areas.volume')}</TableHead>
                <TableHead className="text-right">{t('areas.onTime')}</TableHead>
                <TableHead className="text-right">{t('areas.speed')}</TableHead>
                <TableHead className="text-right">{t('areas.quality')}</TableHead>
                <TableHead className="pr-5 text-right">{t('areas.score')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withArea.map((row) => {
                const score: KpiAreaScore = row.areas[area]!
                return (
                  <TableRow key={row.userId}>
                    <TableCell className="pl-5">
                      <Link
                        to={`/performance/users/${row.userId}`}
                        className="font-medium hover:underline"
                      >
                        {row.fullName}
                      </Link>
                      {row.departmentId && deptNames.get(row.departmentId) && (
                        <p className="text-subtle text-[12px]">{deptNames.get(row.departmentId)}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(score.credits, 1)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{score.items}</TableCell>
                    <TableCell className="text-right tabular-nums">{score.skipped}</TableCell>
                    <TableCell className="text-right">{cell(score.volume)}</TableCell>
                    <TableCell className="text-right">{cell(score.onTime)}</TableCell>
                    <TableCell className="text-right">{cell(score.speed)}</TableCell>
                    <TableCell className="text-right">{cell(score.quality)}</TableCell>
                    <TableCell className="pr-5 text-right">
                      <span className="font-semibold tabular-nums">{num(score.score, 1)}</span>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </SectionCard>
  )
}

function DepartmentsTab({ type, start }: { type: KpiPeriodType; start: string | undefined }) {
  const { t } = useTranslation('performance')
  const query = useQuery({
    queryKey: ['performance', 'departments', type, start],
    queryFn: () => api.getDepartments({ type, start }),
  })
  if (query.isPending) {
    return (
      <SectionCard flush>
        <div className="space-y-2 p-5" aria-busy>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </SectionCard>
    )
  }
  if (query.error) {
    return (
      <SectionCard>
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </SectionCard>
    )
  }
  const rows = query.data?.departments ?? []
  return (
    <SectionCard title={t('departments.title')} flush={rows.length > 0}>
      {rows.length === 0 ? (
        <EmptyState icon={Users} title={t('departments.empty')} />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">{t('departments.department')}</TableHead>
                <TableHead className="text-right">{t('departments.items')}</TableHead>
                <TableHead className="text-right">{t('departments.credits')}</TableHead>
                <TableHead className="text-right">{t('departments.onTime')}</TableHead>
                <TableHead className="text-right">{t('departments.avgHandleHours')}</TableHead>
                <TableHead className="pr-5 text-right">{t('departments.avgQuality')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.departmentId ?? row.name}>
                  <TableCell className="pl-5 font-medium">
                    {row.departmentId ? null : t('departments.unknown')}
                    {row.departmentId ? row.name : ''}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.items}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(row.credits, 1)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{pct(row.onTime)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {num(row.avgHandleHours, 2)}
                  </TableCell>
                  <TableCell className="pr-5 text-right tabular-nums">
                    {num(row.avgQuality, 1)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </SectionCard>
  )
}

export function Component() {
  const { t } = useTranslation('performance')
  const qc = useQueryClient()
  const { confirm, dialog } = useConfirm()
  const isAdm = useCan(ADM)
  const isStaff = useCan(STAFF)
  const [sp, setSp] = useSearchParams()

  const typeParam = sp.get('type')
  const type: KpiPeriodType = VALID_TYPES.includes(typeParam as KpiPeriodType)
    ? (typeParam as KpiPeriodType)
    : 'month'
  const start = sp.get('start') ?? undefined
  const departmentId = sp.get('departmentId') ?? undefined
  const view = sp.get('view') ?? 'overview'

  const patch = (values: Record<string, string | undefined>) => {
    setSp(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(values)) {
          if (value === undefined || value === '') next.delete(key)
          else next.set(key, value)
        }
        return next
      },
      { replace: true },
    )
  }

  const periodsQ = useQuery({
    queryKey: ['performance', 'periods', type],
    queryFn: () => api.getPeriods(type),
  })
  const boardQ = useQuery({
    queryKey: ['performance', 'board', type, start, departmentId],
    queryFn: () => api.getBoard({ type, start, departmentId }),
    enabled: isStaff,
  })

  const board = boardQ.data
  const periods = periodsQ.data?.periods ?? []
  const currentStart = board?.start
  const index = periods.findIndex((p) => p.start === currentStart)
  const prevStart = index > 0 ? periods[index - 1]?.start : undefined

  const prevBoardQ = useQuery({
    queryKey: ['performance', 'board', type, prevStart, departmentId],
    queryFn: () => api.getBoard({ type, start: prevStart, departmentId }),
    enabled: isStaff && !!prevStart && type !== 'year',
  })

  const deptNames = useDepartmentLookup(isStaff)
  // lockedBy là id người chốt (API chưa trả tên) — ADM tra được /v1/users, vai trò khác hiện id rút gọn.
  const userNames = useUserLookup(isAdm)
  const lockedByName = board?.lockedBy
    ? (userNames.get(board.lockedBy) ?? shortId(board.lockedBy))
    : null
  const weights: KpiWeights | undefined = board?.weights

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['performance'] })
  }

  const lockMutation = useMutation({
    mutationFn: async () => {
      if (!currentStart) return
      const note = await confirm({
        title: t('period.lockTitle', { period: currentStart }),
        description: t('period.lockHint'),
        confirmLabel: t('period.lock'),
      })
      if (note === false) return false
      await api.lockPeriod(type, currentStart, typeof note === 'string' ? note : undefined)
      return true
    },
    onSuccess: (done) => {
      if (done) {
        toast.success(t('toast.locked'))
        invalidate()
      }
    },
    onError: (error) => toast.error(messageFor(error)),
  })

  const unlockMutation = useMutation({
    mutationFn: async () => {
      if (!currentStart) return false
      const ok = await confirm({
        title: t('period.unlockTitle', { period: currentStart }),
        description: t('period.unlockHint'),
        destructive: true,
        confirmLabel: t('period.unlock'),
      })
      if (ok === false) return false
      await api.unlockPeriod(type, currentStart)
      return true
    },
    onSuccess: (done) => {
      if (done) {
        toast.success(t('toast.unlocked'))
        invalidate()
      }
    },
    onError: (error) => toast.error(messageFor(error)),
  })

  const onExport = async () => {
    try {
      await api.exportXlsx({ type, start, departmentId })
    } catch (error) {
      toast.error(messageFor(error))
    }
  }
  const onPrint = async () => {
    try {
      await api.printSummaryPdf({ type, start, departmentId })
    } catch (error) {
      toast.error(messageFor(error))
    }
  }

  const totals = board?.totals
  const prevTotals = prevBoardQ.data?.totals
  const ended = !!board?.end && board.end < new Date().toISOString().slice(0, 10)
  const noSpeed = board?.locked && totals?.avgHandleHours == null

  return (
    <>
      {dialog}
      <PageHeader
        title={t('title')}
        description={t('hint')}
        meta={
          board && weights ? (
            <span className="text-subtle">
              {t('areas.weights')}: SC {weights.areaWeights.repair}% · BD{' '}
              {weights.areaWeights.maintenance}% · KĐ {weights.areaWeights.calibration}%
            </span>
          ) : undefined
        }
        actions={
          <Select
            value={departmentId ?? ALL_DEPARTMENTS}
            onValueChange={(value) =>
              patch({ departmentId: value === ALL_DEPARTMENTS ? undefined : value })
            }
          >
            <SelectTrigger className="w-52" aria-label={t('filters.department')}>
              <SelectValue placeholder={t('filters.allDepartments')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_DEPARTMENTS}>{t('filters.allDepartments')}</SelectItem>
              {[...deptNames.entries()].map(([id, name]) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <PeriodBar
        type={type}
        onTypeChange={(next) => patch({ type: next, start: undefined })}
        periods={periods}
        currentStart={currentStart}
        onNavigate={(next) => patch({ start: next })}
        locked={!!board?.locked}
        lockedBy={lockedByName}
        lockedAt={board?.lockedAt ?? null}
        canManage={isAdm}
        ended={ended}
        busy={lockMutation.isPending || unlockMutation.isPending}
        onLock={() => lockMutation.mutate()}
        onUnlock={() => unlockMutation.mutate()}
        onExport={() => void onExport()}
        onPrint={() => void onPrint()}
      />

      {boardQ.error ? (
        <ErrorState error={boardQ.error} onRetry={() => void boardQ.refetch()} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title={t('totals.items')}
              value={totals ? totals.items : '—'}
              icon={<ListChecks />}
              tone="info"
              trend={trendOf(totals?.items, prevTotals?.items)}
            />
            <KpiCard
              title={t('totals.onTime')}
              value={pct(totals?.onTime)}
              icon={<Percent />}
              tone="success"
              trend={trendOf(totals?.onTime, prevTotals?.onTime)}
            />
            <KpiCard
              title={t('totals.avgHandleHours')}
              value={totals?.avgHandleHours == null ? '—' : num(totals.avgHandleHours, 2)}
              description={noSpeed ? t('totals.noSpeed') : undefined}
              icon={<Timer />}
              tone="neutral"
              trend={trendOf(totals?.avgHandleHours, prevTotals?.avgHandleHours)}
            />
            <KpiCard
              title={t('totals.avgQuality')}
              value={num(totals?.avgQuality, 1)}
              icon={<Clock />}
              tone="warning"
              trend={trendOf(totals?.avgQuality, prevTotals?.avgQuality)}
            />
          </div>

          <Tabs className="mt-5" value={view} onValueChange={(value) => patch({ view: value })}>
            <TabsList variant="line" aria-label={t('title')}>
              <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
              {AREAS.map((area) => (
                <TabsTrigger key={area} value={area}>
                  {t(`tabs.${area}`)}
                </TabsTrigger>
              ))}
              <TabsTrigger value="departments">{t('tabs.departments')}</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <RankingTable
                rows={board?.staff ?? []}
                deptNames={deptNames}
                isLoading={boardQ.isPending}
                minItems={weights?.minItems ?? 3}
              />
            </TabsContent>
            {AREAS.map((area) => (
              <TabsContent key={area} value={area}>
                <AreaTab
                  area={area}
                  rows={board?.staff ?? []}
                  deptNames={deptNames}
                  isLoading={boardQ.isPending}
                />
              </TabsContent>
            ))}
            <TabsContent value="departments">
              <DepartmentsTab type={type} start={currentStart ?? start} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </>
  )
}
