import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { MapPin } from 'lucide-react'
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
import { isApiError, messageFor } from '@/api/errors'
import { catalogOptions, resolveCatalogItem } from '@/api/references'
import { useStorageLocationLookup, useWarehouseNames } from '@/api/lookups'
import { deleteStorageLocation, listStorageLocations } from '../api'
import type { StorageLocation } from '../types'
import { StorageLocationDialog } from '../components/StorageLocationDialog'

export function Component() {
  const { t } = useTranslation('catalogs')
  const { t: tc } = useTranslation()
  const table = useServerTable({ filterKeys: ['warehouseId', 'isActive'] })
  const f = table.params.filters
  const params = {
    q: table.params.q || undefined,
    warehouseId: f.warehouseId,
    isActive: f.isActive === undefined ? undefined : f.isActive === 'true',
    page: table.params.page,
    limit: table.params.limit,
  }
  const list = useQuery({
    queryKey: ['storage-locations', params],
    queryFn: async () => {
      const result = await listStorageLocations(params)
      return Array.isArray(result) ? { items: result, total: result.length } : result
    },
    placeholderData: (previous) => previous,
  })
  const warehouseNames = useWarehouseNames()
  const locations = useStorageLocationLookup()
  const qc = useQueryClient()
  const [editing, setEditing] = useState<StorageLocation | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const { confirm, dialog } = useConfirm()
  const remove = useMutation({
    mutationFn: (id: string) => deleteStorageLocation(id),
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ['storage-locations'] })
      void qc.invalidateQueries({ queryKey: ['reference'] })
      toast.success(result.deactivated ? t('deactivated') : t('deleted'))
    },
    onError: (error) =>
      toast.error(
        isApiError(error) && error.code === 'STORAGE_LOCATION_IN_USE'
          ? t('storageLocations.inUse')
          : messageFor(error),
      ),
  })
  const columns = useMemo<ColumnDef<StorageLocation>[]>(
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
        id: 'warehouseId',
        header: t('storageLocations.fields.warehouseId'),
        cell: ({ row }) => warehouseNames.get(row.original.warehouseId) ?? row.original.warehouseId,
      },
      {
        accessorKey: 'zone',
        header: t('storageLocations.fields.zone'),
        cell: ({ getValue }) => getValue<string>() || '—',
      },
      {
        id: 'parentId',
        header: t('storageLocations.fields.parentId'),
        cell: ({ row }) => {
          const parent = row.original.parentId ? locations.get(row.original.parentId) : undefined
          if (!parent) return '—'
          return (
            <Badge variant="secondary" className="gap-1 font-normal">
              <MapPin className="size-3" aria-hidden />
              {parent.code}
            </Badge>
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
                    description: t('storageLocations.deleteDesc'),
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
    [confirm, locations, remove, t, tc, warehouseNames],
  )
  const activeFilters = [
    f.warehouseId
      ? {
          key: 'warehouseId',
          label: warehouseNames.get(String(f.warehouseId)) ?? String(f.warehouseId),
          onRemove: () => table.setFilter('warehouseId', undefined),
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
        title={t('storageLocations.title')}
        description={t('storageLocations.hint')}
        actions={
          <Button
            onClick={() => {
              setEditing(undefined)
              setFormOpen(true)
            }}
          >
            {t('storageLocations.add')}
          </Button>
        }
      />
      <FilterPanel
        storageKey="storage-locations"
        onReset={table.params.q || Object.keys(f).length ? table.reset : undefined}
        activeFilters={activeFilters}
        fields={
          <>
            <FilterPanelField label={t('storageLocations.fields.warehouseId')}>
              <AsyncSelect
                label={t('storageLocations.fields.warehouseId')}
                queryKey="warehouses"
                loadOptions={(q) => catalogOptions('warehouses', q)}
                resolveOption={(id) => resolveCatalogItem('warehouses', id)}
                value={f.warehouseId ?? null}
                onChange={(value) =>
                  table.setFilter('warehouseId', typeof value === 'string' ? value : undefined)
                }
                clearable
                showLabel={false}
              />
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
            aria-label={t('storageLocations.searchLabel')}
            value={table.inputQ}
            onChange={(event) => table.setQ(event.target.value)}
            placeholder={t('storageLocations.searchLabel')}
            className="h-9 w-56"
          />
        }
      >
        <DataTable
          tableId="storage-locations"
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
        />
      </FilterPanel>
      <StorageLocationDialog row={editing} open={formOpen} onOpenChange={setFormOpen} />
      {dialog}
    </>
  )
}
