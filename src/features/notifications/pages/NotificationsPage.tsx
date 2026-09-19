import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { DataTable, useServerTable } from '@/components/data-table'
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
  const table = useServerTable({ filterKeys: ['unread'] })
  const onlyUnread = table.params.filters.unread === 'true'
  const list = useNotifications({
    page: table.params.page,
    limit: table.params.limit,
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
          <Button
            variant="outline"
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending || !list.data?.unreadCount}
          >
            <CheckCheck aria-hidden /> {tc('actions.markAllRead')}
          </Button>
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
          const path = n.data?.path
          if (path?.startsWith('/')) navigate(path)
        }}
        toolbarLeft={
          <div className="flex items-center gap-2">
            <Switch
              id="only-unread"
              checked={onlyUnread}
              onCheckedChange={(v) => table.setFilter('unread', v ? 'true' : undefined)}
            />
            <Label htmlFor="only-unread">{t('onlyUnread')}</Label>
          </div>
        }
      />
    </>
  )
}
