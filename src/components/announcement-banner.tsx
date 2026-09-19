import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { api, unwrap } from '@/api/client'
import { Button } from './ui/button'
export function AnnouncementBanner() {
  const [dismissed, setDismissed] = useState<string[]>(() => {
    try {
      const data: unknown = JSON.parse(
        localStorage.getItem('labasset.dismissedAnnouncements') ?? '[]',
      )
      return Array.isArray(data) ? data.filter((id): id is string => typeof id === 'string') : []
    } catch {
      return []
    }
  })
  const list = useQuery({
    queryKey: ['announcements', 'active'],
    queryFn: () => unwrap(api.GET('/v1/announcements/active')),
    refetchInterval: 60000,
  })
  return (
    <div>
      {list.data
        ?.filter((a) => !dismissed.includes(a.id))
        .map((a) => (
          <section
            role="status"
            key={a.id}
            className={
              a.level === 'warning'
                ? 'border-b bg-amber-100 px-4 py-3 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                : 'border-b bg-sky-100 px-4 py-3 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{a.title}</h2>
                <p className="whitespace-pre-wrap">{a.body}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Đóng ${a.title}`}
                onClick={() => {
                  const next = [...dismissed, a.id]
                  setDismissed(next)
                  localStorage.setItem('labasset.dismissedAnnouncements', JSON.stringify(next))
                }}
              >
                <X aria-hidden />
              </Button>
            </div>
          </section>
        ))}
    </div>
  )
}
