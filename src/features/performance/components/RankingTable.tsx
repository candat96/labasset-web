import { Fragment } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Minus, TrendingDown, TrendingUp, UserRound } from 'lucide-react'
import { SectionCard } from '@/components/page/SectionCard'
import { EmptyState } from '@/components/page/EmptyState'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/format/number'
import type { KpiAreaScore, KpiStaffRow } from '../api'

const MEDAL: Record<number, string> = {
  1: 'bg-warning-bg text-warning-fg',
  2: 'bg-neutral-bg text-neutral-fg',
  3: 'bg-destructive-bg text-destructive-fg',
}

function RankCell({ rank }: { rank: number | null }) {
  if (rank === null) {
    return (
      <span className="text-subtle tabular-nums" aria-label="—">
        —
      </span>
    )
  }
  return (
    <span
      className={cn(
        'inline-flex size-7 items-center justify-center rounded-full text-[13px] font-bold tabular-nums',
        MEDAL[rank],
      )}
    >
      {rank}
    </span>
  )
}

function RankChange({ change }: { change: number | null }) {
  const { t } = useTranslation('performance')
  if (change === null) return <span className="text-subtle">—</span>
  if (change === 0)
    return (
      <span className="text-subtle inline-flex items-center gap-1 text-[12.5px]">
        <Minus className="size-3.5" aria-hidden />
        {t('ranking.rankSame')}
      </span>
    )
  const up = change > 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[12.5px] font-medium',
        up ? 'text-success-fg' : 'text-destructive-fg',
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {up ? t('ranking.rankUp', { n: change }) : t('ranking.rankDown', { n: -change })}
    </span>
  )
}

function AreaScore({ area }: { area: KpiAreaScore | null }) {
  if (!area) return <span className="text-subtle">—</span>
  return <span className="tabular-nums">{formatNumber(area.score, 1)}</span>
}

/** Sắp hạng trước, nhóm "chưa đủ mẫu" xám ở cuối; giữ nguyên thứ tự trong nhóm. */
function orderRows(rows: KpiStaffRow[]): KpiStaffRow[] {
  return [...rows].sort((a, b) => {
    if (a.insufficient !== b.insufficient) return a.insufficient ? 1 : -1
    if (a.rank === null && b.rank === null) return 0
    if (a.rank === null) return 1
    if (b.rank === null) return -1
    return a.rank - b.rank
  })
}

export function RankingTable({
  rows,
  deptNames,
  isLoading,
  minItems,
}: {
  rows: KpiStaffRow[]
  deptNames: Map<string, string>
  isLoading: boolean
  minItems: number
}) {
  const { t } = useTranslation('performance')
  const ordered = orderRows(rows)
  const grouped = ordered.filter((row) => row.insufficient)

  return (
    <SectionCard
      title={t('ranking.title')}
      description={t('ranking.hint')}
      flush={ordered.length > 0 || isLoading}
    >
      {isLoading ? (
        <div className="space-y-2 p-5" aria-busy>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      ) : ordered.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title={t('ranking.empty')}
          description={t('ranking.emptyHint')}
        />
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 pl-5">{t('ranking.rank')}</TableHead>
                <TableHead>{t('ranking.person')}</TableHead>
                <TableHead className="text-right">{t('ranking.credits')}</TableHead>
                <TableHead className="text-right">{t('ranking.areaRepair')}</TableHead>
                <TableHead className="text-right">{t('ranking.areaMaintenance')}</TableHead>
                <TableHead className="text-right">{t('ranking.areaCalibration')}</TableHead>
                <TableHead className="min-w-40">{t('ranking.total')}</TableHead>
                <TableHead className="pr-5 text-right">{t('ranking.rankChange')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ordered.map((row) => {
                const showGroupHeader =
                  row.insufficient && grouped.length > 0 && grouped[0]?.userId === row.userId
                return (
                  <Fragment key={row.userId}>
                    {showGroupHeader && (
                      <TableRow key={`group-${row.userId}`} className="hover:bg-transparent">
                        <TableCell
                          colSpan={8}
                          className="text-subtle bg-surface-2/60 py-1.5 pl-5 text-[12px] font-semibold uppercase"
                        >
                          <span className="font-semibold">{t('ranking.insufficientGroup')}</span>
                          <span className="ml-2 font-normal normal-case">
                            {t('ranking.insufficientHint', { n: minItems })}
                          </span>
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow
                      key={row.userId}
                      data-testid={row.rank ? `rank-${row.rank}` : undefined}
                      className={cn('cursor-pointer', row.insufficient && 'opacity-60')}
                    >
                      <TableCell className="pl-5">
                        <RankCell rank={row.rank} />
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`/performance/users/${row.userId}`}
                          className="font-medium hover:underline"
                        >
                          {row.fullName}
                        </Link>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {row.departmentId && deptNames.get(row.departmentId) && (
                            <span className="text-subtle text-[12px]">
                              {deptNames.get(row.departmentId)}
                            </span>
                          )}
                          {row.inactive && <Badge variant="neutral">{t('ranking.inactive')}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(row.credits, 1)}
                      </TableCell>
                      <TableCell className="text-right">
                        <AreaScore area={row.areas.repair} />
                      </TableCell>
                      <TableCell className="text-right">
                        <AreaScore area={row.areas.maintenance} />
                      </TableCell>
                      <TableCell className="text-right">
                        <AreaScore area={row.areas.calibration} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            className="max-w-28"
                            value={row.total ?? 0}
                            indicatorClassName={
                              row.insufficient ? 'bg-muted-foreground' : undefined
                            }
                          />
                          <span className="w-10 text-right text-[13px] font-semibold tabular-nums">
                            {row.total === null ? '—' : formatNumber(row.total, 1)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <RankChange change={row.rankChange} />
                      </TableCell>
                    </TableRow>
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </SectionCard>
  )
}
