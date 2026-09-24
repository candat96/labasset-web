import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { PageHeader } from '@/components/page/PageHeader'
import { EmptyState } from '@/components/page/EmptyState'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DatePicker } from '@/components/date-picker'
import { FilterBar, FilterField, FilterPreset } from '@/components/filter-bar'
import { MultiSelect } from '@/components/multi-select'
import { StatusBadge } from '@/components/status-badge'
import { AsyncSelect } from '@/components/form/async-select'
import { equipmentStatusMap } from '@/lib/status-maps'
import { formatDate, formatDateTime } from '@/lib/format/date'
import { dayRangeToIso } from '@/lib/format/date-range'
import { useCan } from '@/app/guards/useCan'
import { ADM, STAFF } from '@/routes/roles'
import {
  departmentOptions,
  resolveCatalogItem,
  resolveDepartment,
  resolveRoom,
  resolveUser,
  roomOptions,
} from '@/api/references'
import { messageFor } from '@/api/errors'
import { roomEquipmentCounts } from '@/api/room-counts'
import { useDepartmentLookup } from '@/api/lookups'
import { listCatalog } from '@/features/catalogs/api'
import { catalogOptions, exportEquipment, printQrLabels, userOptions } from '../api'
import { useEquipmentList } from '../hooks'
import { shortId, useUserNames } from '../components/lookups'
import { EQUIPMENT_STATUSES, type Equipment, type EquipmentListParams } from '../types'

/** Chỉ 7 cột API cho phép sort (xem `ListEquipmentDto`). */
const SORT_KEYS = [
  'code',
  'name',
  'status',
  'departmentId',
  'room',
  'commissionedAt',
  'updatedAt',
] as const
type SortKey = (typeof SORT_KEYS)[number]
const isSortKey = (value: string | undefined): value is SortKey =>
  !!value && (SORT_KEYS as readonly string[]).includes(value)

