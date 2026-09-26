import * as React from 'react'
import { Progress as ProgressPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

/** Thanh tiến trình shadcn — dùng cho điểm mảng / thanh điểm xếp hạng. */
function Progress({
  className,
  value,
  indicatorClassName,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root> & { indicatorClassName?: string }) {
  const safe = typeof value === 'number' ? Math.max(0, Math.min(100, value)) : 0
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn('bg-surface-2 relative h-2 w-full overflow-hidden rounded-full', className)}
      value={safe}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn('bg-primary h-full w-full flex-1 transition-all', indicatorClassName)}
        style={{ transform: `translateX(-${100 - safe}%)` }}
      />
    </ProgressPrimitive.Root>
  )
}

export { Progress }
