import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Breadcrumbs } from './Breadcrumbs'
import { SectionTabs } from './SectionTabs'
import { Brand } from './Brand'
import { GlobalSearch } from './GlobalSearch'
import { UserMenu } from './UserMenu'
import { AiButton } from './AiButton'
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
        'bg-card border-divider sticky top-0 z-20 flex h-[68px] shrink-0 items-center gap-3 border-b px-4 transition-shadow',
        scrolled && 'shadow-[0_1px_2px_rgb(15_23_42/0.06),0_2px_6px_rgb(15_23_42/0.08)]',
      )}
    >
      <Brand />
      {/* Tab nhóm căn giữa như Figma; màn hẹp thì thay bằng breadcrumb. */}
      <div className="flex min-w-0 flex-1 items-center justify-center gap-3">
        <SectionTabs />
        <div className="w-full text-[13px] lg:hidden">
          <Breadcrumbs />
        </div>
      </div>
      <GlobalSearch />
      {notifications}
      <AiButton />
      <UserMenu />
    </header>
  )
}
