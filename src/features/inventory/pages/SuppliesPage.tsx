import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterPanel, FilterPanelField } from '@/components/page/FilterPanel'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AsyncSelect } from '@/components/form/async-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/status-badge'
import { commonStatusMap } from '@/lib/status-maps'
import { formatVnd } from '@/lib/format/money'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { messageFor } from '@/api/errors'
import { catalogOptions } from '@/api/references'
import {
  asSupplyPage,
  downloadSupplyTemplate,
  exportSupplies,
  importSupplies,
  listSupplies,
} from '../api'
import type { Supply } from '../types'
import { useTranslation } from 'react-i18next'

export function Component() {
  const { t } = useTranslation('inventory')

  const canWrite = useCan(STAFF)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const table = useServerTable({
    filterKeys: ['groupId', 'manufacturerId', 'isActive', 'trackLot'],
  })
  const f = table.params.filters
  const params = {
    page: table.params.page,
    limit: table.params.limit,
    q: table.params.q || undefined,
    groupId: f.groupId,
    manufacturerId: f.manufacturerId,
    isActive: f.isActive === undefined ? undefined : f.isActive === 'true',
    trackLot: f.trackLot === undefined ? undefined : f.trackLot === 'true',
  }
  const list = useQuery({
    queryKey: ['supplies', params],
    queryFn: async () => asSupplyPage(await listSupplies(params)),
    placeholderData: (p) => p,
  })
  const columns = useMemo<ColumnDef<Supply>[]>(
    () => [
      {
        accessorKey: 'code',
        header: t('code'),
        meta: { label: t('code'), className: 'sticky left-0 z-[1] bg-card' },
        cell: ({ row }) => (
          <Link className="text-primary font-mono text-xs" to={`/supplies/${row.original.id}`}>
            {row.original.code}
          </Link>
        ),
      },
      { accessorKey: 'name', header: t('name') },
      {
        accessorKey: 'trackLot',
        header: t('trackLot'),
        cell: ({ row }) => (row.original.trackLot ? t('lot') : '—'),
      },
      {
        accessorKey: 'minStock',
        header: t('minStock'),
      },
      {
        accessorKey: 'refPrice',
        header: t('price'),
        cell: ({ getValue }) => formatVnd(getValue<string | null>()),
      },
      {
        accessorKey: 'isActive',
        header: t('status'),
        cell: ({ row }) => (
          <StatusBadge
            value={row.original.isActive ? 'active' : 'inactive'}
            map={commonStatusMap}
          />
        ),
      },
    ],
    [t],
  )
  const activeFilters = [
    ...(f.groupId
      ? [
          {
            key: 'groupId',
            label: t('group'),
            onRemove: () => table.setFilter('groupId', undefined),
          },
        ]
      : []),
    ...(f.manufacturerId
      ? [
          {
            key: 'manufacturerId',
            label: t('manufacturer'),
            onRemove: () => table.setFilter('manufacturerId', undefined),
          },
        ]
      : []),
    ...(f.isActive !== undefined
      ? [
          {
            key: 'isActive',
            label: commonStatusMap[f.isActive === 'true' ? 'active' : 'inactive']?.label ?? '',
            onRemove: () => table.setFilter('isActive', undefined),
          },
        ]
      : []),
    ...(f.trackLot !== undefined
      ? [
          {
            key: 'trackLot',
            label: t('trackLot'),
            onRemove: () => table.setFilter('trackLot', undefined),
          },
        ]
      : []),
  ]
  return (
    <>
      <PageHeader
        title={t('suppliesTitle')}
        description={t('suppliesHint')}
        actions={
          <div className="flex gap-2">
            {canWrite && (
              <>
                <input
                  ref={fileRef}
                  className="hidden"
                  type="file"
                  accept=".xlsx"
                  aria-label={t('importExcel')}
                  onChange={async (event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ''
                    if (!file) return
                    setImporting(true)
                    try {
                      const result = await importSupplies(file)
                      toast.success(
                        t('importResult', { created: result.created, updated: result.updated }),
                      )
                      void list.refetch()
                    } catch (error) {
                      toast.error(messageFor(error))
                    } finally {
                      setImporting(false)
                    }
                  }}
                />
                <Button
                  variant="outline"
                  onClick={() => downloadSupplyTemplate().catch((e) => toast.error(messageFor(e)))}
                >
                  {t('downloadTemplate')}
                </Button>
                <Button
                  variant="outline"
                  disabled={importing}
                  onClick={() => fileRef.current?.click()}
                >
                  {importing ? t('importing') : t('importExcel')}
                </Button>
              </>
            )}
            <Button
              variant="outline"
              onClick={() => exportSupplies().catch((e) => toast.error(messageFor(e)))}
            >
              {t('exportExcel')}
            </Button>
            {canWrite && (
              <Button asChild>
                <Link to="/supplies/new">{t('createSupply')}</Link>
              </Button>
            )}
          </div>
        }
      />
      <FilterPanel
        storageKey="supplies"
        onReset={table.reset}
        activeFilters={activeFilters}
        fields={
          <>
            <FilterPanelField label={t('group')}>
              <AsyncSelect
                label={t('group')}
                queryKey="supply-groups"
                loadOptions={(q) => catalogOptions('supply-groups', q)}
                value={f.groupId ?? null}
                onChange={(value) =>
                  table.setFilter('groupId', typeof value === 'string' ? value : undefined)
                }
                clearable
                showLabel={false}
              />
            </FilterPanelField>
            <FilterPanelField label={t('manufacturer')}>
              <AsyncSelect
                label={t('manufacturer')}
                queryKey="manufacturers"
                loadOptions={(q) => catalogOptions('manufacturers', q)}
                value={f.manufacturerId ?? null}
                onChange={(value) =>
                  table.setFilter('manufacturerId', typeof value === 'string' ? value : undefined)
                }
                clearable
                showLabel={false}
              />
            </FilterPanelField>
            <FilterPanelField label={t('status')}>
              <Select
                value={f.isActive ?? '__all__'}
                onValueChange={(value) =>
                  table.setFilter('isActive', value === '__all__' ? undefined : value)
                }
              >
                <SelectTrigger aria-label={t('status')} className="w-full">
                  <SelectValue placeholder={t('status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t('common:all')}</SelectItem>
                  <SelectItem value="true">{commonStatusMap.active?.label}</SelectItem>
                  <SelectItem value="false">{commonStatusMap.inactive?.label}</SelectItem>
                </SelectContent>
              </Select>
            </FilterPanelField>
            <FilterPanelField label={t('trackLot')}>
              <Select
                value={f.trackLot ?? '__all__'}
                onValueChange={(value) =>
                  table.setFilter('trackLot', value === '__all__' ? undefined : value)
                }
              >
                <SelectTrigger aria-label={t('trackLot')} className="w-full">
                  <SelectValue placeholder={t('trackLot')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t('common:all')}</SelectItem>
                  <SelectItem value="true">{t('yes')}</SelectItem>
                  <SelectItem value="false">{t('no')}</SelectItem>
                </SelectContent>
              </Select>
            </FilterPanelField>
          </>
        }
        toolbar={
          <Input
            aria-label={t('searchSupply')}
            value={table.inputQ}
            onChange={(e) => table.setQ(e.target.value)}
            placeholder={t('searchSupply')}
            className="h-9 w-56"
          />
        }
      >
        <DataTable
          tableId="supplies"
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
          onRowClick={(row) => navigate(`/supplies/${row.id}`)}
        />
      </FilterPanel>
    </>
  )
}
