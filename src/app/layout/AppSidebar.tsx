import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, useLocation, useNavigate } from 'react-router'
import { Search, X } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { MENU, findMenuItem, type MenuGroup } from '@/routes/menu'
import { hasRole, useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

function visibleGroups(user: ReturnType<typeof useAuthStore.getState>['user']): MenuGroup[] {
  const can = (roles?: readonly string[]) => !roles || hasRole(user, roles)
  return MENU.filter((g) => can(g.roles))
    .map((g) => ({ ...g, items: g.items.filter((i) => !i.hidden && can(i.roles)) }))
    .filter((g) => g.items.length > 0)
}

/** Bỏ dấu tiếng Việt để tìm menu không cần gõ dấu. */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

export function AppSidebar() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const hospitalName = useUiStore((s) => s.hospitalName)
  const { pathname } = useLocation()
  const active = findMenuItem(pathname)?.item.path
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const allGroups = visibleGroups(user)
  const groups = useMemo(() => {
    const term = fold(q.trim())
    if (!term) return allGroups
    return allGroups
      .map((g) => ({
        ...g,
        items: g.items.filter(
          (i) => fold(t(i.labelKey)).includes(term) || fold(t(g.labelKey)).includes(term),
        ),
      }))
      .filter((g) => g.items.length > 0)
  }, [allGroups, q, t])
  const first = groups[0]?.items[0]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 pt-4 pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="lg"
              tooltip={hospitalName ?? t('app.name')}
              className="hover:bg-transparent data-[active=true]:bg-transparent"
            >
              <NavLink to="/" className="gap-3">
                <img
                  src="/brand/logo-64.png?v=2"
                  alt=""
                  aria-hidden
                  className="size-9 shrink-0 rounded-lg bg-white p-0.5 shadow-[0_2px_8px_rgb(0_0_0/0.25)]"
                />
                <div className="grid min-w-0 leading-tight">
                  <span className="truncate text-[15px] font-bold tracking-[-0.01em] text-white">
                    {t('app.name')}
                  </span>
                  <span className="text-sidebar-foreground/70 truncate text-[11.5px]">
                    {hospitalName ?? t('app.tagline')}
                  </span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="relative mt-1 group-data-[collapsible=icon]:hidden">
          <Search
            className="text-sidebar-foreground/50 pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
            aria-hidden
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && first) {
                navigate(first.path)
                setQ('')
              }
              if (e.key === 'Escape') setQ('')
            }}
            placeholder={t('menu:searchPlaceholder', { defaultValue: 'Tìm chức năng…' })}
            aria-label={t('menu:searchPlaceholder', { defaultValue: 'Tìm chức năng…' })}
            className="h-8 w-full rounded-md bg-white/6 pr-7 pl-8 text-[13px] text-white placeholder:text-sidebar-foreground/50 outline-none ring-sidebar-ring/60 focus:bg-white/10 focus:ring-2"
            data-testid="sidebar-search"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ('')}
              aria-label="Xoá"
              className="text-sidebar-foreground/60 absolute top-1/2 right-2 -translate-y-1/2 hover:text-white"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-0 px-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10">
        {q && groups.length === 0 && (
          <p className="text-sidebar-foreground/60 px-3 py-4 text-[13px]">
            {t('menu:searchEmpty', { defaultValue: 'Không có chức năng nào khớp' })}
          </p>
        )}
        {groups.map((g) => (
          <SidebarGroup key={g.key} className="py-1.5">
            <SidebarGroupLabel>{t(g.labelKey)}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const label = t(item.labelKey)
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild isActive={active === item.path} tooltip={label}>
                        <NavLink to={item.path} end={item.path === '/'}>
                          {item.icon && <item.icon aria-hidden />}
                          <span>{label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="px-3 py-3">
        <div className="text-sidebar-foreground/45 group-data-[collapsible=icon]:hidden flex items-center justify-between text-[11px]">
          <span>{t('app.name')} v1.0</span>
          <span className="bg-success/20 text-success-fg dark:text-success rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
            online
          </span>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
