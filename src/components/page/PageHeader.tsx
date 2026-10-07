import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { findMenuItem } from '@/routes/menu'
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
  back,
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
  /**
   * Nút quay lại. Để trống thì trang cấp 2 (đường dẫn sâu hơn mục menu khớp)
   * tự có nút về trang danh sách; truyền đường dẫn để đổi đích, `false` để tắt.
   */
  back?: string | false
  className?: string
}) {
  const { pathname } = useLocation()
  const found = findMenuItem(pathname)
  const backTo =
    back === false
      ? undefined
      : (back ?? (found && pathname !== found.item.path ? found.item.path : undefined))
  return (
    <div
      className={cn(
        // Dải tiêu đề trắng tràn viền ngay dưới thanh trên, gọn như Figma Medone.
        'bg-card border-divider -mx-3 -mt-3 mb-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b px-3 py-2.5 sm:-mx-4 sm:-mt-4 sm:px-4',
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-2">
        {backTo && (
          <Link
            to={backTo}
            aria-label="Quay lại"
            data-testid="page-back"
            className="text-muted-foreground hover:bg-muted hover:text-foreground mt-0.5 -ml-1 flex size-8 shrink-0 items-center justify-center rounded-md"
          >
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-muted-foreground mb-1 text-[12px] font-semibold tracking-[0.06em] uppercase">
              {eyebrow}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1 className="text-[20px] leading-7 font-semibold tracking-[-0.01em]">{title}</h1>
            {badge}
          </div>
          {description && (
            <p className="text-muted-foreground mt-0.5 max-w-2xl text-[13px] leading-5">
              {description}
            </p>
          )}
          {meta && (
            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
              {meta}
            </div>
          )}
        </div>
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
