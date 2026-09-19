import { useSearchParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { AsyncSelect } from '@/components/form/async-select'
import { PageHeader } from '@/components/page/PageHeader'
import { ErrorState } from '@/components/page/ErrorState'
import { compareEquipment, listEquipment } from '../api'
import { cn } from '@/lib/utils'

export function Component() {
  const [sp, setSp] = useSearchParams()
  const ids = (sp.get('ids') ?? '').split(',').filter(Boolean)
  const a = ids[0] ?? ''
  const b = ids[1] ?? ''
  const compare = useQuery({
    queryKey: ['equipment', 'compare', a, b],
    queryFn: () => compareEquipment(`${a},${b}`),
    enabled: ids.length === 2,
  })
  const setId = (index: 0 | 1, id: string | null) => {
    const next = [...ids]
    next[index] = id ?? ''
    setSp({ ids: next.filter(Boolean).join(',') })
  }
  const load = async (q: string) => {
    const page = await listEquipment({ q, page: 1, limit: 20 })
    return page.items.map((row) => ({ id: row.id, code: row.code, name: row.name }))
  }
  return (
    <>
      <PageHeader title="So sánh máy" />
      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        <AsyncSelect
          label="Máy 1"
          queryKey="eq-a"
          loadOptions={load}
          value={a || null}
          onChange={(v) => setId(0, typeof v === 'string' ? v : null)}
        />
        <AsyncSelect
          label="Máy 2"
          queryKey="eq-b"
          loadOptions={load}
          value={b || null}
          onChange={(v) => setId(1, typeof v === 'string' ? v : null)}
        />
      </div>
      {ids.length !== 2 && <p className="text-muted-foreground">Chọn đúng hai máy.</p>}
      {compare.isPending && ids.length === 2 && <p role="status">Đang so sánh…</p>}
      {compare.error && <ErrorState error={compare.error} onRetry={() => void compare.refetch()} />}
      {compare.data && (
        <div className="grid gap-4 sm:grid-cols-2">
          {compare.data.items.map((item) => (
            <section key={item.id} className="rounded border p-3 text-sm">
              <h2 className="font-medium">
                {item.code} · {item.name}
              </h2>
              {(['model', 'serial', 'status', 'location'] as const).map((key) => (
                <p
                  key={key}
                  className={cn(compare.data.diff.includes(key) && 'bg-warning/15 rounded px-1')}
                >
                  {key}: {String(item[key] ?? '—')}
                </p>
              ))}
            </section>
          ))}
        </div>
      )}
    </>
  )
}
