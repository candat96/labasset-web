import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Printer, Search } from 'lucide-react'
import { PageHeader } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { GUIDE, GUIDE_META, type GuideBlock, type GuideSection } from '../guide.vi'

function flatten(sections: GuideSection[]): GuideSection[] {
  return sections.flatMap((s) => [s, ...(s.children ? flatten(s.children) : [])])
}

function blockText(b: GuideBlock): string {
  switch (b.type) {
    case 'p':
    case 'note':
      return b.text
    case 'steps':
    case 'list':
    case 'flow':
      return ('items' in b ? b.items : b.steps).join(' ')
    case 'table':
      return [...b.head, ...b.rows.flat()].join(' ')
  }
}

function Block({ b }: { b: GuideBlock }) {
  switch (b.type) {
    case 'p':
      return <p className="text-[14.5px] leading-7">{b.text}</p>
    case 'steps':
      return (
        <ol className="space-y-2">
          {b.items.map((it, i) => (
            <li key={i} className="flex gap-3 text-[14.5px] leading-7">
              <span className="bg-primary-soft text-primary mt-1 flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold">
                {i + 1}
              </span>
              <span>{it}</span>
            </li>
          ))}
        </ol>
      )
    case 'list':
      return (
        <ul className="ml-5 list-disc space-y-1.5 text-[14.5px] leading-7 marker:text-primary">
          {b.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      )
    case 'note': {
      const tone = b.tone ?? 'info'
      return (
        <div
          className={cn(
            'rounded-lg border-l-4 px-4 py-3 text-[14px] leading-6',
            tone === 'info' && 'bg-info-bg text-info-fg border-primary',
            tone === 'warning' && 'bg-warning-bg text-warning-fg border-warning',
            tone === 'success' && 'bg-success-bg text-success-fg border-success',
          )}
        >
          {b.text}
        </div>
      )
    }
    case 'flow':
      return (
        <div className="flex flex-wrap items-center gap-2 print:gap-1">
          {b.steps.map((st, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="bg-primary-soft text-primary rounded-full px-3 py-1 text-[13px] font-semibold">
                {st}
              </span>
              {i < b.steps.length - 1 && <ArrowRight className="text-subtle size-4" aria-hidden />}
            </div>
          ))}
        </div>
      )
    case 'table':
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="bg-surface-2 text-muted-foreground text-left text-[12px] font-semibold tracking-[0.05em] uppercase">
                {b.head.map((h) => (
                  <th key={h} className="px-3 py-2 first:rounded-l-lg last:rounded-r-lg">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((r, i) => (
                <tr key={i} className="border-divider border-b align-top last:border-0">
                  {r.map((c, j) => (
                    <td key={j} className={cn('px-3 py-2.5 leading-6', j === 0 && 'font-medium')}>
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
  }
}

function Section({ s, depth = 0 }: { s: GuideSection; depth?: number }) {
  return (
    <section id={s.id} className="scroll-mt-20 break-inside-avoid">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {depth === 0 ? (
          <h2 className="text-[20px] leading-7 font-bold tracking-[-0.01em]">{s.title}</h2>
        ) : (
          <h3 className="text-[16px] leading-6 font-semibold">{s.title}</h3>
        )}
        {s.roles?.map((r) => (
          <Badge key={r} variant="neutral">
            {r}
          </Badge>
        ))}
      </div>
      <div className="space-y-4">
        {s.blocks.map((b, i) => (
          <Block key={i} b={b} />
        ))}
      </div>
      {s.children && (
        <div className="mt-6 space-y-8 border-l-2 border-divider pl-5">
          {s.children.map((c) => (
            <Section key={c.id} s={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </section>
  )
}

export function Component() {
  const [q, setQ] = useState('')
  const [active, setActive] = useState<string>(GUIDE[0]?.id ?? '')
  const all = useMemo(() => flatten(GUIDE), [])
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return GUIDE
    const match = (s: GuideSection): boolean =>
      s.title.toLowerCase().includes(term) ||
      s.blocks.some((b) => blockText(b).toLowerCase().includes(term)) ||
      (s.children?.some(match) ?? false)
    return GUIDE.filter(match)
  }, [q])

  // Đánh dấu mục đang đọc trong mục lục.
  useEffect(() => {
    const els = all.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[]
    if (els.length === 0) return
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { rootMargin: '-72px 0px -70% 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [all, filtered])

  return (
    <>
      <PageHeader
        eyebrow={`${GUIDE_META.product} · phiên bản ${GUIDE_META.version} · cập nhật ${GUIDE_META.updated}`}
        title="Hướng dẫn sử dụng"
        description={`${GUIDE_META.tagline}. Tài liệu dành cho quản trị viện, phòng Vật tư – TBYT và các khoa.`}
        actions={
          <Button variant="outline" onClick={() => window.print()}>
            <Printer aria-hidden /> In / Lưu PDF
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] print:block">
        <aside className="print:hidden lg:sticky lg:top-[72px] lg:self-start">
          <div className="relative mb-3">
            <Search
              className="text-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
              aria-hidden
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm trong hướng dẫn…"
              className="pl-9"
              aria-label="Tìm trong hướng dẫn"
            />
          </div>
          <nav aria-label="Mục lục" className="max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
            <ul className="space-y-0.5">
              {filtered.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    className={cn(
                      'block rounded-md px-2.5 py-1.5 text-[13.5px] font-medium transition-colors',
                      active === s.id || s.children?.some((c) => c.id === active)
                        ? 'bg-primary-soft text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {s.title}
                  </a>
                  {s.children && (
                    <ul className="mt-0.5 mb-1 ml-3 space-y-0.5 border-l border-divider pl-2">
                      {s.children.map((c) => (
                        <li key={c.id}>
                          <a
                            href={`#${c.id}`}
                            className={cn(
                              'block rounded-md px-2 py-1 text-[13px]',
                              active === c.id
                                ? 'text-primary font-medium'
                                : 'text-muted-foreground hover:text-foreground',
                            )}
                          >
                            {c.title.replace(/^\d+\.\d+\s/, '')}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <SectionCard className="print:shadow-none" bodyClassName="px-8 py-7 print:px-0">
          <div className="hidden print:mb-6 print:block">
            <p className="text-[12px] tracking-[0.06em] text-muted-foreground uppercase">
              {GUIDE_META.product} · {GUIDE_META.tagline}
            </p>
            <h1 className="text-[26px] font-bold">Hướng dẫn sử dụng</h1>
            <p className="text-muted-foreground text-[13px]">
              Phiên bản {GUIDE_META.version} · Cập nhật {GUIDE_META.updated}
            </p>
          </div>
          <div className="max-w-3xl space-y-12">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground">Không tìm thấy mục nào khớp "{q}".</p>
            ) : (
              filtered.map((s) => <Section key={s.id} s={s} />)
            )}
          </div>
        </SectionCard>
      </div>
    </>
  )
}
