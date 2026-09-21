import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar, FilterField } from '@/components/filter-bar'
import { PageHeader } from '@/components/page/PageHeader'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ExternalLink } from 'lucide-react'
import { enumLabel } from '@/lib/enum-labels'
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
import { auditEntityPath } from '@/lib/audit-entity'
import { useAuditLogs, useAuditUsers } from '../hooks'
import { searchAuditUsers } from '../api'
import type { AuditLog } from '../types'

/** Đối tượng hay tra cứu trong bộ lọc (giá trị đúng như API ghi). */
const ENTITY_TYPE_OPTIONS = [
  'users',
  'departments',
  'equipment',
  'equipment_transfer',
  'repair_ticket',
  'fault',
  'maintenance_task',
  'maintenance_plan',
  'calibration',
  'request',
  'supply',
  'stock_receipt',
  'stock_issue',
  'stock_transfer',
  'stocktake_session',
  'report',
  'settings',
  'ai',
] as const

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
      {
        accessorKey: 'entityType',
        header: t('columns.entityType'),
        cell: ({ row }) => enumLabel('auditEntityType', row.original.entityType),
      },
      {
        accessorKey: 'action',
        header: t('columns.action'),
        cell: ({ row }) => enumLabel('auditAction', row.original.action),
      },
      {
        accessorKey: 'entityId',
        header: t('columns.entityId'),
        cell: ({ row }) => {
          const id = row.original.entityId
          const href = auditEntityPath(row.original.entityType, id)
          if (!id) return '—'
          if (!href)
            return (
              <span className="text-subtle font-mono text-xs" title={id}>
                {id.slice(0, 8)}
              </span>
            )
          return (
            <Link
              className="text-primary inline-flex items-center gap-1 text-[13px] font-medium hover:underline"
              to={href}
              title={id}
              onClick={(event) => event.stopPropagation()}
            >
              <ExternalLink className="size-3.5" aria-hidden />
              {t('view', { defaultValue: 'Xem' })}
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
      <PageHeader
        title={t('title')}
        description={t('listHint', {
          defaultValue:
            'Lịch sử thao tác của người dùng trên hệ thống; lọc theo người, đối tượng và thời gian.',
        })}
      />
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
              <Select
                value={filters.entityType ?? 'all'}
                onValueChange={(value) =>
                  table.setFilter('entityType', value === 'all' ? undefined : value)
                }
              >
                <SelectTrigger className="w-full" aria-label={t('filter.entityType')}>
                  <SelectValue
                    placeholder={t('filter.allEntityTypes', { defaultValue: 'Mọi đối tượng' })}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('filter.allEntityTypes', { defaultValue: 'Mọi đối tượng' })}
                  </SelectItem>
                  {ENTITY_TYPE_OPTIONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {enumLabel('auditEntityType', value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          </FilterBar>
        }
      />
      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="sm:max-w-3xl" side="right">
          <SheetHeader>
            <SheetTitle>
              {enumLabel('auditAction', selected?.action)} ·{' '}
              {enumLabel('auditEntityType', selected?.entityType)}
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
