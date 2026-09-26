import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Download, FileText, Lock, LockOpen, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StatusBadge } from '@/components/page/StatusBadge'
import { formatDate } from '@/lib/format/date'
import type { KpiPeriodItem, KpiPeriodType } from '../api'

const TYPE_ORDER: KpiPeriodType[] = ['week', 'month', 'quarter', 'year']

/** Nhãn kỳ: "Tuần 21/09 – 27/09/2026" / "Tháng 09/2026" / "Quý 3/2026" / "Năm 2026". */
export function periodLabel(type: KpiPeriodType, start: string, end: string): string {
  const year = start.slice(0, 4)
  if (type === 'month') return `${start.slice(5, 7)}/${year}`
  if (type === 'quarter') return `Q${Math.floor((Number(start.slice(5, 7)) - 1) / 3) + 1}/${year}`
  if (type === 'year') return year
  return `${formatDate(start)} – ${formatDate(end)}`
}

/**
 * Thanh kỳ: chọn Tuần/Tháng/Quý/Năm, điều hướng ◀ ▶, nhãn trạng thái chốt,
 * nút Chốt/Bỏ chốt (ADM, ẩn ở kỳ năm) và Xuất Excel / Tờ trình PDF.
 */
export function PeriodBar({
  type,
  onTypeChange,
  periods,
  currentStart,
  onNavigate,
  locked,
  lockedBy,
  lockedAt,
  canManage,
  ended,
  busy,
  onLock,
  onUnlock,
  onExport,
  onPrint,
}: {
  type: KpiPeriodType
  onTypeChange: (type: KpiPeriodType) => void
  periods: KpiPeriodItem[]
  currentStart: string | undefined
  onNavigate: (start: string) => void
  locked: boolean
  lockedBy: string | null
  lockedAt: string | null
  canManage: boolean
  ended: boolean
  busy: boolean
  onLock: () => void
  onUnlock: () => void
  onExport: () => void
  onPrint: () => void
}) {
  const { t } = useTranslation('performance')
  const index = periods.findIndex((p) => p.start === currentStart)
  const prev = index > 0 ? periods[index - 1] : undefined
  const next = index >= 0 && index < periods.length - 1 ? periods[index + 1] : undefined

  const status = locked ? (
    <StatusBadge
      status="success"
      label={t('period.locked', {
        date: lockedAt ? formatDate(lockedAt) : '—',
        by: lockedBy ?? '—',
      })}
    />
  ) : type === 'year' ? (
    <StatusBadge status="info" label={t('period.yearHint')} />
  ) : (
    <StatusBadge status="warning" label={t('period.current')} />
  )

  return (
    <div className="bg-card shadow-card mb-5 flex flex-col gap-3 rounded-xl p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={type} onValueChange={(value) => onTypeChange(value as KpiPeriodType)}>
          <TabsList aria-label={t('title')}>
            {TYPE_ORDER.map((value) => (
              <TabsTrigger key={value} value={value}>
                {t(`types.${value}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && type !== 'year' && !locked && (
            <Button
              size="sm"
              variant="outline"
              disabled={!ended || busy}
              title={ended ? undefined : t('period.notEnded')}
              onClick={onLock}
            >
              <Lock aria-hidden />
              {t('period.lock')}
            </Button>
          )}
          {canManage && locked && (
            <Button size="sm" variant="outline" disabled={busy} onClick={onUnlock}>
              <LockOpen aria-hidden />
              {t('period.unlock')}
            </Button>
          )}
          <Button size="sm" variant="outline" disabled={busy} onClick={onExport}>
            <Download aria-hidden />
            {t('actions.exportExcel')}
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={onPrint}>
            <FileText aria-hidden />
            {t('actions.printPdf')}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="outline"
            aria-label={t('period.prev')}
            disabled={!prev}
            onClick={() => prev && onNavigate(prev.start)}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label={t('period.next')}
            disabled={!next}
            onClick={() => next && onNavigate(next.start)}
          >
            <ChevronRight aria-hidden />
          </Button>
        </div>
        <span className="inline-flex items-center gap-2 text-[15px] font-semibold">
          <Trophy className="text-muted-foreground size-4" aria-hidden />
          {t(`types.${type}`)}
          {currentStart ? ` · ${periodLabel(type, currentStart, periods[index]?.end ?? '')}` : ''}
        </span>
        {status}
      </div>
    </div>
  )
}
