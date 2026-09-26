import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { PageHeader } from '@/components/page/PageHeader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

/**
 * Bố cục màn chi tiết: PageHeader (eyebrow = loại đối tượng, title = tên, badge, meta,
 * actions) + cột phải "information" (card dính khi cuộn) + tabs underline bên trái.
 */
export function DetailLayout({
  code,
  name,
  badge,
  actions,
  information,
  tabs,
  meta,
  eyebrow,
  asideWidth = 300,
  aliases,
}: {
  code: string
  name: string
  badge?: ReactNode
  actions?: ReactNode
  information: ReactNode
  tabs: { value: string; label: string; content: ReactNode; count?: number }[]
  meta?: ReactNode
  eyebrow?: string
  asideWidth?: number
  /** Giá trị `?tab=` cũ → tab mới (giữ link/bookmark khi gộp tab). */
  aliases?: Record<string, string>
}) {
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab') ?? ''
  const resolved = aliases?.[requested] ?? requested
  const current = tabs.some((t) => t.value === resolved) ? resolved : tabs[0]?.value
  return (
    <>
      <PageHeader
        title={name}
        eyebrow={eyebrow ?? code}
        badge={badge}
        actions={actions}
        meta={meta}
      />
      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: `minmax(0,1fr) ${asideWidth}px` } as never}
        data-detail-grid
      >
        <Tabs
          value={current}
          className="min-w-0"
          onValueChange={(tab) =>
            setParams((prev) => {
              const next = new URLSearchParams(prev)
              next.set('tab', tab)
              return next
            })
          }
        >
          <TabsList
            className="bg-surface-2 mb-4 flex h-auto w-full flex-wrap justify-start gap-1 rounded-md p-1"
            data-slot="detail-tabs"
          >
            {tabs.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="h-8 flex-none gap-1.5 rounded-md px-3 text-[13px] font-medium after:hidden data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-[0_1px_2px_rgb(16_24_40/0.08),0_0_0_1px_rgb(16_24_40/0.06)]"
              >
                {t.label}
                {typeof t.count === 'number' && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 text-[12px] leading-4 font-semibold tabular-nums',
                      'bg-muted text-muted-foreground',
                    )}
                  >
                    {t.count}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((t) => (
            <TabsContent key={t.value} value={t.value} className="space-y-4">
              {t.content}
            </TabsContent>
          ))}
        </Tabs>
        <aside className="bg-card shadow-card rounded-md p-5 lg:sticky lg:top-[72px] lg:self-start">
          {information}
        </aside>
      </div>
      <style>{`@media (max-width: 1023px){[data-detail-grid]{grid-template-columns:minmax(0,1fr)!important}}`}</style>
    </>
  )
}
