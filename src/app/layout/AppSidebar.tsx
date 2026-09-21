import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router'
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

export function AppSidebar() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)
  const hospitalName = useUiStore((s) => s.hospitalName)
  const { pathname } = useLocation()
  const active = findMenuItem(pathname)?.item.path
  const groups = visibleGroups(user)

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
                  src="/brand/logo-64.png"
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
      </SidebarHeader>
      <SidebarContent className="gap-0 px-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10">
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
