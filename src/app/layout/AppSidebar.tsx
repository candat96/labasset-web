import { useTranslation } from 'react-i18next'
import { NavLink, useLocation } from 'react-router'
import { FlaskConical } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
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
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip={hospitalName ?? t('app.name')}>
              <NavLink to="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
                  <FlaskConical className="size-4" aria-hidden />
                </div>
                <div className="grid leading-tight">
                  <span className="truncate text-base font-bold text-white">{t('app.name')}</span>
                  <span className="text-sidebar-foreground/70 truncate text-xs">
                    {hospitalName ?? t('app.tagline')}
                  </span>
                </div>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.key}>
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
      <SidebarRail />
    </Sidebar>
  )
}
