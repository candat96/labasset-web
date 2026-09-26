import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Khối nội dung chuẩn của trang: card bo 12, tiêu đề 16/24 semibold + mô tả,
 * `actions` góc phải, `footer` tuỳ chọn. Dùng cho mọi màn chi tiết/tổng quan.
 */
export function SectionCard({
  title,
  description,
  actions,
  children,
  footer,
  className,
  bodyClassName,
  flush = false,
}: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
  bodyClassName?: string
  /** Nội dung sát mép (bảng/danh sách) — bỏ padding thân. */
  flush?: boolean
}) {
  return (
    <section
      className={cn('bg-card shadow-card flex flex-col rounded-md transition-shadow', className)}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3">
          <div className="min-w-0">
            {title && <h2 className="text-[16px] leading-6 font-semibold">{title}</h2>}
            {description && (
              <p className="text-muted-foreground mt-0.5 text-[14px] leading-5">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div
        className={cn(
          flush ? 'px-0 pb-0' : 'px-5 pb-5',
          !title && !actions && (flush ? 'pt-0' : 'pt-5'),
          bodyClassName,
        )}
      >
        {children}
      </div>
      {footer && <footer className="border-divider border-t px-5 py-3">{footer}</footer>}
    </section>
  )
}
