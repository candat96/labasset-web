import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { FlaskConical, LogOut } from 'lucide-react'
import { Suspense } from 'react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { PageSkeleton } from './AppShell'
import { useTranslation } from 'react-i18next'
import { SYS_ITEMS } from '@/routes/menu'
import { useSysAuthStore } from '@/stores/sys-auth.store'

export function SysShell() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const user = useSysAuthStore((s) => s.user)
  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="lg" tooltip="MedOne Hệ thống">
                <NavLink to="/sys/hospitals">
                  <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
                    <FlaskConical className="size-4" aria-hidden />
                  </div>
                  <div className="grid leading-tight">
                    <span className="truncate font-semibold">MedOne</span>
                    <span className="text-muted-foreground truncate text-xs">Hệ thống</span>
                  </div>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Hệ thống</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {SYS_ITEMS.map((item) => {
                  const label = t(item.labelKey)
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname.startsWith(item.path)}
                        tooltip={label}
                      >
                        <NavLink to={item.path}>
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
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="bg-card sticky top-0 z-20 flex h-14 items-center gap-2 border-b px-3">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-1 h-5!" />
          <div className="min-w-0 flex-1 text-sm">{user?.fullName ?? user?.username}</div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              useSysAuthStore.getState().logout()
              navigate('/sys/login', { replace: true })
            }}
          >
            <LogOut aria-hidden />
            Đăng xuất
          </Button>
        </header>
        <main className="flex-1 p-4 lg:p-6">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