function plusDays(days: number) {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function Component() {
  const { t } = useTranslation('equipment')
  const { t: tc } = useTranslation()
  const isAdm = useCan(ADM)
  const canWrite = useCan(STAFF)
  const staffNames = useUserNames(isAdm)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  // Mode "Theo phòng": danh sách phòng kèm tổng số máy → bấm phòng ra danh sách máy.
  const roomMode = searchParams.get('view') === 'rooms'
  const roomQ = searchParams.get('roomQ') ?? ''
  const setParam = (key: string, value?: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }
  const roomList = useQuery({
    queryKey: ['equipment', 'rooms', roomQ],
    enabled: roomMode,
    queryFn: async () => {
      const result = await listCatalog('rooms', { q: roomQ || undefined, all: true })
      return Array.isArray(result) ? result : result.items
    },
  })
  const roomCounts = useQuery({
    queryKey: ['rooms', 'equipment-counts'],
    enabled: roomMode,
    queryFn: roomEquipmentCounts,
  })
  const departmentNames = useDepartmentLookup(roomMode)
  const table = useServerTable({
    filterKeys: [
      'departmentId',
      'roomId',
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
  const params: EquipmentListParams = {
    page: table.params.page,
    limit: table.params.limit,
    q: table.params.q || undefined,
    departmentId: f.departmentId,
    roomId: f.roomId,
    groupId: f.groupId,
    manufacturerId: f.manufacturerId,
    staffId: f.staffId,
    status: f.status,
    maintenanceDueBefore: dayRangeToIso(undefined, f.maintenanceDueBefore).to,
    calibrationDueBefore: dayRangeToIso(undefined, f.calibrationDueBefore).to,
    calibrationOverdue: f.calibrationOverdue === 'true' ? true : undefined,
    sort: isSortKey(table.params.sort) ? table.params.sort : undefined,
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
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => (
          <Checkbox
            aria-label={t('filters.selectRow', { code: row.original.code })}
            checked={selected.includes(row.original.id)}
            onClick={(event) => event.stopPropagation()}
            onCheckedChange={(value) => toggle(row.original.id, value === true)}
          />
        ),
      },
      {
        accessorKey: 'code',
        header: t('fields.code'),
        meta: { label: t('fields.code') },
        cell: ({ row }) => (
          <Link
            className="text-primary font-mono text-xs hover:underline"
            to={`/equipment/${row.original.id}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      { accessorKey: 'name', header: t('fields.name'), meta: { label: t('fields.name') } },
      {
        accessorKey: 'model',
        header: t('fields.model'),
        enableSorting: false,
        meta: { label: t('fields.model') },
      },
      {
        accessorKey: 'serial',
        header: t('fields.serial'),
        enableSorting: false,
        meta: { label: t('fields.serial') },
      },
      {
        id: 'departmentId',
        accessorFn: (row) => row.departmentName ?? '',
        header: t('fields.department'),
        meta: { label: t('fields.department') },
        cell: ({ row }) => row.original.departmentName ?? '—',
      },
      {
        id: 'room',
        accessorFn: (row) => row.room?.name ?? '',
        header: t('fields.room'),
        meta: { label: t('fields.room') },
        cell: ({ row }) =>
          row.original.room ? (
            <Link
              className="text-primary hover:underline"
              to={`/equipment?roomId=${row.original.room.id}`}
            >
              {row.original.room.name}
            </Link>
          ) : (
            '—'
          ),
      },
      {
        accessorKey: 'groupName',
        header: t('fields.group'),
        enableSorting: false,
        meta: { label: t('fields.group') },
      },
      {
        accessorKey: 'manufacturerName',
        header: t('fields.manufacturer'),
        enableSorting: false,
        meta: { label: t('fields.manufacturer') },
      },
      {
        accessorKey: 'location',
        header: t('fields.location'),
        enableSorting: false,
        meta: { label: t('fields.location') },
      },
      {
        accessorKey: 'staffInChargeUserId',
        header: t('fields.staffInCharge'),
        enableSorting: false,
        meta: { label: t('fields.staffInCharge') },
        cell: ({ row }) => {
          const id = row.original.staffInChargeUserId
          if (!id) return '—'
          return staffNames.get(id) ?? shortId(id)
        },
      },
      {
        accessorKey: 'status',
        header: t('fields.status'),
        meta: { label: t('fields.status') },
        cell: ({ row }) => {
          const badge = <StatusBadge value={row.original.status} map={equipmentStatusMap} />
          return row.original.status === 'disposed' ? <s>{badge}</s> : badge
        },
      },
      {
        accessorKey: 'nextMaintenanceAt',
        header: t('fields.nextMaintenanceAt'),
        enableSorting: false,
        meta: { label: t('fields.nextMaintenanceAt') },
        cell: ({ getValue }) => formatDate(getValue<string | null>()),
      },
      {
        accessorKey: 'nextCalibrationAt',
        header: t('fields.nextCalibrationAt'),
        enableSorting: false,
        meta: { label: t('fields.nextCalibrationAt') },
        cell: ({ row }) => (
          <span className={row.original.calibrationOverdue ? 'text-destructive' : undefined}>
            {formatDate(row.original.nextCalibrationAt) || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: t('fields.updatedAt'),
        meta: { label: t('fields.updatedAt') },
        cell: ({ getValue }) => formatDateTime(getValue<string>()),
      },
    ],
    [selected, t, staffNames],
  )
  const selectedStatus = (f.status ?? '').split(',').filter(Boolean)
  const dueIn30 = f.calibrationDueBefore === plusDays(30)
  const rooms = roomList.data ?? []
  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('listHint', {
          defaultValue: 'Toàn bộ trang thiết bị theo khoa, trạng thái và nhóm máy.',
        })}
        actions={
          <div className="flex flex-wrap gap-2">
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
              {t('actions.export')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={selected.length === 0}
              onClick={async () => {
                try {
                  await printQrLabels(selected)
                } catch (error) {
                  toast.error(messageFor(error))
                }
              }}
            >
              {t('actions.printQr')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={selected.length !== 2}
              onClick={() => navigate(`/equipment/compare?ids=${selected.join(',')}`)}
            >
              {t('actions.compare')}
            </Button>
            {canWrite && (
              <Button asChild>
                <Link to="/equipment/new">{t('create')}</Link>
              </Button>
            )}
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={roomMode ? 'rooms' : 'equipment'}
          onValueChange={(value) => setParam('view', value === 'rooms' ? 'rooms' : undefined)}
        >
          <TabsList>
            <TabsTrigger value="equipment">{t('views.equipment')}</TabsTrigger>
            <TabsTrigger value="rooms">{t('views.rooms')}</TabsTrigger>
          </TabsList>
        </Tabs>
        {roomMode && (
          <Input
            className="max-w-72"
            aria-label={t('rooms.search')}
            placeholder={t('rooms.search')}
            value={roomQ}
            onChange={(event) => setParam('roomQ', event.target.value)}
          />
        )}
      </div>
      {roomMode ? (
        roomList.isPending ? (
          <p className="text-muted-foreground text-sm">{tc('loading')}</p>
        ) : roomList.error ? (
          <div className="space-y-3">
            <p className="text-destructive text-sm">{messageFor(roomList.error)}</p>
            <Button variant="outline" size="sm" onClick={() => void roomList.refetch()}>
              {tc('retry')}
            </Button>
          </div>
        ) : rooms.length === 0 ? (
          <EmptyState title={t('rooms.empty')} />
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('fields.code')}</TableHead>
                  <TableHead>{t('fields.name')}</TableHead>
                  <TableHead>{t('fields.department')}</TableHead>
                  <TableHead>{t('fields.buildingFloor')}</TableHead>
                  <TableHead className="text-right">{t('rooms.count')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow
                    key={room.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/equipment?roomId=${room.id}`)}
                  >
                    <TableCell className="font-mono text-xs">{room.code}</TableCell>
                    <TableCell className="font-medium text-primary">{room.name}</TableCell>
                    <TableCell>
                      {room.departmentId
                        ? (departmentNames.get(String(room.departmentId)) ?? '—')
                        : t('rooms.shared')}
                    </TableCell>
                    <TableCell>
                      {[room.building, room.floor].filter(Boolean).join(' / ') || '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {roomCounts.data?.get(room.code) ?? 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : (
        <DataTable
          tableId="equipment"
          columns={columns}
          data={list.data?.items}
          total={list.data?.total ?? 0}
          params={table.params}
          onPageChange={(page) => {
            setSelected([])
            table.setPage(page)
          }}
          onLimitChange={(limit) => {
            setSelected([])
            table.setLimit(limit)
          }}
          onSortChange={(sort, order) =>
            table.setSort(isSortKey(sort) ? sort : undefined, isSortKey(sort) ? order : undefined)
          }
          isLoading={list.isPending}
          error={list.error}
          onRetry={() => void list.refetch()}
          getRowId={(row) => row.id}
          onRowClick={(row) => navigate(`/equipment/${row.id}`)}
          toolbarLeft={
            <FilterBar
              presets={
                <>
                  <FilterPreset
                    active={dueIn30}
                    onClick={() =>
                      table.setFilter('calibrationDueBefore', dueIn30 ? undefined : plusDays(30))
                    }
                  >
                    {t('filters.dueIn30')}
                  </FilterPreset>
                  <FilterPreset
                    active={f.calibrationOverdue === 'true'}
                    onClick={() =>
                      table.setFilter(
                        'calibrationOverdue',
                        f.calibrationOverdue === 'true' ? undefined : 'true',
                      )
                    }
                  >
                    {t('filters.overdue')}
                  </FilterPreset>
                </>
              }
              onClear={table.params.q || Object.keys(f).length ? table.reset : undefined}
            >
              <FilterField label={t('filters.search')}>
                <Input
                  aria-label={t('filters.search')}
                  placeholder={t('filters.searchPlaceholder')}
                  value={table.inputQ}
                  onChange={(event) => table.setQ(event.target.value)}
                />
              </FilterField>
              <FilterField label={t('filters.department')}>
                <AsyncSelect
                  label={t('filters.department')}
                  queryKey="departments"
                  loadOptions={departmentOptions}
                  value={f.departmentId ?? null}
                  onChange={(value) =>
                    table.setFilters({
                      departmentId: typeof value === 'string' ? value : undefined,
                      roomId: undefined,
                    })
                  }
                  resolveOption={resolveDepartment}
                  clearable
                  showLabel={false}
                />
              </FilterField>
              <FilterField label={t('filters.room')}>
                <AsyncSelect
                  label={t('filters.room')}
                  queryKey={`rooms:${f.departmentId ?? ''}`}
                  loadOptions={(q) => roomOptions(q, f.departmentId)}
                  value={f.roomId ?? null}
                  onChange={(value) =>
                    table.setFilter('roomId', typeof value === 'string' ? value : undefined)
                  }
                  resolveOption={resolveRoom}
                  clearable
                  showLabel={false}
                />
              </FilterField>
              <FilterField label={t('filters.group')}>
                <AsyncSelect
                  label={t('filters.group')}
                  queryKey="equipment-groups"
                  loadOptions={(q) => catalogOptions('equipment-groups', q)}
                  value={f.groupId ?? null}
                  onChange={(value) =>
                    table.setFilter('groupId', typeof value === 'string' ? value : undefined)
                  }
                  resolveOption={(id) => resolveCatalogItem('equipment-groups', id)}
                  clearable
                  showLabel={false}
                />
              </FilterField>
              <FilterField label={t('filters.manufacturer')}>
                <AsyncSelect
                  label={t('filters.manufacturer')}
                  queryKey="manufacturers"
                  loadOptions={(q) => catalogOptions('manufacturers', q)}
                  value={f.manufacturerId ?? null}
                  onChange={(value) =>
                    table.setFilter('manufacturerId', typeof value === 'string' ? value : undefined)
                  }
                  resolveOption={(id) => resolveCatalogItem('manufacturers', id)}
                  clearable
                  showLabel={false}
                />
              </FilterField>
              {isAdm && (
                <FilterField label={t('filters.staff')}>
                  <AsyncSelect
                    label={t('filters.staff')}
                    queryKey="staff"
                    loadOptions={(q) => userOptions(q)}
                    value={f.staffId ?? null}
                    onChange={(value) =>
                      table.setFilter('staffId', typeof value === 'string' ? value : undefined)
                    }
                    resolveOption={resolveUser}
                    clearable
                    showLabel={false}
                  />
                </FilterField>
              )}
              <FilterField label={t('filters.status')}>
                <MultiSelect
                  value={selectedStatus}
                  onChange={(next) =>
                    table.setFilter('status', next.length ? next.join(',') : undefined)
                  }
                  options={EQUIPMENT_STATUSES.map((status) => ({
                    value: status,
                    label: equipmentStatusMap[status]?.label ?? status,
                  }))}
                  placeholder={t('filters.status')}
                />
              </FilterField>
              <FilterField label={t('filters.maintenanceBefore')}>
                <DatePicker
                  ariaLabel={t('filters.maintenanceBefore')}
                  value={f.maintenanceDueBefore ?? ''}
                  onChange={(value) => table.setFilter('maintenanceDueBefore', value)}
                />
              </FilterField>
              <FilterField label={t('filters.calibrationBefore')}>
                <DatePicker
                  ariaLabel={t('filters.calibrationBefore')}
                  value={f.calibrationDueBefore ?? ''}
                  onChange={(value) => table.setFilter('calibrationDueBefore', value)}
                />
              </FilterField>
            </FilterBar>
          }
        />
      )}
    </>
  )
}
