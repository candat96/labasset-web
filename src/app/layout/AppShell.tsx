import { AnnouncementBanner } from '@/components/announcement-banner'
import { Suspense } from 'react'
import { Outlet } from 'react-router'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { Skeleton } from '@/components/ui/skeleton'
import { AppSidebar } from './AppSidebar'
import { Topbar } from './Topbar'
import { NotificationBell } from './NotificationBell'
import { useBootstrapSession, usePublicSettings } from '@/features/auth/hooks'

export function PageSkeleton() {
  return (
    <div className="space-y-3" aria-busy>
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export function AppShell() {
  useBootstrapSession()
  usePublicSettings()
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <Topbar notifications={<NotificationBell />} />
        <AnnouncementBanner />
        <main className="flex-1">
          <div className="w-full px-4 py-4 sm:px-5 sm:py-5">
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
