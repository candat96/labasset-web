import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface DataListItem {
  label: ReactNode
  value: ReactNode
  /** Chiếm cả hàng (mô tả dài). */
  full?: boolean
}

/**
 * Danh sách nhãn/giá trị cho màn chi tiết: nhãn 12.5 muted, giá trị 14/500.
 * `columns` 1–3; giá trị rỗng hiện "—".
 */
export function DataList({
  items,
  columns = 2,
  className,
}: {
  items: DataListItem[]
  columns?: 1 | 2 | 3
  className?: string
}) {
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-4',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3',
        className,
      )}
    >
      {items.map((item, i) => (
        <div key={i} className={cn('min-w-0', item.full && 'sm:col-span-full')}>
          <dt className="text-muted-foreground text-[12.5px] leading-4 font-medium">
            {item.label}
          </dt>
          <dd className="mt-1 text-[14px] leading-5 font-medium break-words">
            {item.value === null || item.value === undefined || item.value === '' ? (
              <span className="text-subtle">—</span>
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  )
}
