import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar, FilterField } from '@/components/filter-bar'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AsyncSelect } from '@/components/form/async-select'
import { TemporaryPasswordDialog } from '@/components/temporary-password-dialog'
import { departmentOptions, allDepartments, resolveDepartment } from '@/api/references'
import { useCan } from '@/app/guards/useCan'
import { ADM, ROLES } from '@/routes/roles'
import { StatusBadge } from '@/components/status-badge'
import { commonStatusMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { listUsers } from '../api'
import type { User, UserParams } from '../types'
import { UserFormDialog } from '../components/UserFormDialog'
import { useRoleLabel } from '../role-label'
export function Component() {
  const { t } = useTranslation('users')
  const { t: tc } = useTranslation()
  const roleLabel = useRoleLabel()
  const canWrite = useCan(ADM),
    table = useServerTable({ filterKeys: ['role', 'departmentId', 'isActive'] })
  const filters = table.params.filters
  const params: UserParams = {
    page: table.params.page,
    limit: table.params.limit,
    q: table.params.q || undefined,
    role: ROLES.find((r) => r === filters.role),
    departmentId: filters.departmentId,
    isActive: filters.isActive === undefined ? undefined : filters.isActive === 'true',
  }
  const list = useQuery({
    queryKey: ['users', 'list', params],
    queryFn: () => listUsers(params),
    placeholderData: (prev) => prev,
  })
  const departments = useQuery({ queryKey: ['references', 'departments'], queryFn: allDepartments })
  const [open, setOpen] = useState(false),
    [password, setPassword] = useState<string | null>(null)
  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'username',
      header: t('fields.username'),
      cell: ({ row }) => (
        <Link className="text-primary hover:underline" to={`/admin/users/${row.original.id}`}>
          {row.original.username}
        </Link>
      ),
    },
    { accessorKey: 'fullName', header: t('fields.fullName') },
    { accessorKey: 'email', header: t('fields.email') },
    {
      accessorKey: 'roles',
      header: t('fields.roles'),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.roles.map((r) => (
            <Badge variant="secondary" key={r}>
              {roleLabel(r)}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'departmentId',
      header: t('fields.department'),
      cell: ({ row }) =>
        departments.data?.find((d) => d.id === row.original.departmentId)?.name ??
        row.original.departmentId ??
        '—',
    },
    {
      accessorKey: 'isActive',
      header: t('fields.isActive'),
      cell: ({ row }) =>
        row.original.isActive === undefined ? (
          params.isActive === undefined ? (
            tc('table.empty')
          ) : (
            <StatusBadge value={params.isActive ? 'active' : 'inactive'} map={commonStatusMap} />
          )
        ) : (
          <StatusBadge
            value={row.original.isActive ? 'active' : 'inactive'}
            map={commonStatusMap}
          />
        ),
    },
    {
      accessorKey: 'lastLoginAt',
      header: t('fields.lastLoginAt'),
      cell: ({ row }) => formatDateTime(row.original.lastLoginAt) || '—',
    },
  ]
  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('listHint', { defaultValue: 'Tài khoản người dùng và vai trò trong viện.' })}
        actions={canWrite && <Button onClick={() => setOpen(true)}>{t('add')}</Button>}
      />
      <DataTable
        tableId="users"
        columns={columns}
        data={list.data?.items}
        total={list.data?.total ?? 0}
        params={table.params}
        onPageChange={table.setPage}
        onLimitChange={table.setLimit}
        isLoading={list.isPending}
        error={list.error}
        onRetry={() => void list.refetch()}
        getRowId={(r) => r.id}
        toolbarLeft={
          <FilterBar>
            <FilterField label={t('search.label')}>
              <Input
                aria-label={t('search.label')}
                placeholder={t('search.placeholder')}
                value={table.inputQ}
                onChange={(e) => table.setQ(e.target.value)}
              />
            </FilterField>
            <FilterField label={t('filter.role')}>
              <Select
                value={filters.role ?? 'all'}
                onValueChange={(v) => table.setFilter('role', v === 'all' ? undefined : v)}
              >
                <SelectTrigger aria-label={t('filter.roleLabel')} className="w-full">
                  <SelectValue placeholder={t('filter.role')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filter.allRoles')}</SelectItem>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {roleLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label={t('filter.department')}>
              <AsyncSelect
                label={t('filter.department')}
                queryKey="departments"
                loadOptions={departmentOptions}
                resolveOption={resolveDepartment}
                value={filters.departmentId ?? null}
                clearable
                onChange={(v) =>
                  table.setFilter('departmentId', typeof v === 'string' ? v : undefined)
                }
              />
            </FilterField>
            <FilterField label={t('filter.status')}>
              <Select
                value={filters.isActive ?? 'all'}
                onValueChange={(v) => table.setFilter('isActive', v === 'all' ? undefined : v)}
              >
                <SelectTrigger aria-label={t('filter.status')} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filter.allStatuses')}</SelectItem>
                  <SelectItem value="true">{t('filter.active')}</SelectItem>
                  <SelectItem value="false">{t('filter.locked')}</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
          </FilterBar>
        }
      />
      <UserFormDialog open={open} onOpenChange={setOpen} onPassword={setPassword} />
      <TemporaryPasswordDialog password={password} onClose={() => setPassword(null)} />
    </>
  )
}
