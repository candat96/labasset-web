import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Tiêu đề trang: title 24/700 tracking chặt, badge cạnh title, dòng mô tả
 * hoặc `meta` (chip icon + text), nút hành động bên phải.
 */
export function PageHeader({
  title,
  description,
  actions,
  badge,
  meta,
  eyebrow,
  className,
}: {
  title: string
  description?: string
  actions?: ReactNode
  badge?: ReactNode
  /** Hàng chip ngữ cảnh dưới title (khoa · người · ngày…). */
  meta?: ReactNode
  /** Nhãn nhỏ phía trên title (ví dụ "Phiếu yêu cầu"). */
  eyebrow?: string
  className?: string
}) {
  return (
    <div
      className={cn('mb-5 flex flex-wrap items-start justify-between gap-x-6 gap-y-3', className)}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-muted-foreground mb-1 text-[12px] font-semibold tracking-[0.06em] uppercase">
            {eyebrow}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="text-[24px] leading-8 font-bold tracking-[-0.02em]">{title}</h1>
          {badge}
        </div>
        {description && (
          <p className="text-muted-foreground mt-1 max-w-2xl text-[13.5px] leading-5">
            {description}
          </p>
        )}
        {meta && (
          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
            {meta}
          </div>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Một mục meta: icon 14 + text. */
export function PageMeta({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 [&_svg]:size-3.5 [&_svg]:shrink-0 [&_svg]:opacity-70">
      {icon}
      <span className="truncate">{children}</span>
    </span>
  )
}
