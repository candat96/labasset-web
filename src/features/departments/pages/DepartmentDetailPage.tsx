import { useParams } from 'react-router'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { DetailLayout } from '@/components/detail-layout'
import { DataTable, useServerTable } from '@/components/data-table'
import { ErrorState } from '@/components/page/ErrorState'
import { StatusBadge } from '@/components/status-badge'
import { commonStatusMap } from '@/lib/status-maps'
import { getDepartment, getDepartmentUsers, type DepartmentUser } from '../api'
export function Component() {
  const { t } = useTranslation('departments')
  const { id = '' } = useParams()
  const table = useServerTable()
  const department = useQuery({
    queryKey: ['departments', 'detail', id],
    queryFn: () => getDepartment(id),
  })
  const users = useQuery({
    queryKey: ['departments', id, 'users', table.params.page, table.params.limit],
    queryFn: () => getDepartmentUsers(id, table.params.page, table.params.limit),
  })
  const columns = useMemo<ColumnDef<DepartmentUser>[]>(
    () => [
      { accessorKey: 'username', header: t('userColumns.username') },
      { accessorKey: 'fullName', header: t('userColumns.fullName') },
      { accessorKey: 'email', header: t('userColumns.email') },
      {
        accessorKey: 'roles',
        header: t('userColumns.roles'),
        cell: ({ row }) => row.original.roles.join(', '),
      },
    ],
    [t],
  )
  if (department.isPending) return <p role="status">{t('loadingDetail')}</p>
  if (department.error)
    return <ErrorState error={department.error} onRetry={() => void department.refetch()} />
  const row = department.data
  return (
    <DetailLayout
      code={row.code}
      name={row.name}
      badge={<StatusBadge value={row.isActive ? 'active' : 'inactive'} map={commonStatusMap} />}
      information={
        <dl className="space-y-3">
          <div>
            <dt className="text-muted-foreground">{t('fields.phone')}</dt>
            <dd>{row.phone || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('fields.location')}</dt>
            <dd>{row.location || '—'}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t('userCount')}</dt>
            <dd>{users.data?.total ?? '—'}</dd>
          </div>
        </dl>
      }
      tabs={[
        {
          value: 'users',
          label: t('users'),
          content: (
            <DataTable
              tableId="department-users"
              columns={columns}
              data={users.data?.items}
              total={users.data?.total ?? 0}
              params={table.params}
              onPageChange={table.setPage}
              onLimitChange={table.setLimit}
              isLoading={users.isPending}
              error={users.error}
              onRetry={() => void users.refetch()}
              getRowId={(u) => u.id}
            />
          ),
        },
      ]}
    />
  )
}
