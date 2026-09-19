import { useState } from 'react'
import { notificationLink } from '@/lib/notification-link'
import { Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { formatRelative } from '@/lib/format/date'
import { cn } from '@/lib/utils'
import {
  useMarkAllRead,
  useMarkRead,
  useNotificationStream,
  useNotifications,
} from '@/features/notifications/hooks'
import type { Notification } from '@/features/notifications/api'

export function NotificationBell() {
  const { t } = useTranslation()
  const { t: tn } = useTranslation('notifications')
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  useNotificationStream()
  const list = useNotifications({ page: 1, limit: 8 })
  const markRead = useMarkRead()
  const markAll = useMarkAllRead()
  const unread = list.data?.unreadCount ?? 0

  const openItem = (n: Notification) => {
    if (!n.readAt) markRead.mutate(n.id)
    setOpen(false)
    const path = notificationLink(n.data)
    if (path) navigate(path)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`${tn('title')}${unread ? ` (${unread} ${tn('unread').toLowerCase()})` : ''}`}
        >
          <Bell className="size-4" aria-hidden />
          {unread > 0 && (
            <span
              data-testid="unread-badge"
              className="bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 min-w-4 rounded-full px-1 text-center text-[10px] leading-4 font-semibold"
            >
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="font-medium">{tn('title')}</div>
          <Button
            variant="ghost"
            size="sm"
            disabled={unread === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            {t('actions.markAllRead')}
          </Button>
        </div>
        <Separator />
        <ul className="max-h-96 divide-y overflow-auto">
          {list.data?.items.length ? (
            list.data.items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={cn(
                    'hover:bg-accent w-full px-3 py-2 text-left',
                    !n.readAt && 'bg-primary/5',
                  )}
                  onClick={() => openItem(n)}
                >
                  <div className={cn('truncate text-sm', !n.readAt && 'font-semibold')}>
                    {n.title}
                  </div>
                  <div className="text-muted-foreground line-clamp-2 text-xs">{n.body}</div>
                  <div className="text-muted-foreground mt-0.5 text-[11px]">
                    {formatRelative(n.createdAt)}
                  </div>
                </button>
              </li>
            ))
          ) : (
            <li className="text-muted-foreground px-3 py-6 text-center text-sm">{tn('empty')}</li>
          )}
        </ul>
        <Separator />
        <div className="px-3 py-2 text-center text-sm">
          <Link to="/notifications" className="text-primary hover:underline">
            {t('actions.viewAll')}
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  )
}
