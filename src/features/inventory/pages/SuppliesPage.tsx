import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef, VisibilityState } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterPanel, FilterPanelField } from '@/components/page/FilterPanel'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { formatQty, trimDecimal } from '@/lib/format/number'
import { formatDate } from '@/lib/format/date'
import { useCatalogLookup } from '@/api/lookups'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { messageFor } from '@/api/errors'
import { catalogOptions } from '@/api/references'
import { asSupplyPage, exportSupplies, listSupplies } from '../api'
import type { Supply } from '../types'
import { expiryLevel } from '../expiry'
import { SupplyImportDialog } from '../components/SupplyImportDialog'
import { useTranslation } from 'react-i18next'

export function Component() {
  const { t } = useTranslation('inventory')

  const canWrite = useCan(STAFF)
  const [importOpen, setImportOpen] = useState(false)
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
  const groups = useCatalogLookup('supply-groups')
  const units = useCatalogLookup('units')
  const manufacturers = useCatalogLookup('manufacturers')
  const columns = useMemo<ColumnDef<Supply>[]>(() => {
    const nameOf = (map: Map<string, string>, id: string | null) => (id ? map.get(id) : undefined)
    const text = (value: string | null | undefined) => value || '—'
    const expiryBadge = (value: string | null | undefined) => {
      const status = expiryLevel(value)
      if (!status) return null
      return (
        <Badge
          variant={status.level === 'danger' ? 'danger' : 'warning'}
          dot
          data-tone={status.level}
        >
          {status.level === 'danger' ? t('expiredOn') : t('expiringSoon', { days: status.days })}
        </Badge>
      )
    }
    const dateCell = (value: string | null | undefined) =>
      value ? (
        <span className="inline-flex flex-wrap items-center gap-2">
          {formatDate(value)}
          {expiryBadge(value)}
        </span>
      ) : (
        '—'
      )
    return [
      {
        accessorKey: 'code',
        header: t('code'),
        enableHiding: false,
        meta: { label: t('code'), className: 'sticky left-0 z-[1] bg-card' },
        cell: ({ row }) => (
          <Link className="text-primary font-mono text-xs" to={`/supplies/${row.original.id}`}>
            {row.original.code}
          </Link>
        ),
      },
      { accessorKey: 'name', header: t('name'), enableHiding: false },
      {
        id: 'group',
        accessorFn: (row) => nameOf(groups, row.groupId) ?? '',
        header: t('group'),
        cell: ({ getValue }) => text(getValue<string>()),
      },
      {
        id: 'unit',
        accessorFn: (row) => nameOf(units, row.unitId) ?? '',
        header: t('unit'),
        cell: ({ getValue }) => text(getValue<string>()),
      },
      {
        accessorKey: 'packaging',
        header: t('packaging'),
        cell: ({ getValue }) => text(getValue<string | null>()),
      },
      {
        id: 'manufacturer',
        accessorFn: (row) => nameOf(manufacturers, row.manufacturerId) ?? '',
        header: t('manufacturer'),
        cell: ({ getValue }) => text(getValue<string>()),
      },
      {
        accessorKey: 'countryOfOrigin',
        header: t('countryOfOrigin'),
        cell: ({ getValue }) => text(getValue<string | null>()),
      },
      {
        id: 'circulationNumber',
        accessorFn: (row) => row.circulationNumber ?? '',
        header: t('circulationNumber'),
        cell: ({ row }) => (
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-nowrap">
              {row.original.circulationNumber || '—'}
            </span>
            {expiryBadge(row.original.circulationValidTo)}
          </span>
        ),
      },
      {
        accessorKey: 'circulationValidTo',
        header: t('circulationValidTo'),
        cell: ({ getValue }) => dateCell(getValue<string | null>()),
      },
      {
        accessorKey: 'riskClass',
        header: t('riskClass'),
        cell: ({ getValue }) => {
          const value = getValue<Supply['riskClass']>()
          return value ? t(`riskClass${value}`) : '—'
        },
      },
      {
        accessorKey: 'insuranceCode',
        header: t('insuranceCode'),
        cell: ({ getValue }) => text(getValue<string | null>()),
      },
      {
        accessorKey: 'insuranceRate',
        header: t('insuranceRate'),
        meta: { align: 'right' },
        cell: ({ getValue }) => {
          const value = getValue<string | null>()
          return value ? `${trimDecimal(value)}%` : '—'
        },
      },
      {
        accessorKey: 'insurancePrice',
        header: t('insurancePrice'),
        meta: { align: 'right' },
        cell: ({ getValue }) => formatVnd(getValue<string | null>()) || '—',
      },
      {
        accessorKey: 'bidPackage',
        header: t('bidPackage'),
        cell: ({ getValue }) => text(getValue<string | null>()),
      },
      {
        accessorKey: 'bidDecisionNo',
        header: t('bidDecisionNo'),
        cell: ({ getValue }) => text(getValue<string | null>()),
      },
      {
        accessorKey: 'bidPrice',
        header: t('bidPrice'),
        meta: { align: 'right' },
        cell: ({ getValue }) => formatVnd(getValue<string | null>()) || '—',
      },
      {
        accessorKey: 'bidValidTo',
        header: t('bidValidTo'),
        cell: ({ getValue }) => dateCell(getValue<string | null>()),
      },
      {
        id: 'purchaseUnit',
        accessorFn: (row) => nameOf(units, row.purchaseUnitId) ?? '',
        header: t('purchaseUnit'),
        cell: ({ getValue }) => text(getValue<string>()),
      },
      {
        accessorKey: 'conversionFactor',
        header: t('conversionFactor'),
        meta: { align: 'right' },
        cell: ({ getValue }) => {
          const value = getValue<string | null>()
          return value ? trimDecimal(value) : '—'
        },
      },
      {
        accessorKey: 'minStock',
        header: t('minStock'),
        meta: { align: 'right' },
        cell: ({ getValue }) => formatQty(getValue<string | null>()) || '—',
      },
      {
        accessorKey: 'maxStock',
        header: t('maxStock'),
        meta: { align: 'right' },
        cell: ({ getValue }) => formatQty(getValue<string | null>()) || '—',
      },
      {
        accessorKey: 'minShelfLifeDays',
        header: t('minShelfLifeDays'),
        meta: { align: 'right' },
        cell: ({ getValue }) => {
          const value = getValue<number | null>()
          return value == null ? '—' : `${value} ${t('days')}`
        },
      },
      {
        id: 'tracking',
        header: t('tracking'),
        cell: ({ row }) => {
          const flags = [
            row.original.trackLot ? t('lot') : null,
            row.original.trackExpiry ? t('expiry') : null,
            row.original.trackSerial ? t('serial') : null,
          ].filter((flag): flag is string => Boolean(flag))
          return flags.length ? flags.join(' · ') : '—'
        },
      },
      {
        accessorKey: 'refPrice',
        header: t('price'),
        meta: { align: 'right' },
        cell: ({ getValue }) => formatVnd(getValue<string | null>()) || '—',
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
    ]
  }, [t, groups, units, manufacturers])
  /**
   * Mặc định chỉ mở các cột kho cần liếc khi lướt danh sách (nhận diện, quy cách,
   * pháp lý lưu hành + cảnh báo hạn, tồn min/max, theo dõi lô/hạn/sê-ri, trạng thái).
   * Hồ sơ BHYT – thầu – quy đổi đầy đủ vẫn bật được qua nút "Cột" nhưng không bày hết.
   */
  const defaultHidden: VisibilityState = useMemo(
    () => ({
      manufacturer: false,
      countryOfOrigin: false,
      circulationValidTo: false,
      insuranceCode: false,
      insuranceRate: false,
      insurancePrice: false,
      bidPackage: false,
      bidDecisionNo: false,
      bidPrice: false,
      bidValidTo: false,
      purchaseUnit: false,
      conversionFactor: false,
      minShelfLifeDays: false,
      refPrice: false,
    }),
    [],
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
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  {t('importExcel')}
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
          initialVisibility={defaultHidden}
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
      <SupplyImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => void list.refetch()}
      />
    </>
  )
}
