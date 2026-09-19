import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/status-badge'
import { equipmentStatusMap } from '@/lib/status-maps'
import { messageFor } from '@/api/errors'
import { downloadQrLabels } from '../api'
import { useEquipmentList } from '../hooks'
import type { Equipment } from '../types'

export function Component() {
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
        cell: ({ row }) => (
          <Checkbox
            aria-label={`Chọn ${row.original.code}`}
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
        header: 'Mã',
        cell: ({ row }) => (
          <Link className="text-primary hover:underline" to={`/equipment/${row.original.id}`}>
            {row.original.code}
          </Link>
        ),
      },
      { accessorKey: 'name', header: 'Tên' },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => <StatusBadge value={row.original.status} map={equipmentStatusMap} />,
      },
    ],
    [selected],
  )
  return (
    <>
      <PageHeader
        title="Tem QR"
        description="Chọn máy rồi in tem PDF."
        actions={
          <Button
            disabled={selected.length === 0}
            onClick={async () => {
              try {
                await downloadQrLabels(selected)
              } catch (error) {
                toast.error(messageFor(error))
              }
            }}
          >
            In tem ({selected.length})
          </Button>
        }
      />
      <DataTable
        tableId="qr-labels"
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
        toolbarLeft={
          <Input
            aria-label="Tìm máy"
            className="w-64"
            value={table.inputQ}
            onChange={(event) => table.setQ(event.target.value)}
            placeholder="Mã, tên, serial"
          />
        }
      />
    </>
  )
}
