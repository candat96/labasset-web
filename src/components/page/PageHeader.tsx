import type { ReactNode } from 'react'

export function PageHeader({
  title,
  description,
  actions,
  badge,
}: {
  title: string
  description?: string
  actions?: ReactNode
  badge?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-[22px] font-semibold leading-7 tracking-[-0.01em]">{title}</h1>
          {badge}
        </div>
        {description && <p className="text-muted-foreground mt-1 text-[13px]">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
