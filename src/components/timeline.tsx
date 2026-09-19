import { formatDateTime } from '@/lib/format/date'
export interface TimelineEvent {
  at: string
  title: string
  summary?: string | null
  by?: string | null
}
export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <ol aria-label="Dòng thời gian" className="space-y-4 border-l pl-4">
      {[...events]
        .sort((a, b) => b.at.localeCompare(a.at))
        .map((e, i) => (
          <li key={`${e.at}-${i}`}>
            <div className="font-medium">{e.title}</div>
            <p className="text-muted-foreground text-xs">
              <time dateTime={e.at}>{formatDateTime(e.at)}</time>
              {e.by && ` · ${e.by}`}
            </p>
            {e.summary && <p className="mt-1 whitespace-pre-wrap">{e.summary}</p>}
          </li>
        ))}
      {events.length === 0 && <li className="text-muted-foreground">Chưa có sự kiện</li>}
    </ol>
  )
}
