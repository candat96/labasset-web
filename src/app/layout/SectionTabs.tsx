import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router'
import { findMenuItem } from '@/routes/menu'
import { cn } from '@/lib/utils'
import { useActiveGroup } from './NavRail'

/** Tab các màn của nhóm đang mở — nằm giữa thanh trên như Figma Medone. */
export function SectionTabs() {
  const { t } = useTranslation('menu')
  const group = useActiveGroup()
  const { pathname } = useLocation()
  // `isActive` của NavLink khớp theo TIỀN TỐ: đứng ở /repairs/stats thì tab
  // /repairs cũng sáng, thành ra hai tab cùng được chọn. `findMenuItem` chọn
  // mục có tiền tố dài nhất nên chỉ một tab sáng.
  const current = findMenuItem(pathname)
  if (!group || group.items.length < 2) return null
  return (
    <nav
      aria-label="Màn trong nhóm"
      data-testid="section-tabs"
      className="hidden min-w-0 items-center gap-1 overflow-x-auto lg:flex"
    >
      {group.items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end
          aria-current={current?.item.path === item.path ? 'page' : undefined}
          className={cn(
            'rounded-md px-3 py-1.5 text-[13.5px] font-medium whitespace-nowrap transition-colors',
            current?.item.path === item.path
              ? 'bg-primary text-primary-foreground shadow-[0_1px_2px_rgb(0_111_238/0.35)]'
              : 'bg-muted text-foreground/80 hover:bg-muted/70 hover:text-foreground',
          )}
        >
          {t(item.labelKey.replace('menu:', ''))}
        </NavLink>
      ))}
    </nav>
  )
}
