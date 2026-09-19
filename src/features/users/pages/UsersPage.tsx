import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, useServerTable } from '@/components/data-table'
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
import { ADM, ROLES, type Role } from '@/routes/roles'
import { roleLabels } from '@/lib/role-labels'
import { StatusBadge } from '@/components/status-badge'
import { commonStatusMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { listUsers } from '../api'
import type { User, UserParams } from '../types'
import { UserFormDialog } from '../components/UserFormDialog'
export function Component() {
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
      header: 'Tài khoản',
      cell: ({ row }) => (
        <Link className="text-primary hover:underline" to={`/admin/users/${row.original.id}`}>
          {row.original.username}
        </Link>
      ),
    },
    { accessorKey: 'fullName', header: 'Họ tên' },
    { accessorKey: 'email', header: 'Email' },
    {
      accessorKey: 'roles',
      header: 'Vai trò',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.roles.map((r) => (
            <Badge variant="secondary" key={r}>
              {roleLabels[r as Role] ?? r}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'departmentId',
      header: 'Khoa',
      cell: ({ row }) =>
        departments.data?.find((d) => d.id === row.original.departmentId)?.name ??
        row.original.departmentId ??
        '—',
    },
    {
      accessorKey: 'isActive',
      header: 'Trạng thái',
      cell: ({ row }) =>
        row.original.isActive === undefined ? (
          params.isActive === undefined ? (
            'Chưa có dữ liệu'
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
      header: 'Đăng nhập cuối',
      cell: ({ row }) => formatDateTime(row.original.lastLoginAt) || '—',
    },
  ]
  return (
    <>
      <PageHeader
        title="Người dùng"
        actions={canWrite && <Button onClick={() => setOpen(true)}>Thêm người dùng</Button>}
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
          <>
            <Input
              aria-label="Tìm người dùng"
              placeholder="Tìm tài khoản, tên, email"
              value={table.inputQ}
              onChange={(e) => table.setQ(e.target.value)}
              className="w-56"
            />
            <Select
              value={filters.role ?? 'all'}
              onValueChange={(v) => table.setFilter('role', v === 'all' ? undefined : v)}
            >
              <SelectTrigger aria-label="Lọc vai trò">
                <SelectValue placeholder="Vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Mọi vai trò</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {roleLabels[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AsyncSelect
              label="Lọc khoa"
              queryKey="departments"
              loadOptions={departmentOptions}
              resolveOption={resolveDepartment}
              value={filters.departmentId ?? null}
              clearable
              onChange={(v) =>
                table.setFilter('departmentId', typeof v === 'string' ? v : undefined)
              }
            />
            <Select
              value={filters.isActive ?? 'all'}
              onValueChange={(v) => table.setFilter('isActive', v === 'all' ? undefined : v)}
            >
              <SelectTrigger aria-label="Lọc trạng thái">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Mọi trạng thái</SelectItem>
                <SelectItem value="true">Hoạt động</SelectItem>
                <SelectItem value="false">Đã khoá</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />
      <UserFormDialog open={open} onOpenChange={setOpen} onPassword={setPassword} />
      <TemporaryPasswordDialog password={password} onClose={() => setPassword(null)} />
    </>
  )
}
