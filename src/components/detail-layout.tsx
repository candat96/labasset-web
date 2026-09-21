import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { PageHeader } from '@/components/page/PageHeader'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
export function DetailLayout({
  code,
  name,
  badge,
  actions,
  information,
  tabs,
}: {
  code: string
  name: string
  badge?: ReactNode
  actions?: ReactNode
  information: ReactNode
  tabs: { value: string; label: string; content: ReactNode }[]
}) {
  const [params, setParams] = useSearchParams()
  const current = tabs.some((t) => t.value === params.get('tab'))
    ? params.get('tab')!
    : tabs[0]?.value
  return (
    <>
      <PageHeader title={name} description={code} badge={badge} actions={actions} />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="bg-card rounded-xl p-4 shadow-[var(--shadow-card)] border-0 dark:border dark:border-border lg:self-start">
          {information}
        </aside>
        <Tabs
          value={current}
          onValueChange={(tab) =>
            setParams((prev) => {
              const next = new URLSearchParams(prev)
              next.set('tab', tab)
              return next
            })
          }
        >
          <TabsList variant="line" className="max-w-full overflow-x-auto">
            {tabs.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((t) => (
            <TabsContent key={t.value} value={t.value}>
              {t.content}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </>
  )
}
