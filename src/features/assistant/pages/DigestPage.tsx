import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/page/PageHeader'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getWeeklyDigest } from '../api'

function startOfIsoWeek(date = new Date()) {
  const copy = new Date(date)
  const day = copy.getDay() || 7
  copy.setDate(copy.getDate() - day + 1)
  return copy.toISOString().slice(0, 10)
}

export function Component() {
  const [weekStart, setWeekStart] = useState(startOfIsoWeek())
  const digest = useQuery({
    queryKey: ['ai-digest', weekStart],
    queryFn: () => getWeeklyDigest(weekStart),
  })
  const stats = useMemo(() => digest.data?.stats ?? {}, [digest.data])
  return (
    <>
      <PageHeader title="Tóm tắt tuần" />
      <div className="mb-4 max-w-xs space-y-1">
        <Label htmlFor="week-start">Tuần bắt đầu</Label>
        <Input
          id="week-start"
          type="date"
          value={weekStart}
          onChange={(event) => setWeekStart(event.target.value)}
        />
      </div>
      {digest.isPending && <p role="status">Đang tải tóm tắt…</p>}
      {digest.error && <p role="alert">Chưa có tóm tắt tuần này.</p>}
      {digest.data && (
        <>
          <ul className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5 text-sm">
            {Object.entries(stats).map(([key, value]) => (
              <li key={key} className="rounded border p-3">
                <div className="text-muted-foreground">{key}</div>
                <div className="font-medium">{String(value)}</div>
              </li>
            ))}
          </ul>
          {digest.data.content ? (
            <pre className="bg-muted overflow-auto rounded p-3 whitespace-pre-wrap text-sm">
              {digest.data.content}
            </pre>
          ) : (
            <p className="text-muted-foreground text-sm">Chưa cấu hình AI.</p>
          )}
        </>
      )}
    </>
  )
}
