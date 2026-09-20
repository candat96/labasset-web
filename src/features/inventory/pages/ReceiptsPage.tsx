import { useCallback, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/status-badge'
import { qcStatusMap, stockDocStatusMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { formatVnd } from '@/lib/format/money'
import { dayRangeToIso } from '@/lib/format/date-range'
import { useCan } from '@/app/guards/useCan'
import { ADM, STAFF } from '@/routes/roles'
import { useConfirm } from '@/components/confirm-dialog'
import { messageFor } from '@/api/errors'
import { FilterBar, FilterField } from '@/components/filter-bar'
import { listReceipts, postReceipt } from '../api'
import type { Receipt } from '../types'
import { useTranslation } from 'react-i18next'

export function Component() {
  const { t } = useTranslation('inventory')

  const canWrite = useCan(STAFF)
  const isAdm = useCan(ADM)
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
  const qc = useQueryClient()
  const invalidate = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['stock', 'receipts'] })
    void qc.invalidateQueries({ queryKey: ['stock', 'balances'] })
    void qc.invalidateQueries({ queryKey: ['stock', 'lots'] })
  }, [qc])
  const list = useQuery({
    queryKey: ['stock', 'receipts', params],
    queryFn: () => listReceipts(params),
    placeholderData: (p) => p,
  })
  const { confirm, dialog } = useConfirm()
  const columns = useMemo<ColumnDef<Receipt>[]>(
    () => [
      {
        accessorKey: 'code',
        header: t('code'),
        cell: ({ row }) => (
          <Link
            className="text-primary font-mono text-xs hover:underline"
            to={`/stock/receipts/${row.original.id}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      { accessorKey: 'type', header: t('type') },
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
      {
        id: 'post',
        header: '',
        cell: ({ row }) =>
          canWrite &&
          row.original.status === 'draft' &&
          (row.original.type !== 'adjust_in' || isAdm) ? (
            <Button
              size="sm"
              onClick={async (event) => {
                event.stopPropagation()
                if ((await confirm({ title: t('postReceiptConfirm') })) === false) return
                try {
                  await postReceipt(row.original.id)
                  toast.success(t('posted'))
                  invalidate()
                } catch (error) {
                  toast.error(messageFor(error))
                }
              }}
            >
              {t('post')}
            </Button>
          ) : null,
      },
    ],
    [canWrite, isAdm, confirm, invalidate, t],
  )
  return (
    <>
      {dialog}
      <PageHeader
        title={t('receiptsTitle')}
        actions={
          canWrite && (
            <Button asChild>
              <Link to="/stock/receipts/new">{t('createReceipt')}</Link>
            </Button>
          )
        }
      />
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
        toolbarLeft={
          <FilterBar onClear={table.inputQ ? () => table.setQ('') : undefined}>
            <FilterField label={t('searchReceipt')}>
              <Input
                aria-label={t('searchReceipt')}
                placeholder={t('searchReceipt')}
                value={table.inputQ}
                onChange={(e) => table.setQ(e.target.value)}
              />
            </FilterField>
          </FilterBar>
        }
      />
    </>
  )
}
