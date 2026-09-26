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
import { FilterPreset } from '@/components/filter-bar'
import { FilterPanel, FilterPanelField } from '@/components/page/FilterPanel'
import { SectionCard } from '@/components/page/SectionCard'
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
import { useDepartmentLookup, useCatalogLookup, useRoomLookup } from '@/api/lookups'
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

/** Ô dính trái khi bảng cuộn ngang; nền đặc để nội dung cuộn không lộ bên dưới. */
const STICKY = 'sticky z-[5] bg-card [th&]:z-20 [th&]:bg-muted [tr:hover>&]:bg-muted'
/** Link trong bảng: màu `--primary`, không gạch chân (§Chuẩn thành phần → Bảng). */
const LINK = 'text-primary font-medium hover:text-primary/80'

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
  // Tên khoa cho mode "Theo phòng" và cho chip lọc khoa.
  const departmentNames = useDepartmentLookup()
  // Bảng tra tên cho chip lọc đang áp (Phòng/Nhóm/Hãng/Phụ trách).
  const roomNames = useRoomLookup()
  const groupNames = useCatalogLookup('equipment-groups')
  const manufacturerNames = useCatalogLookup('manufacturers')
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
  const pageIds = useMemo(() => (list.data?.items ?? []).map((row) => row.id), [list.data])
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.includes(id))
  const columns = useMemo<ColumnDef<Equipment>[]>(
    () => [
      {
        id: 'select',
        header: () => (
          <Checkbox
            aria-label={t('filters.selectPage')}
            checked={allOnPage ? true : selected.length > 0 ? 'indeterminate' : false}
            onCheckedChange={(value) => setSelected(value === true ? pageIds : [])}
          />
        ),
        enableHiding: false,
        enableSorting: false,
        meta: { className: `${STICKY} left-0 w-11 max-w-11 min-w-11` },
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
        // Cột mã dính trái khi cuộn ngang (§UX quyết định 5).
        meta: { label: t('fields.code'), className: `${STICKY} left-11` },
        cell: ({ row }) => (
          <Link
            className={`${LINK} font-mono text-xs tabular-nums`}
            to={`/equipment/${row.original.id}`}
            onClick={(event) => event.stopPropagation()}
          >
            {row.original.code}
          </Link>
        ),
      },
      {
        accessorKey: 'name',
        header: t('fields.name'),
        // Tên máy hai dòng: tên + model nhỏ nhạt; tên dài xuống dòng thay vì kéo cột.
        meta: {
          label: t('fields.name'),
          className: 'max-w-[380px] min-w-[220px] whitespace-normal',
        },
        cell: ({ row }) => (
          <div className="min-w-0 py-0.5">
            <p className="text-foreground leading-5 font-medium">{row.original.name}</p>
            {row.original.model && (
              <p className="text-muted-foreground text-[12.5px] leading-4">{row.original.model}</p>
            )}
          </div>
        ),
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
        cell: ({ row }) =>
          row.original.departmentId ? (
            <Link
              className={LINK}
              to={`/equipment?departmentId=${row.original.departmentId}`}
              onClick={(event) => event.stopPropagation()}
            >
              {row.original.departmentName ?? shortId(row.original.departmentId)}
            </Link>
          ) : (
            '—'
          ),
      },
      {
        id: 'room',
        accessorFn: (row) => row.room?.name ?? '',
        header: t('fields.room'),
        meta: { label: t('fields.room') },
        cell: ({ row }) =>
          row.original.room ? (
            <Link
              className={LINK}
              to={`/equipment?roomId=${row.original.room.id}`}
              onClick={(event) => event.stopPropagation()}
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
        meta: { label: t('fields.nextMaintenanceAt'), className: 'tabular-nums' },
        cell: ({ getValue }) => formatDate(getValue<string | null>()),
      },
      {
        accessorKey: 'nextCalibrationAt',
        header: t('fields.nextCalibrationAt'),
        enableSorting: false,
        meta: { label: t('fields.nextCalibrationAt'), className: 'tabular-nums' },
        cell: ({ row }) => (
          <span className={row.original.calibrationOverdue ? 'text-destructive' : undefined}>
            {formatDate(row.original.nextCalibrationAt) || '—'}
          </span>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: t('fields.updatedAt'),
        meta: { label: t('fields.updatedAt'), className: 'tabular-nums' },
        cell: ({ getValue }) => formatDateTime(getValue<string>()),
      },
    ],
    [selected, t, staffNames, allOnPage, pageIds],
  )
  const selectedStatus = (f.status ?? '').split(',').filter(Boolean)
  const dueIn30 = f.calibrationDueBefore === plusDays(30)
  const overdue = f.calibrationOverdue === 'true'
  const rooms = roomList.data ?? []
  const clearSelection = () => setSelected([])

  // Bộ lọc đang áp → chip gỡ được khi panel thu (§UX quyết định 4).
  const activeFilters: Array<{ key: string; label: string; onRemove: () => void }> = []
  const addChip = (key: string, label: string, onRemove = () => table.setFilter(key, undefined)) =>
    activeFilters.push({ key, label, onRemove })
  if (f.departmentId)
    addChip(
      'departmentId',
      `${t('filters.department')}: ${departmentNames.get(f.departmentId) ?? shortId(f.departmentId)}`,
      () => table.setFilters({ departmentId: undefined, roomId: undefined }),
    )
  if (f.roomId)
    addChip('roomId', `${t('filters.room')}: ${roomNames.get(f.roomId)?.name ?? shortId(f.roomId)}`)
  if (f.groupId)
    addChip('groupId', `${t('filters.group')}: ${groupNames.get(f.groupId) ?? shortId(f.groupId)}`)
  if (f.manufacturerId)
    addChip(
      'manufacturerId',
      `${t('filters.manufacturer')}: ${manufacturerNames.get(f.manufacturerId) ?? shortId(f.manufacturerId)}`,
    )
  if (f.staffId)
    addChip('staffId', `${t('filters.staff')}: ${staffNames.get(f.staffId) ?? shortId(f.staffId)}`)
  if (selectedStatus.length)
    addChip(
      'status',
      `${t('filters.status')}: ${selectedStatus
        .map((status) => equipmentStatusMap[status]?.label ?? status)
        .join(', ')}`,
    )
  if (f.maintenanceDueBefore)
    addChip(
      'maintenanceDueBefore',
      `${t('filters.maintenanceBefore')}: ${formatDate(f.maintenanceDueBefore)}`,
    )
  if (f.calibrationDueBefore)
    addChip(
      'calibrationDueBefore',
      dueIn30
        ? t('filters.dueIn30')
        : `${t('filters.calibrationBefore')}: ${formatDate(f.calibrationDueBefore)}`,
    )
  if (overdue) addChip('calibrationOverdue', t('filters.overdue'))

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('listHint')}
        actions={
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
              {t('actions.export')}
            </Button>
            {canWrite && (
              <Button asChild>
                <Link to="/equipment/new">{t('create')}</Link>
              </Button>
            )}
          </>
        }
      />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
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
          <SectionCard flush bodyClassName="overflow-x-auto">
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
                    <TableCell className="text-primary font-medium">{room.name}</TableCell>
                    <TableCell>
                      {room.departmentId
                        ? (departmentNames.get(String(room.departmentId)) ?? '—')
                        : t('rooms.shared')}
                    </TableCell>
                    <TableCell>
                      {[room.building, room.floor].filter(Boolean).join(' / ') || '—'}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {roomCounts.data?.get(room.code) ?? 0}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        )
      ) : (
        <FilterPanel
          storageKey="equipment"
          activeFilters={activeFilters}
          onReset={table.params.q || activeFilters.length ? table.reset : undefined}
          toolbar={
            <>
              <Input
                className="w-72 max-w-full"
                aria-label={t('filters.search')}
                placeholder={t('filters.searchPlaceholder')}
                value={table.inputQ}
                onChange={(event) => table.setQ(event.target.value)}
              />
              <FilterPreset
                active={dueIn30}
                onClick={() =>
                  table.setFilter('calibrationDueBefore', dueIn30 ? undefined : plusDays(30))
                }
              >
                {t('filters.dueIn30')}
              </FilterPreset>
              <FilterPreset
                active={overdue}
                onClick={() => table.setFilter('calibrationOverdue', overdue ? undefined : 'true')}
              >
                {t('filters.overdue')}
              </FilterPreset>
            </>
          }
          fields={
            <>
              <FilterPanelField label={t('filters.department')}>
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
              </FilterPanelField>
              <FilterPanelField label={t('filters.room')}>
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
              </FilterPanelField>
              <FilterPanelField label={t('filters.group')}>
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
              </FilterPanelField>
              <FilterPanelField label={t('filters.manufacturer')}>
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
              </FilterPanelField>
              {isAdm && (
                <FilterPanelField label={t('filters.staff')}>
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
                </FilterPanelField>
              )}
              <FilterPanelField label={t('filters.status')}>
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
              </FilterPanelField>
              <FilterPanelField label={t('filters.maintenanceBefore')}>
                <DatePicker
                  ariaLabel={t('filters.maintenanceBefore')}
                  value={f.maintenanceDueBefore ?? ''}
                  onChange={(value) => table.setFilter('maintenanceDueBefore', value)}
                />
              </FilterPanelField>
              <FilterPanelField label={t('filters.calibrationBefore')}>
                <DatePicker
                  ariaLabel={t('filters.calibrationBefore')}
                  value={f.calibrationDueBefore ?? ''}
                  onChange={(value) => table.setFilter('calibrationDueBefore', value)}
                />
              </FilterPanelField>
            </>
          }
        >
          {selected.length > 0 && (
            // Thao tác hàng loạt thay vì lặp nút trên từng hàng (§UX quyết định 5).
            <div
              role="region"
              aria-label={t('bulk.label')}
              className="bg-primary-soft flex flex-wrap items-center gap-2 rounded-md px-4 py-2 text-[13px]"
            >
              <span className="mr-auto font-semibold tabular-nums">
                {t('bulk.selected', { count: selected.length })}
              </span>
              <Button
                variant="outline"
                size="sm"
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
                title={selected.length !== 2 ? t('actions.selectTwo') : undefined}
                onClick={() => navigate(`/equipment/compare?ids=${selected.join(',')}`)}
              >
                {t('actions.compare')}
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSelection}>
                {t('bulk.clear')}
              </Button>
            </div>
          )}
          <DataTable
            tableId="equipment"
            columns={columns}
            data={list.data?.items}
            total={list.data?.total ?? 0}
            params={table.params}
            selectedCount={selected.length}
            onPageChange={(page) => {
              clearSelection()
              table.setPage(page)
            }}
            onLimitChange={(limit) => {
              clearSelection()
              table.setLimit(limit)
            }}
            onSortChange={(sort, order) =>
              table.setSort(isSortKey(sort) ? sort : undefined, isSortKey(sort) ? order : undefined)
            }
            isLoading={list.isPending}
            error={list.error}
            onRetry={() => void list.refetch()}
            emptyAction={
              activeFilters.length || table.params.q ? (
                <Button variant="outline" size="sm" onClick={table.reset}>
                  {tc('clearFilters')}
                </Button>
              ) : undefined
            }
            getRowId={(row) => row.id}
            onRowClick={(row) => navigate(`/equipment/${row.id}`)}
          />
        </FilterPanel>
      )}
    </>
  )
}
