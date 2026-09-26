import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DeleteIconButton, EditIconButton } from '@/components/icon-action'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterPanel, FilterPanelField } from '@/components/page/FilterPanel'
import { PageHeader } from '@/components/page/PageHeader'
import { StatusBadge } from '@/components/status-badge'
import { AsyncSelect } from '@/components/form/async-select'
import { useConfirm } from '@/components/confirm-dialog'
import { commonStatusMap } from '@/lib/status-maps'
import { ROOM_TYPES, enumLabel } from '@/lib/enum-labels'
import { isApiError, messageFor } from '@/api/errors'
import { roomEquipmentCounts } from '@/api/room-counts'
import { departmentOptions, resolveDepartment } from '@/api/references'
import { useDepartmentLookup } from '@/api/lookups'
import { deleteCatalog, exportCatalog, listCatalog } from '../api'
import type { CatalogRow } from '../types'
import { RoomDialog } from '../components/RoomDialog'
import { CatalogImportDialog } from '../components/CatalogImportDialog'

const isRoomType = (value?: string): value is (typeof ROOM_TYPES)[number] =>
  !!value && (ROOM_TYPES as readonly string[]).includes(value)

export function Component() {
  const { t } = useTranslation('catalogs')
  const { t: tc } = useTranslation()
  const table = useServerTable({ filterKeys: ['isActive', 'departmentId', 'roomType'] })
  const f = table.params.filters
  const roomType = isRoomType(f.roomType) ? f.roomType : undefined
  const params = {
    q: table.params.q || undefined,
    isActive: f.isActive === undefined ? undefined : f.isActive === 'true',
    departmentId: f.departmentId,
  }
  // API chưa lọc `roomType` → khi lọc loại: tải `all=true`, lọc và phân trang phía web.
  const list = useQuery({
    queryKey: [
      'catalogs',
      'rooms',
      { ...params, roomType, page: table.params.page, limit: table.params.limit },
    ],
    queryFn: async () => {
      if (roomType) {
        const result = await listCatalog('rooms', { ...params, all: true })
        const rows = (Array.isArray(result) ? result : result.items).filter(
          (row) => row.roomType === roomType,
        )
        const start = (table.params.page - 1) * table.params.limit
        return { items: rows.slice(start, start + table.params.limit), total: rows.length }
      }
      const result = await listCatalog('rooms', {
        ...params,
        page: table.params.page,
        limit: table.params.limit,
      })
      return Array.isArray(result) ? { items: result, total: result.length } : result
    },
    placeholderData: (previous) => previous,
  })
  const counts = useQuery({ queryKey: ['rooms', 'equipment-counts'], queryFn: roomEquipmentCounts })
  const departmentNames = useDepartmentLookup()
  const qc = useQueryClient()
  const [editing, setEditing] = useState<CatalogRow | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const { confirm, dialog } = useConfirm()
  const remove = useMutation({
    mutationFn: (id: string) => deleteCatalog('rooms', id),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ['catalogs', 'rooms'] })
      toast.success(result.deactivated ? t('deactivated') : t('deleted'))
    },
    onError: (error) =>
      toast.error(
        isApiError(error) && error.code === 'ROOM_IN_USE' ? t('roomInUse') : messageFor(error),
      ),
  })
  const columns = useMemo<ColumnDef<CatalogRow>[]>(
    () => [
      {
        accessorKey: 'code',
        header: t('fields.code'),
        cell: ({ getValue }) => <code className="font-mono text-xs">{getValue<string>()}</code>,
      },
      {
        accessorKey: 'name',
        header: t('fields.name'),
        cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
      },
      {
        accessorKey: 'departmentId',
        header: t('catalogFields.rooms.departmentId'),
        cell: ({ row }) => {
          const id = row.original.departmentId
          if (!id) return <Badge variant="secondary">{t('catalogFields.rooms.shared')}</Badge>
          return departmentNames.get(String(id)) ?? String(row.original.departmentCode ?? id)
        },
      },
      {
        id: 'buildingFloor',
        header: t('catalogFields.rooms.buildingFloor'),
        cell: ({ row }) =>
          [row.original.building, row.original.floor].filter(Boolean).join(' / ') || '—',
      },
      {
        accessorKey: 'roomType',
        header: t('catalogFields.rooms.roomType'),
        cell: ({ row }) =>
          enumLabel(
            'roomType',
            typeof row.original.roomType === 'string' ? row.original.roomType : null,
          ),
      },
      {
        id: 'equipmentCount',
        header: t('catalogFields.rooms.equipmentCount', { defaultValue: 'Số máy' }),
        cell: ({ row }) => {
          const count = counts.data?.get(row.original.code) ?? 0
          return count ? (
            <Link
              className="text-primary hover:underline"
              to={`/equipment?roomId=${row.original.id}`}
            >
              {count}
            </Link>
          ) : (
            '0'
          )
        },
      },
      {
        accessorKey: 'isActive',
        header: t('fields.status'),
        cell: ({ row }) => (
          <StatusBadge
            value={row.original.isActive ? 'active' : 'inactive'}
            map={commonStatusMap}
          />
        ),
      },
      {
        id: 'actions',
        header: tc('actions.more'),
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex gap-1">
            <EditIconButton
              onClick={() => {
                setEditing(row.original)
                setFormOpen(true)
              }}
            />
            <DeleteIconButton
              onClick={async () => {
                if (
                  (await confirm({
                    title: t('deleteTitle', { name: row.original.name }),
                    description: t('roomDeleteDesc', {
                      defaultValue:
                        'Phòng đang có máy sẽ không xoá được — hãy tắt "Đang hoạt động".',
                    }),
                    destructive: true,
                  })) !== false
                )
                  remove.mutate(row.original.id)
              }}
            />
          </div>
        ),
      },
    ],
    [confirm, counts.data, departmentNames, remove, t, tc],
  )
  const activeFilters = [
    f.departmentId
      ? {
          key: 'departmentId',
          label: departmentNames.get(String(f.departmentId)) ?? String(f.departmentId),
          onRemove: () => table.setFilter('departmentId', undefined),
        }
      : null,
    roomType
      ? {
          key: 'roomType',
          label: enumLabel('roomType', roomType),
          onRemove: () => table.setFilter('roomType', undefined),
        }
      : null,
    f.isActive !== undefined
      ? {
          key: 'isActive',
          label: t(f.isActive === 'true' ? 'filter.active' : 'filter.inactive'),
          onRemove: () => table.setFilter('isActive', undefined),
        }
      : null,
  ].filter((filter): filter is NonNullable<typeof filter> => filter !== null)
  return (
    <>
      <PageHeader
        title={t('titles.rooms')}
        description={t('roomsHint', {
          defaultValue:
            'Vị trí vật lý đặt máy: phòng của từng Khoa/Phòng ban hoặc phòng dùng chung.',
        })}
        actions={
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              {tc('actions.import')}
            </Button>
            <Button
              onClick={() => {
                setEditing(undefined)
                setFormOpen(true)
              }}
            >
              {t('addRoom', { defaultValue: 'Thêm phòng' })}
            </Button>
          </>
        }
      />
      <FilterPanel
        storageKey="rooms"
        onReset={table.params.q || Object.keys(f).length ? table.reset : undefined}
        activeFilters={activeFilters}
        fields={
          <>
            <FilterPanelField label={t('filter.department')}>
              <AsyncSelect
                label={t('filter.department')}
                queryKey="departments"
                loadOptions={departmentOptions}
                value={f.departmentId ?? null}
                onChange={(value) =>
                  table.setFilter('departmentId', typeof value === 'string' ? value : undefined)
                }
                resolveOption={resolveDepartment}
                clearable
                showLabel={false}
              />
            </FilterPanelField>
            <FilterPanelField label={t('filter.roomType', { defaultValue: 'Loại phòng' })}>
              <Select
                value={roomType ?? 'all'}
                onValueChange={(value) =>
                  table.setFilter('roomType', value === 'all' ? undefined : value)
                }
              >
                <SelectTrigger
                  aria-label={t('filter.roomType', { defaultValue: 'Loại phòng' })}
                  className="w-full"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('filter.allRoomTypes', { defaultValue: 'Mọi loại' })}
                  </SelectItem>
                  {ROOM_TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {enumLabel('roomType', value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterPanelField>
            <FilterPanelField label={t('filter.status')}>
              <Select
                value={f.isActive ?? 'all'}
                onValueChange={(value) =>
                  table.setFilter('isActive', value === 'all' ? undefined : value)
                }
              >
                <SelectTrigger aria-label={t('filter.status')} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filter.allStatuses')}</SelectItem>
                  <SelectItem value="true">{t('filter.active')}</SelectItem>
                  <SelectItem value="false">{t('filter.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </FilterPanelField>
          </>
        }
        toolbar={
          <Input
            aria-label={t('search.roomLabel', { defaultValue: 'Tìm phòng' })}
            value={table.inputQ}
            onChange={(event) => table.setQ(event.target.value)}
            placeholder={t('search.placeholder')}
            className="h-9 w-56"
          />
        }
      >
        <DataTable
          tableId="rooms"
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
          toolbarRight={
            <Button variant="outline" onClick={() => void exportCatalog('rooms', params)}>
              {tc('actions.export')}
            </Button>
          }
        />
      </FilterPanel>
      <RoomDialog row={editing} open={formOpen} onOpenChange={setFormOpen} />
      <CatalogImportDialog slug="rooms" open={importOpen} onOpenChange={setImportOpen} />
      {dialog}
    </>
  )
}
