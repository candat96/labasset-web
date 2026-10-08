import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { MoreHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface RowAction {
  key: string
  /** Nhãn đọc được: dùng cho tooltip/aria khi nút chỉ có biểu tượng. */
  label: string
  icon?: ReactNode
  onClick?: () => void
  to?: string
  variant?: 'default' | 'destructive'
  disabled?: boolean
  /** Ngăn cách trong menu "…" (đặt trước mục này). */
  separator?: boolean
}

/**
 * Cột thao tác của một dòng bảng: `max` thao tác đầu hiện thành nút biểu tượng,
 * phần còn lại gom vào menu "…".
 *
 * Bảng thường gắn `onRowClick` để mở chi tiết, nên mọi cú bấm ở đây phải chặn
 * nổi bọt — không chặn thì bấm "xoá" lại mở luôn trang chi tiết.
 */
export function RowActions({
  items,
  max = 2,
}: {
  items: (RowAction | false | null | undefined)[]
  max?: number
}) {
  const { t } = useTranslation()
  const list = items.filter((item): item is RowAction => !!item)
  if (list.length === 0) return null
  const inline = list.slice(0, max)
  const more = list.slice(max)
  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation()

  return (
    <div className="flex items-center justify-end gap-0.5" onClick={stop} data-testid="row-actions">
      {inline.map((item) =>
        item.to ? (
          <Button
            key={item.key}
            asChild
            size="icon"
            variant="ghost"
            className="size-8"
            title={item.label}
            aria-label={item.label}
            disabled={item.disabled}
          >
            <Link to={item.to}>{item.icon}</Link>
          </Button>
        ) : (
          <Button
            key={item.key}
            size="icon"
            variant="ghost"
            className={item.variant === 'destructive' ? 'text-destructive size-8' : 'size-8'}
            title={item.label}
            aria-label={item.label}
            disabled={item.disabled}
            onClick={item.onClick}
          >
            {item.icon}
          </Button>
        ),
      )}
      {more.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="size-8"
              title={t('actions.moreMenu', { defaultValue: 'Thêm' })}
              aria-label={t('actions.moreMenu', { defaultValue: 'Thêm' })}
            >
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            {more.map((item) => (
              <div key={item.key}>
                {item.separator && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  variant={item.variant === 'destructive' ? 'destructive' : 'default'}
                  disabled={item.disabled}
                  onSelect={item.onClick}
                  asChild={!!item.to}
                >
                  {item.to ? (
                    <Link to={item.to}>
                      {item.icon}
                      {item.label}
                    </Link>
                  ) : (
                    <>
                      {item.icon}
                      {item.label}
                    </>
                  )}
                </DropdownMenuItem>
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
