import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  ClipboardCheck,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { api, unwrap } from '@/api/client'
import type { components } from '@/api/schema'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotifications } from '@/features/notifications/hooks'
import { notificationLink } from '@/lib/notification-link'
import { formatRelative } from '@/lib/format/date'

type MyTasks = components['schemas']['MyTasksResponseDto']

/** Việc cần làm hôm nay — mỗi dòng mở thẳng danh sách đã lọc (§UX quyết định 3). */
const ROWS: {
  key: string
  label: string
  to: string
  icon: LucideIcon
  tone: 'danger' | 'warning' | 'info' | 'success'
  pick: (t: MyTasks) => number
}[] = [
  {
    key: 'repairsOverdue',
    label: 'Sửa chữa quá hạn',
    to: '/repairs?assigneeId=me&overdue=true',
    icon: AlertTriangle,
    tone: 'danger',
    pick: (t) => t.repairs?.overdue ?? 0,
  },
  {
    key: 'repairsAssigned',
    label: 'Sửa chữa được giao',
    to: '/repairs?assigneeId=me',
    icon: Wrench,
    tone: 'info',
    pick: (t) => t.repairs?.assigned ?? 0,
  },
  {
    key: 'maintenanceDue',
    label: 'Bảo dưỡng đến hạn',
    to: '/maintenance/tasks?assigneeId=me',
    icon: CalendarClock,
    tone: 'success',
    pick: (t) => t.maintenance?.due7d ?? 0,
  },
  {
    key: 'maintenanceOverdue',
    label: 'Bảo dưỡng quá hạn',
    to: '/maintenance/tasks?assigneeId=me&status=overdue',
    icon: CalendarClock,
    tone: 'warning',
    pick: (t) => t.maintenance?.overdue ?? 0,
  },
  {
    key: 'stocktakes',
    label: 'Kiểm kê đang mở',
    to: '/stocktakes?status=counting',
    icon: ClipboardCheck,
    tone: 'info',
    pick: (t) => t.stocktakes?.counting ?? 0,
  },
]

const TONE_ROW: Record<string, string> = {
  danger: 'bg-destructive-bg text-destructive-fg',
  warning: 'bg-warning-bg text-warning-fg',
  info: 'bg-primary-soft text-secondary-foreground',
  success: 'bg-success-bg text-success-fg',
}

export function WorkQueue() {
  const tasks = useQuery({
    queryKey: ['me-tasks'],
    queryFn: () => unwrap(api.GET('/v1/me/tasks')) as Promise<MyTasks>,
  })
  const notes = useNotifications({ page: 1, limit: 5 })
  const rows = tasks.data ? ROWS.map((r) => ({ ...r, value: r.pick(tasks.data) })) : []
  const pending = rows.filter((r) => r.value > 0)

  return (
    <div className="flex flex-col gap-5">
      <section className="bg-card shadow-card rounded-xl p-4" aria-labelledby="work-today">
        <h2 id="work-today" className="mb-3 text-[15px] font-semibold">
          Công việc hôm nay
        </h2>
        {tasks.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : pending.length === 0 ? (
          <p className="text-muted-foreground text-[13.5px]">
            Không có việc nào cần xử lý hôm nay.
          </p>
        ) : (
          <ul className="space-y-2">
            {pending.map((row) => {
              const Icon = row.icon
              return (
                <li key={row.key}>
                  <Link
                    to={row.to}
                    data-testid="work-row"
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-opacity hover:opacity-85 ${TONE_ROW[row.tone]}`}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{row.label}</span>
                    <span className="bg-card/70 min-w-6 rounded-full px-1.5 text-center text-[12.5px] font-semibold tabular-nums">
                      {row.value}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="bg-card shadow-card rounded-xl p-4" aria-labelledby="my-notifications">
        <div className="mb-3 flex items-center gap-2">
          <h2 id="my-notifications" className="text-[15px] font-semibold">
            Thông báo của tôi
          </h2>
          {(notes.data?.unreadCount ?? 0) > 0 && (
            <span className="bg-primary-soft text-secondary-foreground rounded-full px-2 text-[12px] font-semibold tabular-nums">
              {notes.data?.unreadCount}
            </span>
          )}
        </div>
        {notes.isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : notes.data?.items.length ? (
          <ul className="space-y-1.5">
            {notes.data.items.map((n) => {
              const to = notificationLink(n.data as Record<string, string> | null, n.type)
              const body = (
                <>
                  <Bell className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium">{n.title}</span>
                    <span className="text-muted-foreground block truncate text-[12.5px]">
                      {formatRelative(n.createdAt)}
                    </span>
                  </span>
                  {!n.readAt && (
                    <span
                      className="bg-destructive mt-2 size-2 shrink-0 rounded-full"
                      aria-label="Chưa đọc"
                    />
                  )}
                </>
              )
              return (
                <li key={n.id}>
                  {to ? (
                    <Link
                      to={to}
                      className="hover:bg-surface-2 flex gap-2 rounded-lg px-2 py-2 transition-colors"
                    >
                      {body}
                    </Link>
                  ) : (
                    <span className="flex gap-2 px-2 py-2">{body}</span>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-muted-foreground text-[13.5px]">Chưa có thông báo nào.</p>
        )}
        <Link
          to="/notifications"
          className="text-primary mt-3 block rounded-lg border border-current/25 py-1.5 text-center text-[13.5px] font-medium hover:bg-primary-soft"
        >
          Xem tất cả
        </Link>
      </section>
    </div>
  )
}
