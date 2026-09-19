import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { addMonths, format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ErrorState } from '@/components/page/ErrorState'
import { messageFor } from '@/api/errors'
import { listCalendar, moveCalendar } from '../api'
import type { CalendarItem } from '../types'

const TYPE_CLASS: Record<string, string> = {
  maintenance: 'bg-sky-100 text-sky-800',
  calibration: 'bg-violet-100 text-violet-800',
  repair: 'bg-red-100 text-red-800',
}

const hrefFor = (item: CalendarItem) =>
  item.type === 'maintenance'
    ? `/maintenance/tasks/${item.id}`
    : item.type === 'calibration'
      ? `/calibrations/${item.id}`
      : `/repairs/${item.id}`

export function Component() {
  const navigate = useNavigate()
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [types, setTypes] = useState(['maintenance', 'calibration', 'repair'])
  const [mine, setMine] = useState(false)
  const from = startOfMonth(month).toISOString()
  const to = endOfMonth(month).toISOString()
  const list = useQuery({
    queryKey: ['calendar', from, to, types, mine],
    queryFn: () =>
      listCalendar({
        from,
        to,
        types: types.join(','),
        assigneeId: mine ? 'me' : undefined,
      }),
  })
  const days = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>()
    for (const item of list.data?.items ?? []) {
      const key = (item.start ?? '').slice(0, 10)
      map.set(key, [...(map.get(key) ?? []), item])
    }
    return map
  }, [list.data])
  const toggle = (type: string, on: boolean) =>
    setTypes((curr) => (on ? [...curr, type] : curr.filter((item) => item !== type)))
  return (
    <>
      <PageHeader
        title="Lịch"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setMonth((d) => addMonths(d, -1))}>
              Tháng trước
            </Button>
            <Button variant="outline" onClick={() => setMonth(startOfMonth(new Date()))}>
              {format(month, 'MM/yyyy')}
            </Button>
            <Button variant="outline" onClick={() => setMonth((d) => addMonths(d, 1))}>
              Tháng sau
            </Button>
          </div>
        }
      />
      <div className="mb-3 flex flex-wrap gap-4 text-sm">
        {(['maintenance', 'calibration', 'repair'] as const).map((type) => (
          <label key={type} className="flex items-center gap-2">
            <Checkbox
              checked={types.includes(type)}
              onCheckedChange={(v) => toggle(type, v === true)}
            />
            {type === 'maintenance'
              ? 'Bảo dưỡng'
              : type === 'calibration'
                ? 'Kiểm định'
                : 'Sửa chữa'}
          </label>
        ))}
        <label className="flex items-center gap-2">
          <Checkbox checked={mine} onCheckedChange={(v) => setMine(v === true)} />
          Của tôi
        </label>
      </div>
      {list.error && <ErrorState error={list.error} onRetry={() => void list.refetch()} />}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day) => {
          const key = format(day, 'yyyy-MM-dd')
          return (
            <section key={key} className="min-h-28 rounded border p-2">
              <h2 className="text-muted-foreground mb-1 text-xs">{format(day, 'dd/MM')}</h2>
              <ul className="space-y-1">
                {(byDay.get(key) ?? []).map((item) => (
                  <li key={`${item.type}-${item.id}`}>
                    <button
                      type="button"
                      className={`w-full truncate rounded px-1 py-0.5 text-left text-xs ${TYPE_CLASS[item.type] ?? ''}`}
                      title={`${item.title} · ${item.status} · ${item.assigneeName ?? ''}`}
                      onClick={() => navigate(hrefFor(item))}
                      onKeyDown={async (event) => {
                        if (event.key !== 'Enter' || !item.movable) return
                      }}
                    >
                      {item.title}
                    </button>
                    {item.movable && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-1 text-[10px]"
                        onClick={async () => {
                          try {
                            await moveCalendar(
                              item.type,
                              item.id,
                              new Date(day.setHours(9, 0, 0, 0)).toISOString(),
                            )
                            void list.refetch()
                          } catch (error) {
                            alert(messageFor(error))
                          }
                        }}
                      >
                        Đổi ngày
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </>
  )
}
