import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar, FilterField } from '@/components/filter-bar'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/status-badge'
import { equipmentStatusMap } from '@/lib/status-maps'
import { messageFor } from '@/api/errors'
import { printQrLabels } from '../api'
import { useEquipmentList } from '../hooks'
import type { Equipment } from '../types'

export function Component() {
  const { t } = useTranslation('equipment')
  const table = useServerTable()
  const list = useEquipmentList({
    page: table.params.page,
    limit: table.params.limit,
    q: table.params.q || undefined,
  })
  const [selected, setSelected] = useState<string[]>([])
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
            onCheckedChange={(value) =>
              setSelected((current) =>
                value === true
                  ? [...current, row.original.id]
                  : current.filter((id) => id !== row.original.id),
              )
            }
          />
        ),
      },
      {
        accessorKey: 'code',
        header: t('fields.code'),
        cell: ({ row }) => (
          <Link
            className="text-primary font-medium hover:text-primary/80"
            to={`/equipment/${row.original.id}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      {
        accessorKey: 'name',
        header: t('fields.name'),
        meta: { label: t('fields.name'), className: 'max-w-[420px] whitespace-normal' },
      },
      {
        accessorKey: 'status',
        header: t('fields.status'),
        cell: ({ row }) => <StatusBadge value={row.original.status} map={equipmentStatusMap} />,
      },
    ],
    [selected, t],
  )
  return (
    <>
      <PageHeader
        title={t('qrLabels.title')}
        description={t('qrLabels.description')}
        actions={
          <Button
            disabled={selected.length === 0}
            onClick={async () => {
              if (selected.length > 500) {
                toast.error(t('qrLabels.tooMany', { count: selected.length }))
                return
              }
              try {
                await printQrLabels(selected)
              } catch (error) {
                toast.error(messageFor(error))
              }
            }}
          >
            {t('qrLabels.print', { count: selected.length })}
          </Button>
        }
      />
      <DataTable
        tableId="qr-labels"
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
        isLoading={list.isPending}
        error={list.error}
        onRetry={() => void list.refetch()}
        getRowId={(row) => row.id}
        toolbarLeft={
          <FilterBar>
            <FilterField label={t('qrLabels.search')}>
              <Input
                aria-label={t('qrLabels.search')}
                value={table.inputQ}
                onChange={(event) => table.setQ(event.target.value)}
                placeholder={t('qrLabels.searchPlaceholder')}
              />
            </FilterField>
          </FilterBar>
        }
      />
    </>
  )
}
