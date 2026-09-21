import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatNumber } from '@/lib/format/number'

export const PAGE_SIZES = [20, 50, 100]

export function DataTablePagination({
  page,
  limit,
  total,
  selectedCount = 0,
  onPageChange,
  onLimitChange,
}: {
  page: number
  limit: number
  total: number
  /** Số dòng đang chọn (badge khi > 0). */
  selectedCount?: number
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
}) {
  const { t } = useTranslation()
  const from = total === 0 ? 0 : (page - 1) * limit + 1
  const to = Math.min(page * limit, total)
  const pages = Math.max(1, Math.ceil(total / limit))
  return (
    <div className="border-divider flex flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5 text-[13px]">
      <div className="text-muted-foreground flex items-center gap-2">
        <span>
          {t('table.showing', {
            from: formatNumber(from),
            to: formatNumber(to),
            total: formatNumber(total),
          })}
        </span>
        {selectedCount > 0 && (
          <Badge variant="info" data-testid="table-selected-count">
            {t('table.selected', { count: selectedCount })}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground hidden sm:inline">{t('table.rowsPerPage')}</span>
        <Select value={String(limit)} onValueChange={(v) => onLimitChange(Number(v))}>
          <SelectTrigger size="sm" className="w-20" aria-label={t('table.rowsPerPage')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="tabular-nums">
          {page} / {pages}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={t('table.prev')}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={t('table.next')}
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </div>
  )
}
