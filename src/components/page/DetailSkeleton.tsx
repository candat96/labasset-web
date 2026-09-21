import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Hàng nhãn/giá trị giả cho DataList. */
function FieldRows({ rows }: { rows: number }) {
  return (
    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-2 h-4 w-32" />
        </div>
      ))}
    </div>
  )
}

/** Khung card giả: tiêu đề + thân. */
export function CardSkeleton({
  rows = 4,
  className,
  table = false,
}: {
  rows?: number
  className?: string
  /** Hàng bảng (thanh dài) thay cho nhãn/giá trị. */
  table?: boolean
}) {
  return (
    <div className={cn('bg-card shadow-card rounded-xl p-5', className)} aria-hidden>
      <Skeleton className="mb-4 h-4 w-36" />
      {table ? (
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : (
        <FieldRows rows={rows} />
      )}
    </div>
  )
}

/**
 * Khung xương màn chi tiết khi tải lần đầu: header (eyebrow/title/meta) +
 * cột trái (bảng + card) + cột phải (thông tin). Giữ `role="status"` cho a11y.
 */
export function DetailSkeleton({ label = 'Đang tải…' }: { label?: string }) {
  return (
    <div role="status" aria-label={label}>
      <div className="mb-5 flex items-start justify-between gap-6">
        <div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-7 w-64" />
          <div className="mt-3 flex gap-4">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-32" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <CardSkeleton table rows={5} />
          <CardSkeleton rows={4} />
        </div>
        <div className="space-y-5">
          <CardSkeleton rows={6} />
          <CardSkeleton rows={2} />
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  )
}

/** Khung xương trang tổng quan: hàng KPI + hai card. */
export function PageSkeleton({ label = 'Đang tải…', kpis = 4 }: { label?: string; kpis?: number }) {
  return (
    <div role="status" aria-label={label}>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: kpis }).map((_, i) => (
          <div key={i} className="bg-card shadow-card rounded-xl p-4 pl-5" aria-hidden>
            <Skeleton className="size-10 rounded-lg" />
            <Skeleton className="mt-3 h-7 w-16" />
            <Skeleton className="mt-2 h-3.5 w-28" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <CardSkeleton table rows={5} />
        <CardSkeleton table rows={5} />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  )
}
