import type { LucideIcon } from 'lucide-react'
import { Inbox } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex max-h-80 flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <div className="bg-muted flex size-14 items-center justify-center rounded-full">
        <Icon className="text-muted-foreground size-7" strokeWidth={1.5} aria-hidden />
      </div>
      <h2 className="mt-1 text-[15px] font-semibold">{title}</h2>
      {description && <p className="text-muted-foreground max-w-md text-[13px]">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
