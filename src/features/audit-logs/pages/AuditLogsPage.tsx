import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, useServerTable } from '@/components/data-table'
import { PageHeader } from '@/components/page/PageHeader'
import { Input } from '@/components/ui/input'
import { AsyncSelect } from '@/components/form/async-select'
import { AuditDiff } from '@/components/audit-diff'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { formatDateTime } from '@/lib/format/date'
import { dayRangeToIso } from '@/lib/format/date-range'
import { auditActionLabel } from '@/lib/audit-actions'
import { auditEntityPath } from '@/lib/audit-entity'
import { useAuditLogs, useAuditUsers } from '../hooks'
import { searchAuditUsers } from '../api'
import type { AuditLog } from '../types'

export function Component() {
  const table = useServerTable({ filterKeys: ['userId', 'entityType', 'from', 'to'] })
  const filters = table.params.filters
  const range = dayRangeToIso(filters.from, filters.to)
  const params = {
    page: table.params.page,
    limit: table.params.limit,
    userId: filters.userId,
    entityType: filters.entityType,
    from: range.from,
    to: range.to,
  }
  const list = useAuditLogs(params)
  const users = useAuditUsers()
  const names = useMemo(
    () => new Map((users.data ?? []).map((user) => [user.id, user.fullName || user.username])),
    [users.data],
  )
  const [selected, setSelected] = useState<AuditLog | null>(null)
  const columns = useMemo<ColumnDef<AuditLog>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Thời gian',
        cell: ({ getValue }) => (
          <time className="tabular-nums" dateTime={getValue<string>()}>
            {formatDateTime(getValue<string>())}
          </time>
        ),
      },
      {
        accessorKey: 'userId',
        header: 'Người dùng',
        cell: ({ row }) => names.get(row.original.userId ?? '') ?? row.original.userId ?? '—',
      },
      { accessorKey: 'entityType', header: 'Đối tượng' },
      {
        accessorKey: 'action',
        header: 'Hành động',
        cell: ({ row }) => auditActionLabel(row.original.action),
      },
      {
        accessorKey: 'entityId',
        header: 'Mã bản ghi',
        cell: ({ row }) => {
          const id = row.original.entityId
          const href = auditEntityPath(row.original.entityType, id)
          if (!id) return '—'
          if (!href) return <span className="font-mono text-xs">{id}</span>
          return (
            <Link
              className="text-primary font-mono text-xs hover:underline"
              to={href}
              onClick={(event) => event.stopPropagation()}
            >
              {id}
            </Link>
          )
        },
      },
      {
        accessorKey: 'ip',
        header: 'IP',
        cell: ({ getValue }) => getValue<string | null>() ?? '—',
      },
    ],
    [names],
  )
  return (
    <>
      <PageHeader title="Nhật ký hệ thống" />
      <DataTable
        tableId="audit-logs"
        columns={columns}
        data={list.data?.items}
        total={list.data?.total ?? 0}
        params={table.params}
        onPageChange={table.setPage}
        onLimitChange={table.setLimit}
        isLoading={list.isPending}
        error={list.error}
        onRetry={() => void list.refetch()}
        onRowClick={setSelected}
        getRowId={(row) => row.id}
        toolbarLeft={
          <>
            <Input
              aria-label="Từ ngày"
              type="date"
              value={filters.from ?? ''}
              onChange={(event) => table.setFilter('from', event.target.value || undefined)}
            />
            <Input
              aria-label="Đến ngày"
              type="date"
              value={filters.to ?? ''}
              onChange={(event) => table.setFilter('to', event.target.value || undefined)}
            />
            <div className="min-w-56">
              <AsyncSelect
                label="Người dùng"
                queryKey="audit-users"
                loadOptions={searchAuditUsers}
                value={filters.userId ?? null}
                onChange={(value) =>
                  table.setFilter('userId', typeof value === 'string' ? value : undefined)
                }
                clearable
                selectedOptions={(users.data ?? []).map((user) => ({
                  id: user.id,
                  code: user.username,
                  name: user.fullName,
                }))}
              />
            </div>
            <Input
              aria-label="Loại đối tượng"
              placeholder="entityType"
              value={filters.entityType ?? ''}
              onChange={(event) => table.setFilter('entityType', event.target.value || undefined)}
            />
          </>
        }
      />
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="sm:max-w-3xl" side="right">
          <SheetHeader>
            <SheetTitle>
              {selected?.action} · {selected?.entityType}
            </SheetTitle>
            <SheetDescription>
              {selected ? formatDateTime(selected.createdAt) : ''}
            </SheetDescription>
          </SheetHeader>
          {selected && (
            <div className="overflow-auto px-4 pb-4">
              <AuditDiff before={selected.before} after={selected.after} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
