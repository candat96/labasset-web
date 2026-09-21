import { useParams } from 'react-router'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { MapPin, Phone, Users } from 'lucide-react'
import { DetailLayout } from '@/components/detail-layout'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar } from '@/components/filter-bar'
import { ErrorState } from '@/components/page/ErrorState'
import { DetailSkeleton } from '@/components/page/DetailSkeleton'
import { DataList } from '@/components/page/DataList'
import { PageMeta } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { AuditTrail } from '@/components/audit-trail'
import { StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { enumLabel } from '@/lib/enum-labels'
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
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.roles.map((r) => (
              <Badge variant="secondary" key={r}>
                {enumLabel('role', r)}
              </Badge>
            ))}
          </div>
        ),
      },
    ],
    [t],
  )
  if (department.isPending) return <DetailSkeleton label={t('loadingDetail')} />
  if (department.error)
    return <ErrorState error={department.error} onRetry={() => void department.refetch()} />
  const row = department.data
  return (
    <DetailLayout
      code={row.code}
      eyebrow={t('title', { defaultValue: 'Khoa/phòng' })}
      name={row.name}
      badge={<StatusBadge value={row.isActive ? 'active' : 'inactive'} map={commonStatusMap} />}
      meta={
        <>
          <PageMeta icon={<Users />}>{row.code}</PageMeta>
          {row.location && <PageMeta icon={<MapPin />}>{row.location}</PageMeta>}
          {row.phone && <PageMeta icon={<Phone />}>{row.phone}</PageMeta>}
        </>
      }
      information={
        <>
          <h2 className="mb-3 text-[15px] leading-6 font-semibold">
            {t('info', { defaultValue: 'Thông tin' })}
          </h2>
          <DataList
            columns={1}
            items={[
              { label: t('fields.code', { defaultValue: 'Mã' }), value: row.code },
              { label: t('fields.phone'), value: row.phone },
              { label: t('fields.location'), value: row.location },
              { label: t('userCount'), value: users.data?.total },
            ]}
          />
        </>
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
              toolbarLeft={<FilterBar>{null}</FilterBar>}
              onPageChange={table.setPage}
              onLimitChange={table.setLimit}
              isLoading={users.isPending}
              error={users.error}
              onRetry={() => void users.refetch()}
              getRowId={(u) => u.id}
            />
          ),
        },
        {
          value: 'audit',
          label: t('audit', { defaultValue: 'Nhật ký' }),
          content: (
            <SectionCard title={t('audit', { defaultValue: 'Nhật ký thay đổi' })}>
              <AuditTrail entityType="department" entityId={id} />
            </SectionCard>
          ),
        },
      ]}
    />
  )
}
