import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router'
import {
  BarChart3,
  Bot,
  Boxes,
  ClipboardCheck,
  Cog,
  FileText,
  LayoutDashboard,
  Microscope,
  PanelLeft,
  PieChart,
  ShoppingCart,
  Trophy,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { MENU, type MenuGroup } from '@/routes/menu'
import { hasRole, useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Biểu tượng đại diện cho từng nhóm trên rail (Figma Medone: rail biểu tượng bên trái). */
const GROUP_ICON: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  equipment: Microscope,
  repairs: Wrench,
  performance: Trophy,
  maintenance: ClipboardCheck,
  supplies: Boxes,
  requests: FileText,
  stocktake: ClipboardCheck,
  procurement: ShoppingCart,
  reports: BarChart3,
  assistant: Bot,
  admin: Cog,
  sys: PieChart,
}

const PIN_KEY = 'nav-rail-pinned'

export function useVisibleGroups(): MenuGroup[] {
  const user = useAuthStore((s) => s.user)
  return MENU.filter((group) => !group.roles || hasRole(user, group.roles))
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) => !item.hidden && (!item.roles || hasRole(user, item.roles)),
      ),
    }))
    .filter((group) => group.items.length > 0)
}

/** Nhóm đang mở, suy từ đường dẫn hiện tại (khớp dài nhất). */
export function useActiveGroup(): MenuGroup | undefined {
  const groups = useVisibleGroups()
  const { pathname } = useLocation()
  let best: { group: MenuGroup; len: number } | undefined
  for (const group of groups)
    for (const item of group.items) {
      const match = pathname === item.path || pathname.startsWith(`${item.path}/`)
      if (match && (!best || item.path.length > best.len)) best = { group, len: item.path.length }
    }
  return best?.group ?? groups[0]
}

export function NavRail() {
  const { t } = useTranslation('menu')
  const groups = useVisibleGroups()
  const active = useActiveGroup()
  const [pinned, setPinned] = useState(
    () => (typeof localStorage !== 'undefined' && localStorage.getItem(PIN_KEY) === '1') || false,
  )
  const [hovered, setHovered] = useState(false)
  const closeTimer = useRef<number | undefined>(undefined)
  const open = pinned || hovered

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHovered(false)
      if (e.key === '[' && (e.target as HTMLElement)?.tagName !== 'INPUT') setPinned((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem(PIN_KEY, pinned ? '1' : '0')
    } catch {
      /* chế độ riêng tư chặn localStorage — bỏ qua */
    }
  }, [pinned])

  const enter = () => {
    window.clearTimeout(closeTimer.current)
    setHovered(true)
  }
  const leave = () => {
    closeTimer.current = window.setTimeout(() => setHovered(false), 200)
  }

  return (
    <div
      className="sticky top-0 z-30 flex h-dvh shrink-0"
      onMouseEnter={enter}
      onMouseLeave={leave}
      onFocus={enter}
      data-testid="nav-rail"
    >
      <nav
        aria-label="Điều hướng chính"
        className="border-divider bg-card flex w-16 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r py-3"
      >
        {groups.map((group) => {
          const Icon = GROUP_ICON[group.key] ?? LayoutDashboard
          const isActive = active?.key === group.key
          const first = group.items[0]
          if (!first) return null
          return (
            <Tooltip key={group.key}>
              <TooltipTrigger asChild>
                <NavLink
                  to={first.path}
                  data-testid="rail-group"
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'relative flex size-10 items-center justify-center rounded-md transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-primary-soft hover:text-secondary-foreground',
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  <span className="sr-only">{t(group.labelKey.replace('menu:', ''))}</span>
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="right">{t(group.labelKey.replace('menu:', ''))}</TooltipContent>
            </Tooltip>
          )
        })}
        <button
          type="button"
          onClick={() => setPinned((v) => !v)}
          aria-pressed={pinned}
          aria-label={pinned ? 'Thu gọn menu' : 'Ghim menu mở rộng'}
          data-testid="rail-pin"
          className="text-muted-foreground hover:bg-muted mt-auto flex size-10 items-center justify-center rounded-md"
        >
          <PanelLeft
            className={cn('size-5 transition-transform', pinned && 'rotate-180')}
            aria-hidden
          />
        </button>
      </nav>

      {/* Bảng nhãn: rê chuột hoặc ghim đều mở được (§UX quyết định 1). */}
      <div
        className={cn(
          'border-divider bg-card overflow-hidden border-r transition-[width] duration-150',
          open ? 'w-60' : 'w-0',
        )}
        style={{ maxHeight: '100dvh', overflowY: open ? 'auto' : 'hidden' }}
        data-testid="rail-flyout"
        aria-hidden={!open}
      >
        <div className="w-60 py-3">
          {groups.map((group) => (
            <div key={group.key} className="mb-2">
              <p className="text-subtle px-4 pb-1 text-[12px] font-semibold tracking-wide uppercase">
                {t(group.labelKey.replace('menu:', ''))}
              </p>
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    cn(
                      'mx-2 flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13.5px]',
                      isActive
                        ? 'bg-primary-soft text-secondary-foreground font-medium'
                        : 'text-foreground/80 hover:bg-muted',
                    )
                  }
                >
                  {item.icon && <item.icon className="size-4 shrink-0" aria-hidden />}
                  <span className="truncate">{t(item.labelKey.replace('menu:', ''))}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
