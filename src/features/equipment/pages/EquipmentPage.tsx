import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/status-badge'
import { AsyncSelect } from '@/components/form/async-select'
import { equipmentStatusMap } from '@/lib/status-maps'
import { formatDate, formatDateTime } from '@/lib/format/date'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { departmentOptions } from '@/api/references'
import { messageFor } from '@/api/errors'
import { catalogOptions, downloadQrLabels, exportEquipment, userOptions } from '../api'
import { useEquipmentList } from '../hooks'
import { EQUIPMENT_STATUSES, type Equipment, type EquipmentStatus } from '../types'

function plusDays(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function Component() {
  const canWrite = useCan(STAFF)
  const navigate = useNavigate()
  const table = useServerTable({
    filterKeys: [
      'departmentId',
      'groupId',
      'status',
      'manufacturerId',
      'staffId',
      'maintenanceDueBefore',
      'calibrationDueBefore',
      'calibrationOverdue',
    ],
  })
  const f = table.params.filters
  const params = {
    page: table.params.page,
    limit: table.params.limit,
    q: table.params.q || undefined,
    departmentId: f.departmentId,
    groupId: f.groupId,
    manufacturerId: f.manufacturerId,
    staffId: f.staffId,
    status: f.status,
    maintenanceDueBefore: f.maintenanceDueBefore
      ? `${f.maintenanceDueBefore}T23:59:59.000Z`
      : undefined,
    calibrationDueBefore: f.calibrationDueBefore
      ? `${f.calibrationDueBefore}T23:59:59.000Z`
      : undefined,
    calibrationOverdue: f.calibrationOverdue === 'true' ? true : undefined,
    sort: table.params.sort as EquipmentListParamsSort,
    order: table.params.order,
  }
  const list = useEquipmentList(params)
  const [selected, setSelected] = useState<string[]>([])
  const toggle = (id: string, on: boolean) =>
    setSelected((current) => (on ? [...current, id] : current.filter((item) => item !== id)))
  const columns = useMemo<ColumnDef<Equipment>[]>(
    () => [
      {
        id: 'select',
        header: '',
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Chọn ${row.original.code}`}
            checked={selected.includes(row.original.id)}
            onClick={(event) => event.stopPropagation()}
            onCheckedChange={(value) => toggle(row.original.id, value === true)}
          />
        ),
      },
      {
        accessorKey: 'code',
        header: 'Mã',
        cell: ({ row }) => (
          <Link
            className="text-primary font-mono text-xs hover:underline"
            to={`/equipment/${row.original.id}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      { accessorKey: 'name', header: 'Tên' },
      { accessorKey: 'model', header: 'Model' },
      { accessorKey: 'serial', header: 'Serial' },
      { accessorKey: 'departmentName', header: 'Khoa' },
      { accessorKey: 'groupName', header: 'Nhóm' },
      { accessorKey: 'manufacturerName', header: 'Hãng' },
      { accessorKey: 'location', header: 'Vị trí' },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => {
          const badge = <StatusBadge value={row.original.status} map={equipmentStatusMap} />
          return row.original.status === 'disposed' ? <s>{badge}</s> : badge
        },
      },
      {
        accessorKey: 'nextMaintenanceAt',
        header: 'Bảo dưỡng kế tiếp',
        cell: ({ getValue }) => formatDate(getValue<string | null>()),
      },
      {
        accessorKey: 'nextCalibrationAt',
        header: 'Kiểm định kế tiếp',
        cell: ({ row }) => (
          <span className={row.original.calibrationOverdue ? 'text-destructive' : undefined}>
            {formatDate(row.original.nextCalibrationAt) || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: 'Cập nhật',
        cell: ({ getValue }) => formatDateTime(getValue<string>()),
      },
    ],
    [selected],
  )
  const selectedStatus = (f.status ?? '').split(',').filter(Boolean)
  const toggleStatus = (status: EquipmentStatus, on: boolean) => {
    const next = on ? [...selectedStatus, status] : selectedStatus.filter((item) => item !== status)
    table.setFilter('status', next.length ? next.join(',') : undefined)
  }
  return (
    <>
      <PageHeader
        title="Hồ sơ thiết bị"
        actions={
          canWrite && (
            <Button asChild>
              <Link to="/equipment/new">Thêm máy</Link>
            </Button>
          )
        }
      />
      <DataTable
        tableId="equipment"
        columns={columns}
        data={list.data?.items}
        total={list.data?.total ?? 0}
        params={table.params}
        onPageChange={table.setPage}
        onLimitChange={table.setLimit}
        onSortChange={table.setSort}
        isLoading={list.isPending}
        error={list.error}
        onRetry={() => void list.refetch()}
        getRowId={(row) => row.id}
        onRowClick={(row) => navigate(`/equipment/${row.id}`)}
        toolbarLeft={
          <>
            <Input
              aria-label="Tìm máy"
              placeholder="Mã, tên, serial…"
              value={table.inputQ}
              onChange={(event) => table.setQ(event.target.value)}
            />
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
                label="Nhóm"
                queryKey="equipment-groups"
                loadOptions={(q) => catalogOptions('equipment-groups', q)}
                value={f.groupId ?? null}
                onChange={(value) =>
                  table.setFilter('groupId', typeof value === 'string' ? value : undefined)
                }
                clearable
              />
            </div>
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
                label="Phụ trách VT"
                queryKey="staff"
                loadOptions={userOptions}
                value={f.staffId ?? null}
                onChange={(value) =>
                  table.setFilter('staffId', typeof value === 'string' ? value : undefined)
                }
                clearable
              />
            </div>
            <fieldset className="flex flex-wrap gap-2">
              <legend className="sr-only">Trạng thái</legend>
              {EQUIPMENT_STATUSES.map((status) => (
                <label key={status} className="flex items-center gap-1 text-xs">
                  <Checkbox
                    checked={selectedStatus.includes(status)}
                    onCheckedChange={(value) => toggleStatus(status, value === true)}
                  />
                  {equipmentStatusMap[status]?.label}
                </label>
              ))}
            </fieldset>
            <Input
              aria-label="Bảo dưỡng trước ngày"
              type="date"
              value={f.maintenanceDueBefore ?? ''}
              onChange={(event) =>
                table.setFilter('maintenanceDueBefore', event.target.value || undefined)
              }
            />
            <Input
              aria-label="Kiểm định trước ngày"
              type="date"
              value={f.calibrationDueBefore ?? ''}
              onChange={(event) =>
                table.setFilter('calibrationDueBefore', event.target.value || undefined)
              }
            />
            <Button
              type="button"
              variant={f.calibrationDueBefore === plusDays(30) ? 'default' : 'outline'}
              size="sm"
              onClick={() => table.setFilter('calibrationDueBefore', plusDays(30))}
            >
              Đến hạn kiểm định 30 ngày
            </Button>
            <label className="flex items-center gap-1 text-sm">
              <Checkbox
                checked={f.calibrationOverdue === 'true'}
                onCheckedChange={(value) =>
                  table.setFilter('calibrationOverdue', value === true ? 'true' : undefined)
                }
              />
              Quá hạn kiểm định
            </label>
          </>
        }
        toolbarRight={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await exportEquipment(params)
                } catch (error) {
                  toast.error(messageFor(error))
                }
              }}
            >
              Xuất Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={selected.length === 0}
              onClick={async () => {
                try {
                  await downloadQrLabels(selected)
                } catch (error) {
                  toast.error(messageFor(error))
                }
              }}
            >
              In tem QR
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={selected.length !== 2}
              onClick={() => navigate(`/equipment/compare?ids=${selected.join(',')}`)}
            >
              So sánh
            </Button>
          </>
        }
      />
    </>
  )
}

type EquipmentListParamsSort =
  'code' | 'name' | 'status' | 'departmentId' | 'commissionedAt' | 'updatedAt' | undefined
