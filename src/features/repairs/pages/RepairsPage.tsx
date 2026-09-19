import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { AlertTriangle, PowerOff } from 'lucide-react'
import { DataTable, useServerTable } from '@/components/data-table'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/status-badge'
import { AsyncSelect } from '@/components/form/async-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { faultSeverityMap, repairStatusMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { formatVnd } from '@/lib/format/money'
import { departmentOptions, equipmentOptions, staffUserOptions } from '@/api/references'
import { useAuthStore } from '@/stores/auth.store'
import { useRepairs } from '../hooks'
import {
  REPAIR_SEVERITIES,
  REPAIR_STATUSES,
  type Repair,
  type RepairListParams,
  type RepairSeverity,
} from '../types'

const PRESETS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'mine', label: 'Của tôi' },
  { id: 'new', label: 'Mới' },
  { id: 'overdue', label: 'Quá hạn' },
] as const

export function Component() {
  const navigate = useNavigate()
  const me = useAuthStore((s) => s.user?.id)
  const table = useServerTable({
    filterKeys: [
      'status',
      'severity',
      'assigneeId',
      'departmentId',
      'equipmentId',
      'overdue',
      'from',
      'to',
      'preset',
    ],
  })
  const f = table.params.filters
  const preset = f.preset ?? 'all'
  const params: RepairListParams = {
    page: table.params.page,
    limit: table.params.limit,
    q: table.params.q || undefined,
    status: f.status,
    severity: f.severity as RepairSeverity | undefined,
    assigneeId: f.assigneeId,
    departmentId: f.departmentId,
    equipmentId: f.equipmentId,
    overdue: f.overdue === 'true' ? true : undefined,
    from: f.from,
    to: f.to,
  }
  const list = useRepairs(params)
  const setPreset = (id: (typeof PRESETS)[number]['id']) => {
    if (id === 'all')
      table.setFilters({
        preset: undefined,
        assigneeId: undefined,
        status: undefined,
        overdue: undefined,
      })
    else if (id === 'mine')
      table.setFilters({ preset: id, assigneeId: 'me', status: undefined, overdue: undefined })
    else if (id === 'new')
      table.setFilters({ preset: id, status: 'new', assigneeId: undefined, overdue: undefined })
    else table.setFilters({ preset: id, overdue: 'true', status: undefined, assigneeId: undefined })
  }
  const columns = useMemo<ColumnDef<Repair>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã',
        cell: ({ row }) => (
          <Link
            className="text-primary font-mono text-xs hover:underline"
            to={`/repairs/${row.original.id}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      {
        id: 'equipment',
        header: 'Máy',
        cell: ({ row }) =>
          row.original.equipment
            ? `${row.original.equipment.code} – ${row.original.equipment.name}`
            : row.original.equipmentId,
      },
      {
        accessorKey: 'reportedDepartmentId',
        header: 'Khoa',
        cell: ({ row }) => row.original.reportedDepartmentId ?? '—',
      },
      {
        accessorKey: 'severity',
        header: 'Mức khẩn',
        cell: ({ row }) => <StatusBadge value={row.original.severity} map={faultSeverityMap} />,
      },
      {
        id: 'down',
        header: 'Ngừng',
        cell: ({ row }) =>
          row.original.equipmentDown ? (
            <PowerOff className="text-destructive size-4" aria-label="Máy ngừng" />
          ) : null,
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => <StatusBadge value={row.original.status} map={repairStatusMap} />,
      },
      {
        id: 'assignee',
        header: 'Người xử lý',
        cell: ({ row }) => row.original.assignee?.fullName ?? '—',
      },
      {
        accessorKey: 'dueAt',
        header: 'Hạn',
        cell: ({ row }) => (
          <span className={row.original.isOverdue ? 'text-destructive font-medium' : undefined}>
            {formatDateTime(row.original.dueAt) || '—'}
            {row.original.isOverdue && (
              <StatusBadge
                value="overdue"
                map={{ overdue: { label: 'Quá hạn', tone: 'danger' } }}
              />
            )}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Tạo lúc',
        cell: ({ getValue }) => formatDateTime(getValue<string>()),
      },
      {
        accessorKey: 'totalCost',
        header: 'Chi phí',
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1">
            {formatVnd(row.original.totalCost) || '—'}
            {row.original.costWarning && (
              <AlertTriangle className="text-destructive size-4" aria-label="Cảnh báo chi phí" />
            )}
          </span>
        ),
      },
    ],
    [],
  )
  const selectedStatus = (f.status ?? '').split(',').filter(Boolean)
  return (
    <>
      <PageHeader
        title="Phiếu sửa chữa"
        actions={
          <Button asChild>
            <Link to="/repairs/new">Báo hỏng</Link>
          </Button>
        }
      />
      <div className="mb-3 flex flex-wrap gap-2">
        {PRESETS.map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant={preset === item.id ? 'default' : 'outline'}
            onClick={() => setPreset(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <DataTable
        tableId="repairs"
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
        onRowClick={(row) => navigate(`/repairs/${row.id}`)}
        toolbarLeft={
          <>
            <Input
              aria-label="Tìm phiếu"
              placeholder="Mã, mô tả…"
              value={table.inputQ}
              onChange={(event) => table.setQ(event.target.value)}
            />
            <Select
              value={selectedStatus[0] ?? '__all__'}
              onValueChange={(value) =>
                table.setFilter('status', value === '__all__' ? undefined : value)
              }
            >
              <SelectTrigger aria-label="Trạng thái" className="w-44">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Mọi trạng thái</SelectItem>
                {REPAIR_STATUSES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {repairStatusMap[item]?.label ?? item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={f.severity ?? '__all__'}
              onValueChange={(value) =>
                table.setFilter('severity', value === '__all__' ? undefined : value)
              }
            >
              <SelectTrigger aria-label="Mức khẩn" className="w-40">
                <SelectValue placeholder="Mức khẩn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Mọi mức</SelectItem>
                {REPAIR_SEVERITIES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {faultSeverityMap[item]?.label ?? item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="min-w-48">
              <AsyncSelect
                label="Người xử lý"
                queryKey="staff-users"
                loadOptions={staffUserOptions}
                value={f.assigneeId && f.assigneeId !== 'me' ? f.assigneeId : null}
                onChange={(value) =>
                  table.setFilter('assigneeId', typeof value === 'string' ? value : undefined)
                }
                clearable
              />
              {me && (
                <Button
                  type="button"
                  size="sm"
                  variant={f.assigneeId === 'me' ? 'default' : 'ghost'}
                  onClick={() =>
                    table.setFilter('assigneeId', f.assigneeId === 'me' ? undefined : 'me')
                  }
                >
                  Tôi
                </Button>
              )}
            </div>
            <div className="min-w-48">
              <AsyncSelect
                label="Khoa"
                queryKey="departments"
                loadOptions={departmentOptions}
                value={f.departmentId ?? null}
                onChange={(value) =>
                  table.setFilter('departmentId', typeof value === 'string' ? value : undefined)
                }
                clearable
              />
            </div>
            <div className="min-w-48">
              <AsyncSelect
                label="Máy"
                queryKey="equipment"
                loadOptions={equipmentOptions}
                value={f.equipmentId ?? null}
                onChange={(value) =>
                  table.setFilter('equipmentId', typeof value === 'string' ? value : undefined)
                }
                clearable
              />
            </div>
            <Input
              type="date"
              aria-label="Từ ngày"
              value={f.from ?? ''}
              onChange={(event) => table.setFilter('from', event.target.value || undefined)}
            />
            <Input
              type="date"
              aria-label="Đến ngày"
              value={f.to ?? ''}
              onChange={(event) => table.setFilter('to', event.target.value || undefined)}
            />
            <div className="flex items-center gap-2">
              <Switch
                id="overdue"
                checked={f.overdue === 'true'}
                onCheckedChange={(on) => table.setFilter('overdue', on ? 'true' : undefined)}
              />
              <Label htmlFor="overdue">Quá hạn</Label>
            </div>
          </>
        }
      />
    </>
  )
}
