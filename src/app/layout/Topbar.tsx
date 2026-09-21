import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Breadcrumbs } from './Breadcrumbs'
import { GlobalSearch } from './GlobalSearch'
import { UserMenu } from './UserMenu'
import { cn } from '@/lib/utils'

export function Topbar({ notifications }: { notifications?: ReactNode }) {
  // Header nền --background, không viền — chỉ có bóng khi cuộn (handoff 10 §5).
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <header
      className={cn(
        'bg-background sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 px-3 transition-shadow',
        scrolled && 'shadow-[0_1px_2px_rgb(15_23_42/0.06),0_2px_6px_rgb(15_23_42/0.08)]',
      )}
    >
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-1 h-5!" />
      <div className="min-w-0 flex-1 text-[13px]">
        <Breadcrumbs />
      </div>
      <GlobalSearch />
      {notifications}
      <UserMenu />
    </header>
  )
}
