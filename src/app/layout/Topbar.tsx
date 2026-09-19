import type { ReactNode } from 'react'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Breadcrumbs } from './Breadcrumbs'
import { GlobalSearch } from './GlobalSearch'
import { UserMenu } from './UserMenu'

export function Topbar({ notifications }: { notifications?: ReactNode }) {
  return (
    <header className="bg-card sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b px-3">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-1 h-5!" />
      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>
      <GlobalSearch />
      {notifications}
      <UserMenu />
    </header>
  )
}
