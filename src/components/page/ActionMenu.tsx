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

export interface ActionItem {
  key: string
  label: ReactNode
  onClick?: () => void
  /** Link nội bộ (render <Link>). */
  to?: string
  variant?: 'primary' | 'outline' | 'destructive'
  disabled?: boolean
  icon?: ReactNode
  /** Ngăn cách trong menu "Thêm" (đặt trước mục này). */
  separator?: boolean
}

/**
 * Nút hành động của trang chi tiết: tối đa `max` nút hiện (mục đầu = primary,
 * còn lại outline), phần dư gom vào menu "Thêm" (nút thứ max+1). Truyền `items` theo thứ tự
 * quan trọng; mục falsy bị bỏ qua nên có thể viết `cond && {...}`.
 */
export function ActionMenu({
  items,
  max = 3,
  moreLabel,
}: {
  items: (ActionItem | false | null | undefined)[]
  max?: number
  moreLabel?: string
}) {
  const { t } = useTranslation()
  const label = moreLabel ?? t('actions.moreMenu', { defaultValue: 'Thêm' })
  const list = items.filter((item): item is ActionItem => !!item)
  if (list.length === 0) return null
  const inline = list.slice(0, max)
  const more = list.slice(max)
  return (
    <>
      {inline.map((item, index) => {
        const variant =
          item.variant === 'primary' || (index === 0 && !item.variant)
            ? 'default'
            : item.variant === 'destructive'
              ? 'destructive'
              : 'outline'
        if (item.to)
          return (
            <Button key={item.key} asChild variant={variant} disabled={item.disabled}>
              <Link to={item.to}>
                {item.icon}
                {item.label}
              </Link>
            </Button>
          )
        return (
          <Button key={item.key} variant={variant} disabled={item.disabled} onClick={item.onClick}>
            {item.icon}
            {item.label}
          </Button>
        )
      })}
      {more.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" aria-label={label}>
              <MoreHorizontal aria-hidden />
              {label}
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
    </>
  )
}
