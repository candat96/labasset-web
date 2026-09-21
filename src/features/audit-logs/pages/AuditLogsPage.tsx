import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar, FilterField } from '@/components/filter-bar'
import { PageHeader } from '@/components/page/PageHeader'
import { Input } from '@/components/ui/input'
import { AsyncSelect } from '@/components/form/async-select'
import { DatePicker } from '@/components/date-picker'
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
  const { t } = useTranslation('audit-logs')
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
        header: t('columns.createdAt'),
        cell: ({ getValue }) => (
          <time className="tabular-nums" dateTime={getValue<string>()}>
            {formatDateTime(getValue<string>())}
          </time>
        ),
      },
      {
        accessorKey: 'userId',
        header: t('columns.user'),
        cell: ({ row }) => names.get(row.original.userId ?? '') ?? row.original.userId ?? '—',
      },
      { accessorKey: 'entityType', header: t('columns.entityType') },
      {
        accessorKey: 'action',
        header: t('columns.action'),
        cell: ({ row }) => auditActionLabel(row.original.action),
      },
      {
        accessorKey: 'entityId',
        header: t('columns.entityId'),
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
        header: t('columns.ip'),
        cell: ({ getValue }) => getValue<string | null>() ?? '—',
      },
    ],
    [names, t],
  )
  return (
    <>
      <PageHeader title={t('title')} />
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
          <FilterBar>
            <FilterField label={t('filter.from')}>
              <DatePicker
                ariaLabel={t('filter.from')}
                value={filters.from ?? ''}
                onChange={(value) => table.setFilter('from', value)}
              />
            </FilterField>
            <FilterField label={t('filter.to')}>
              <DatePicker
                ariaLabel={t('filter.to')}
                value={filters.to ?? ''}
                onChange={(value) => table.setFilter('to', value)}
              />
            </FilterField>
            <FilterField label={t('filter.user')}>
              <AsyncSelect
                label={t('filter.user')}
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
            </FilterField>
            <FilterField label={t('filter.entityType')}>
              <Input
                aria-label={t('filter.entityType')}
                placeholder={t('filter.entityTypePlaceholder')}
                value={filters.entityType ?? ''}
                onChange={(event) => table.setFilter('entityType', event.target.value || undefined)}
              />
            </FilterField>
          </FilterBar>
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
