import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar, FilterField } from '@/components/filter-bar'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/status-badge'
import { commonStatusMap } from '@/lib/status-maps'
import { formatVnd } from '@/lib/format/money'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { messageFor } from '@/api/errors'
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
    isActive: f.isActive === undefined ? undefined : f.isActive === 'true',
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
        cell: ({ row }) => (
          <Link
            className="text-primary font-mono text-xs hover:underline"
            to={`/supplies/${row.original.id}`}
          >
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
  return (
    <>
      <PageHeader
        title={t('suppliesTitle')}
        description={t('suppliesHint', {
          defaultValue: 'Danh mục vật tư, hoá chất: mã, đơn vị, quy cách, theo dõi lô/hạn.',
        })}
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
        toolbarLeft={
          <FilterBar>
            <FilterField label={t('searchSupply')}>
              <Input
                aria-label={t('searchSupply')}
                value={table.inputQ}
                onChange={(e) => table.setQ(e.target.value)}
                placeholder={t('searchSupply')}
              />
            </FilterField>
          </FilterBar>
        }
      />
    </>
  )
}
