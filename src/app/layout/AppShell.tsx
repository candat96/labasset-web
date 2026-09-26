import { AnnouncementBanner } from '@/components/announcement-banner'
import { Suspense } from 'react'
import { Outlet } from 'react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { NavRail } from './NavRail'
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
    <div className="flex min-h-dvh">
      <NavRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar notifications={<NotificationBell />} />
        <AnnouncementBanner />
        {/* Vùng nội dung nền xám, thẻ trắng nổi lên — theo Figma Medone. */}
        <main className="bg-surface-2 flex-1">
          <div className="w-full px-4 py-4 sm:px-5 sm:py-5">
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
