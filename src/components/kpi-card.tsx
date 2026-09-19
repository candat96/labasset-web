import type { ReactNode } from 'react'
export function KpiCard({
  title,
  value,
  description,
  icon,
}: {
  title: string
  value: ReactNode
  description?: string
  icon?: ReactNode
}) {
  return (
    <section className="bg-card rounded-lg border p-3">
      <div className="text-muted-foreground flex items-center justify-between gap-2 text-sm">
        <h2>{title}</h2>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      {description && <p className="text-muted-foreground mt-1 text-xs">{description}</p>}
    </section>
  )
}
