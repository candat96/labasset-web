import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar, FilterField } from '@/components/filter-bar'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/status-badge'
import { commonStatusMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { useHospitals } from '../hooks'
import type { Hospital } from '../api'

const statuses = ['provisioning', 'active', 'suspended', 'failed'] as const

export function Component() {
  const { t } = useTranslation('sys')
  const { t: tc } = useTranslation()
  const table = useServerTable({ filterKeys: ['status'] })
  const status = table.params.filters.status
  const params = {
    page: table.params.page,
    limit: table.params.limit,
    q: table.params.q || undefined,
    status: statuses.find((value) => value === status),
  }
  const list = useHospitals(params)
  const columns: ColumnDef<Hospital>[] = [
    {
      accessorKey: 'code',
      header: t('hospital.fields.code'),
      cell: ({ row }) => (
        <Link
          className="text-primary font-mono text-xs hover:underline"
          to={`/sys/hospitals/${row.original.id}`}
        >
          {row.original.code}
        </Link>
      ),
    },
    { accessorKey: 'name', header: t('hospital.fields.name') },
    {
      accessorKey: 'status',
      header: t('hospital.fields.status'),
      cell: ({ row }) => <StatusBadge value={row.original.status} map={commonStatusMap} />,
    },
    {
      id: 'plan',
      header: t('hospital.fields.planExpires'),
      cell: ({ row }) =>
        `${row.original.plan}${row.original.licenseExpiresAt ? ` · ${formatDateTime(row.original.licenseExpiresAt)}` : ''}`,
    },
    {
      id: 'migrations',
      header: t('hospital.fields.migrations'),
      cell: ({ row }) =>
        row.original.migrations.error
          ? row.original.migrations.error
          : row.original.migrations.pending?.length
            ? t('hospital.pending', { pending: row.original.migrations.pending.length })
            : t('hospital.updated'),
    },
    {
      accessorKey: 'createdAt',
      header: t('hospital.fields.createdAt'),
      cell: ({ getValue }) => formatDateTime(getValue<string>()),
    },
  ]
  return (
    <>
      <PageHeader
        title={t('hospital.title')}
        actions={
          <Button asChild>
            <Link to="/sys/hospitals/new">{t('hospital.add')}</Link>
          </Button>
        }
      />
      <DataTable
        tableId="sys-hospitals"
        columns={columns}
        data={list.data?.items}
        total={list.data?.total ?? 0}
        params={table.params}
        onPageChange={table.setPage}
        onLimitChange={table.setLimit}
        isLoading={list.isPending}
        error={list.error}
        onRetry={() => void list.refetch()}
        getRowId={(row) => row.id}
        toolbarLeft={
          <FilterBar>
            <FilterField label={t('hospital.searchLabel')}>
              <Input
                aria-label={t('hospital.searchLabel')}
                placeholder={t('hospital.searchPlaceholder')}
                value={table.inputQ}
                onChange={(event) => table.setQ(event.target.value)}
              />
            </FilterField>
            <FilterField label={t('hospital.fields.status')}>
              <Select
                value={status ?? 'all'}
                onValueChange={(value) =>
                  table.setFilter('status', value === 'all' ? undefined : value)
                }
              >
                <SelectTrigger aria-label={t('hospital.fields.status')} className="w-full">
                  <SelectValue placeholder={t('hospital.fields.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tc('status.all')}</SelectItem>
                  {statuses.map((value) => (
                    <SelectItem key={value} value={value}>
                      {commonStatusMap[value]?.label ?? value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
          </FilterBar>
        }
      />
    </>
  )
}
