import { enumLabel, receiptTypeLabels } from '@/lib/enum-labels'
import { shortId, useDepartmentLookup, useSupplierNames, useWarehouseNames } from '@/api/lookups'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterPanel, FilterPanelField } from '@/components/page/FilterPanel'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AsyncSelect } from '@/components/form/async-select'
import { DatePicker } from '@/components/date-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/status-badge'
import { qcStatusMap, stockDocStatusMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { formatVnd } from '@/lib/format/money'
import { dayRangeToIso } from '@/lib/format/date-range'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { catalogOptions } from '@/api/references'
import { listReceipts } from '../api'
import type { Receipt } from '../types'
import { useTranslation } from 'react-i18next'

export function Component() {
  const { t } = useTranslation('inventory')

  const canWrite = useCan(STAFF)
  const navigate = useNavigate()
  const table = useServerTable({
    filterKeys: ['status', 'type', 'warehouseId', 'qcStatus', 'from', 'to'],
  })
  const f = table.params.filters
  const params = {
    page: table.params.page,
    limit: table.params.limit,
    q: table.params.q || undefined,
    status: f.status,
    type: f.type,
    warehouseId: f.warehouseId,
    qcStatus: f.qcStatus,
    ...dayRangeToIso(f.from, f.to),
  }
  const list = useQuery({
    queryKey: ['stock', 'receipts', params],
    queryFn: () => listReceipts(params),
    placeholderData: (p) => p,
  })
  const warehouseNames = useWarehouseNames()
  const supplierNames = useSupplierNames()
  const departmentNames = useDepartmentLookup()
  const columns = useMemo<ColumnDef<Receipt>[]>(
    () => [
      {
        accessorKey: 'code',
        header: t('code'),
        meta: { label: t('code'), className: 'sticky left-0 z-[1] bg-card' },
        cell: ({ row }) => (
          <Link
            className="text-primary font-mono text-xs"
            to={`/stock/receipts/${row.original.id}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      {
        accessorKey: 'type',
        header: t('type'),
        cell: ({ row }) => enumLabel(receiptTypeLabels, row.original.type),
      },
      {
        id: 'supplier',
        header: t('supplier'),
        cell: ({ row }) => {
          const r = row.original as Receipt & {
            supplierId?: string | null
            fromDepartmentId?: string | null
          }
          if (r.supplierId) return supplierNames.get(r.supplierId) ?? shortId(r.supplierId)
          if (r.fromDepartmentId)
            return departmentNames.get(r.fromDepartmentId) ?? shortId(r.fromDepartmentId)
          return '—'
        },
      },
      {
        accessorKey: 'warehouseId',
        header: t('warehouse'),
        cell: ({ row }) =>
          warehouseNames.get(row.original.warehouseId) ?? shortId(row.original.warehouseId),
      },
      {
        id: 'lines',
        header: t('lineCount', { defaultValue: 'Số dòng' }),
        cell: ({ row }) => {
          const r = row.original as { items?: unknown[]; itemCount?: number }
          const n = r.itemCount ?? r.items?.length
          return n == null ? '—' : <span className="tabular-nums">{n}</span>
        },
      },
      {
        accessorKey: 'totalAmount',
        header: t('totalAmount'),
        cell: ({ getValue }) => formatVnd(getValue<string>()),
      },
      {
        accessorKey: 'qcStatus',
        header: 'QC',
        cell: ({ row }) =>
          row.original.qcStatus ? (
            <StatusBadge value={row.original.qcStatus} map={qcStatusMap} />
          ) : (
            '—'
          ),
      },
      {
        accessorKey: 'status',
        header: t('status'),
        cell: ({ row }) => <StatusBadge value={row.original.status} map={stockDocStatusMap} />,
      },
      {
        accessorKey: 'receivedAt',
        header: t('receivedAt'),
        cell: ({ getValue }) => formatDateTime(getValue<string | undefined>()),
      },
    ],
    [t, warehouseNames, supplierNames, departmentNames],
  )
  const activeFilters = [
    ...(f.status
      ? [
          {
            key: 'status',
            label: stockDocStatusMap[f.status]?.label ?? f.status,
            onRemove: () => table.setFilter('status', undefined),
          },
        ]
      : []),
    ...(f.type
      ? [
          {
            key: 'type',
            label: receiptTypeLabels[f.type] ?? f.type,
            onRemove: () => table.setFilter('type', undefined),
          },
        ]
      : []),
    ...(f.warehouseId
      ? [
          {
            key: 'warehouseId',
            label: warehouseNames.get(f.warehouseId) ?? shortId(f.warehouseId),
            onRemove: () => table.setFilter('warehouseId', undefined),
          },
        ]
      : []),
    ...(f.qcStatus
      ? [
          {
            key: 'qcStatus',
            label: qcStatusMap[f.qcStatus]?.label ?? f.qcStatus,
            onRemove: () => table.setFilter('qcStatus', undefined),
          },
        ]
      : []),
    ...(f.from
      ? [
          {
            key: 'from',
            label: f.from,
            onRemove: () => table.setFilter('from', undefined),
          },
        ]
      : []),
    ...(f.to ? [{ key: 'to', label: f.to, onRemove: () => table.setFilter('to', undefined) }] : []),
  ]
  return (
    <>
      <PageHeader
        title={t('receiptsTitle')}
        description={t('receiptsHint', {
          defaultValue: 'Phiếu nhập từ nhà cung cấp, khoa trả lại, điều chỉnh tăng.',
        })}
        actions={
          canWrite && (
            <Button asChild>
              <Link to="/stock/receipts/new">{t('createReceipt')}</Link>
            </Button>
          )
        }
      />
      <FilterPanel
        storageKey="stock-receipts"
        onReset={table.reset}
        activeFilters={activeFilters}
        fields={
          <>
            <FilterPanelField label={t('status')}>
              <Select
                value={f.status ?? '__all__'}
                onValueChange={(value) =>
                  table.setFilter('status', value === '__all__' ? undefined : value)
                }
              >
                <SelectTrigger aria-label={t('status')} className="w-full">
                  <SelectValue placeholder={t('status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">
                    {t('common:all', { defaultValue: 'Tất cả' })}
                  </SelectItem>
                  {Object.entries(stockDocStatusMap).map(([value, entry]) => (
                    <SelectItem key={value} value={value}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterPanelField>
            <FilterPanelField label={t('type')}>
              <Select
                value={f.type ?? '__all__'}
                onValueChange={(value) =>
                  table.setFilter('type', value === '__all__' ? undefined : value)
                }
              >
                <SelectTrigger aria-label={t('type')} className="w-full">
                  <SelectValue placeholder={t('type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">
                    {t('common:all', { defaultValue: 'Tất cả' })}
                  </SelectItem>
                  {Object.entries(receiptTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterPanelField>
            <FilterPanelField label={t('warehouse')}>
              <AsyncSelect
                label={t('warehouse')}
                queryKey="warehouses"
                loadOptions={(q) => catalogOptions('warehouses', q)}
                value={f.warehouseId ?? null}
                onChange={(value) =>
                  table.setFilter('warehouseId', typeof value === 'string' ? value : undefined)
                }
                clearable
                showLabel={false}
              />
            </FilterPanelField>
            <FilterPanelField label="QC">
              <Select
                value={f.qcStatus ?? '__all__'}
                onValueChange={(value) =>
                  table.setFilter('qcStatus', value === '__all__' ? undefined : value)
                }
              >
                <SelectTrigger aria-label="QC" className="w-full">
                  <SelectValue placeholder="QC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">
                    {t('common:all', { defaultValue: 'Tất cả' })}
                  </SelectItem>
                  {Object.entries(qcStatusMap).map(([value, entry]) => (
                    <SelectItem key={value} value={value}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterPanelField>
            <FilterPanelField label={t('fromDate', { defaultValue: 'Từ ngày' })}>
              <DatePicker
                ariaLabel={t('fromDate', { defaultValue: 'Từ ngày' })}
                value={f.from ?? ''}
                onChange={(value) => table.setFilter('from', value)}
              />
            </FilterPanelField>
            <FilterPanelField label={t('toDate', { defaultValue: 'Đến ngày' })}>
              <DatePicker
                ariaLabel={t('toDate', { defaultValue: 'Đến ngày' })}
                value={f.to ?? ''}
                onChange={(value) => table.setFilter('to', value)}
              />
            </FilterPanelField>
          </>
        }
        toolbar={
          <Input
            aria-label={t('searchReceipt')}
            placeholder={t('searchReceipt')}
            value={table.inputQ}
            onChange={(e) => table.setQ(e.target.value)}
            className="h-9 w-56"
          />
        }
      >
        <DataTable
          tableId="stock-receipts"
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
          onRowClick={(row) => navigate(`/stock/receipts/${row.id}`)}
        />
      </FilterPanel>
    </>
  )
}
