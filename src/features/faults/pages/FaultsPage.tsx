import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { DataTable, useServerTable } from '@/components/data-table'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/status-badge'
import { AsyncSelect } from '@/components/form/async-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { faultSeverityMap, faultStatusMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { useCan } from '@/app/guards/useCan'
import { ADM, STAFF } from '@/routes/roles'
import { catalogOptions } from '@/api/references'
import { listFaultSuggestions } from '../api'
import { useFaults } from '../hooks'
import {
  FAULT_SEVERITIES,
  FAULT_STATUSES,
  type Fault,
  type FaultListParams,
  type FaultScope,
  type FaultSeverity,
  type FaultStatus,
} from '../types'

const SCOPE_LABEL: Record<FaultScope, string> = {
  model: 'Model',
  group: 'Nhóm',
  all: 'Tất cả',
}

export function Component() {
  const canWrite = useCan(STAFF)
  const isAdm = useCan(ADM)
  const navigate = useNavigate()
  const table = useServerTable({
    filterKeys: ['model', 'manufacturerId', 'groupId', 'errorCode', 'severity', 'status', 'sort'],
  })
  const f = table.params.filters
  const sort = (f.sort ?? table.params.sort) as FaultListParams['sort']
  const params: FaultListParams = {
    page: table.params.page,
    limit: table.params.limit,
    q: table.params.q || undefined,
    model: f.model,
    manufacturerId: f.manufacturerId,
    groupId: f.groupId,
    errorCode: f.errorCode,
    severity: f.severity as FaultSeverity | undefined,
    status: f.status as FaultStatus | undefined,
    sort: sort === 'relevance' || sort === 'viewCount' || sort === 'updatedAt' ? sort : undefined,
  }
  const list = useFaults(params)
  const pending = useQuery({
    queryKey: ['faults', 'suggestions', 'pending-count'],
    queryFn: () => listFaultSuggestions({ status: 'pending', page: 1, limit: 1 }),
    enabled: isAdm,
  })
  const columns = useMemo<ColumnDef<Fault>[]>(
    () => [
      {
        accessorKey: 'errorCode',
        header: 'Mã lỗi',
        cell: ({ row }) => (
          <Link
            className="text-primary font-mono text-xs hover:underline"
            to={`/faults/${row.original.id}`}
          >
            {row.original.errorCode || '—'}
          </Link>
        ),
      },
      { accessorKey: 'title', header: 'Tiêu đề' },
      {
        accessorKey: 'scope',
        header: 'Phạm vi',
        cell: ({ row }) => {
          const scope = row.original.scope
          const extra = scope === 'model' && row.original.model ? ` · ${row.original.model}` : ''
          return `${SCOPE_LABEL[scope]}${extra}`
        },
      },
      {
        accessorKey: 'severity',
        header: 'Mức độ',
        cell: ({ row }) => <StatusBadge value={row.original.severity} map={faultSeverityMap} />,
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => <StatusBadge value={row.original.status} map={faultStatusMap} />,
      },
      { accessorKey: 'viewCount', header: 'Lượt xem' },
      {
        id: 'helpful',
        header: 'Hữu ích',
        cell: ({ row }) => `👍 ${row.original.helpfulCount}`,
      },
      {
        accessorKey: 'version',
        header: 'Version',
        cell: ({ row }) => `v${row.original.version}`,
      },
      {
        accessorKey: 'updatedAt',
        header: 'Cập nhật',
        cell: ({ getValue }) => formatDateTime(getValue<string>()),
      },
    ],
    [],
  )
  return (
    <>
      <PageHeader
        title="Thư viện lỗi"
        actions={
          <div className="flex flex-wrap gap-2">
            {isAdm && (
              <Button variant="outline" asChild>
                <Link to="/faults/suggestions">
                  Đề xuất chờ duyệt
                  {pending.data?.total ? ` (${pending.data.total})` : ''}
                </Link>
              </Button>
            )}
            {canWrite && (
              <Button asChild>
                <Link to="/faults/new">Thêm lỗi</Link>
              </Button>
            )}
          </div>
        }
      />
      <DataTable
        tableId="faults"
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
        onRowClick={(row) => navigate(`/faults/${row.id}`)}
        toolbarLeft={
          <>
            <Input
              aria-label="Tìm lỗi"
              placeholder="Tìm không dấu…"
              value={table.inputQ}
              onChange={(event) => table.setQ(event.target.value)}
            />
            <Input
              aria-label="Mã lỗi"
              placeholder="Mã lỗi"
              value={f.errorCode ?? ''}
              onChange={(event) => table.setFilter('errorCode', event.target.value || undefined)}
            />
            <Input
              aria-label="Model"
              placeholder="Model"
              value={f.model ?? ''}
              onChange={(event) => table.setFilter('model', event.target.value || undefined)}
            />
            <div className="min-w-48">
              <AsyncSelect
                label="Hãng"
                queryKey="manufacturers"
                loadOptions={(q) => catalogOptions('manufacturers', q)}
                value={f.manufacturerId ?? null}
                onChange={(value) =>
                  table.setFilter('manufacturerId', typeof value === 'string' ? value : undefined)
                }
                clearable
              />
            </div>
            <div className="min-w-48">
              <AsyncSelect
                label="Nhóm máy"
                queryKey="equipment-groups"
                loadOptions={(q) => catalogOptions('equipment-groups', q)}
                value={f.groupId ?? null}
                onChange={(value) =>
                  table.setFilter('groupId', typeof value === 'string' ? value : undefined)
                }
                clearable
              />
            </div>
            <Select
              value={f.severity ?? '__all__'}
              onValueChange={(value) =>
                table.setFilter('severity', value === '__all__' ? undefined : value)
              }
            >
              <SelectTrigger aria-label="Mức độ" className="w-40">
                <SelectValue placeholder="Mức độ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Mọi mức độ</SelectItem>
                {FAULT_SEVERITIES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {faultSeverityMap[item]?.label ?? item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={f.status ?? '__all__'}
              onValueChange={(value) =>
                table.setFilter('status', value === '__all__' ? undefined : value)
              }
            >
              <SelectTrigger aria-label="Trạng thái" className="w-40">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Mọi trạng thái</SelectItem>
                {FAULT_STATUSES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {faultStatusMap[item]?.label ?? item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sort ?? '__default__'}
              onValueChange={(value) =>
                table.setFilter('sort', value === '__default__' ? undefined : value)
              }
            >
              <SelectTrigger aria-label="Sắp xếp" className="w-40">
                <SelectValue placeholder="Sắp xếp" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">Mặc định</SelectItem>
                <SelectItem value="relevance">Liên quan</SelectItem>
                <SelectItem value="viewCount">Lượt xem</SelectItem>
                <SelectItem value="updatedAt">Cập nhật</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />
    </>
  )
}
