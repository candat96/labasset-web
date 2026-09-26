import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'
import { useActiveGroup } from './NavRail'

/** Tab các màn của nhóm đang mở — nằm giữa thanh trên như Figma Medone. */
export function SectionTabs() {
  const { t } = useTranslation('menu')
  const group = useActiveGroup()
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
          end={item.path === '/'}
          className={({ isActive }) =>
            cn(
              'rounded-md px-3 py-1.5 text-[13.5px] font-medium whitespace-nowrap transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground shadow-[0_1px_2px_rgb(0_111_238/0.35)]'
                : 'bg-muted text-foreground/80 hover:bg-muted/70 hover:text-foreground',
            )
          }
        >
          {t(item.labelKey.replace('menu:', ''))}
        </NavLink>
      ))}
    </nav>
  )
}
