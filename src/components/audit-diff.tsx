import { changedKeys, isRecord } from '@/lib/audit-entity'
import { cn } from '@/lib/utils'

function pretty(value: unknown) {
  if (value === undefined) return '—'
  return JSON.stringify(value, null, 2)
}

function Pane({ title, value, changed }: { title: string; value: unknown; changed: Set<string> }) {
  const record = isRecord(value)
  return (
    <section className="min-w-0">
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      {record ? (
        <div className="space-y-1">
          {Object.keys(value).length === 0 && (
            <p className="text-muted-foreground text-xs">Không có dữ liệu</p>
          )}
          {Object.entries(value).map(([key, item]) => (
            <div
              key={key}
              data-changed={changed.has(key) || undefined}
              className={cn(
                'rounded px-2 py-1 font-mono text-xs',
                changed.has(key) && 'bg-warning/15 ring-warning/40 ring-1',
              )}
            >
              <div className="font-medium">{key}</div>
              <pre className="overflow-auto whitespace-pre-wrap">{pretty(item)}</pre>
            </div>
          ))}
        </div>
      ) : (
        <pre
          data-changed={changed.size > 0 || undefined}
          className={cn(
            'overflow-auto rounded px-2 py-1 font-mono text-xs',
            changed.size > 0 && 'bg-warning/15 ring-warning/40 ring-1',
          )}
        >
          {pretty(value)}
        </pre>
      )}
    </section>
  )
}

export function AuditDiff({ before, after }: { before: unknown; after: unknown }) {
  const changed = changedKeys(before, after)
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Pane title="Trước" value={before} changed={changed} />
      <Pane title="Sau" value={after} changed={changed} />
    </div>
  )
}
