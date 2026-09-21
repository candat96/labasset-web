import { Link } from 'react-router'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NOTIFICATION_TYPES } from '../types'
import { notificationLink } from '@/lib/notification-link'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar, FilterField } from '@/components/filter-bar'
import { PageHeader } from '@/components/page/PageHeader'
import { StatusBadge } from '@/components/page/StatusBadge'
import { formatDateTime } from '@/lib/format/date'
import { cn } from '@/lib/utils'
import type { Notification } from '../api'
import { useMarkAllRead, useMarkRead, useNotifications } from '../hooks'

export function Component() {
  const { t } = useTranslation('notifications')
  const { t: tc } = useTranslation()
  const navigate = useNavigate()
  const table = useServerTable({ filterKeys: ['unread', 'type'] })
  const onlyUnread = table.params.filters.unread === 'true'
  const list = useNotifications({
    page: table.params.page,
    limit: table.params.limit,
    type: table.params.filters.type,
    ...(onlyUnread ? { unread: true } : {}),
  })
  const markRead = useMarkRead()
  const markAll = useMarkAllRead()

  const columns = useMemo<ColumnDef<Notification>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: t('time'),
        meta: { label: t('time'), className: 'w-40 whitespace-nowrap' },
        cell: ({ getValue }) => formatDateTime(getValue<string>()),
      },
      {
        accessorKey: 'title',
        header: t('titleCol'),
        meta: { label: t('titleCol') },
        cell: ({ row }) => (
          <span className={cn(!row.original.readAt && 'font-semibold')}>{row.original.title}</span>
        ),
      },
      {
        accessorKey: 'body',
        header: t('body'),
        meta: { label: t('body') },
        cell: ({ getValue }) => (
          <span className="line-clamp-2 max-w-xl text-pretty">{getValue<string>()}</span>
        ),
      },
      {
        id: 'status',
        header: t('status'),
        meta: { label: t('status'), className: 'w-28' },
        cell: ({ row }) =>
          row.original.readAt ? (
            <StatusBadge status="muted" label={t('read')} />
          ) : (
            <StatusBadge status="info" label={t('unread')} />
          ),
      },
    ],
    [t],
  )

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('desc')}
        actions={
          <>
            {' '}
            <Button variant="outline" asChild>
              <Link to="/notifications/preferences">Tuỳ chọn</Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending || !list.data?.unreadCount}
            >
              <CheckCheck aria-hidden /> {tc('actions.markAllRead')}
            </Button>
          </>
        }
      />
      <DataTable
        tableId="notifications"
        columns={columns}
        data={list.data?.items}
        total={list.data?.total ?? 0}
        params={table.params}
        onPageChange={table.setPage}
        onLimitChange={table.setLimit}
        isLoading={list.isPending}
        error={list.error}
        onRetry={() => void list.refetch()}
        emptyTitle={t('empty')}
        getRowId={(r) => r.id}
        onRowClick={(n) => {
          if (!n.readAt) markRead.mutate(n.id)
          const path = notificationLink(n.data)
          if (path) navigate(path)
        }}
        toolbarLeft={
          <FilterBar>
            <FilterField label={t('filterType')}>
              <Select
                value={table.params.filters.type ?? 'all'}
                onValueChange={(value) =>
                  table.setFilter('type', value === 'all' ? undefined : value)
                }
              >
                <SelectTrigger
                  id="notification-type"
                  className="w-full"
                  aria-label={t('filterType')}
                >
                  <SelectValue placeholder={t('allTypes')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allTypes')}</SelectItem>
                  {Object.entries(NOTIFICATION_TYPES).map(([type, label]) => (
                    <SelectItem key={type} value={type}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label={t('onlyUnread')}>
              <div className="flex h-9 items-center">
                <Switch
                  id="only-unread"
                  checked={onlyUnread}
                  onCheckedChange={(v) => table.setFilter('unread', v ? 'true' : undefined)}
                  aria-label={t('onlyUnread')}
                />
              </div>
            </FilterField>
          </FilterBar>
        }
      />
    </>
  )
}
