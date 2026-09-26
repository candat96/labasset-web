import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Dãy số trang `« ‹ 1 2 3 … 10 › »` theo §Chuẩn thành phần → Bảng dữ liệu.
 * Luôn hiện trang đầu và trang cuối; quanh trang hiện tại hiện tối đa hai trang mỗi bên.
 */
export function pageWindow(page: number, pages: number, span = 2): (number | 'gap')[] {
  if (pages <= 1) return [1]
  const wanted = new Set<number>([1, pages, page])
  for (let i = 1; i <= span; i++) {
    if (page - i >= 1) wanted.add(page - i)
    if (page + i <= pages) wanted.add(page + i)
  }
  const sorted = [...wanted].sort((a, b) => a - b)
  const out: (number | 'gap')[] = []
  sorted.forEach((n, i) => {
    if (i > 0 && n - (sorted[i - 1] as number) > 1) out.push('gap')
    out.push(n)
  })
  return out
}

export function TablePager({
  page,
  pages,
  onPageChange,
  className,
}: {
  page: number
  pages: number
  onPageChange: (page: number) => void
  className?: string
}) {
  const { t } = useTranslation()
  const go = (n: number) => onPageChange(Math.min(Math.max(1, n), pages))
  return (
    <nav
      aria-label={t('table.pagination', { defaultValue: 'Phân trang' })}
      data-testid="table-pager"
      className={cn('flex items-center gap-1', className)}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('table.first', { defaultValue: 'Trang đầu' })}
        disabled={page <= 1}
        onClick={() => go(1)}
      >
        <ChevronsLeft aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('table.prev')}
        disabled={page <= 1}
        onClick={() => go(page - 1)}
      >
        <ChevronLeft aria-hidden />
      </Button>
      {pageWindow(page, pages).map((n, i) =>
        n === 'gap' ? (
          <span key={`gap-${i}`} aria-hidden className="text-muted-foreground px-1 text-[13px]">
            …
          </span>
        ) : (
          <Button
            key={n}
            variant={n === page ? 'default' : 'ghost'}
            size="icon-sm"
            aria-current={n === page ? 'page' : undefined}
            className="tabular-nums"
            onClick={() => go(n)}
          >
            {n}
          </Button>
        ),
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('table.next')}
        disabled={page >= pages}
        onClick={() => go(page + 1)}
      >
        <ChevronRight aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={t('table.last', { defaultValue: 'Trang cuối' })}
        disabled={page >= pages}
        onClick={() => go(pages)}
      >
        <ChevronsRight aria-hidden />
      </Button>
    </nav>
  )
}
