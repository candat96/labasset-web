import { toast } from 'sonner'
import { messageFor } from '@/api/errors'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, useServerTable } from '@/components/data-table'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/confirm-dialog'
import { migrationsStatus, runAllMigrations, type MigrationStatus } from '../../hospitals/api'

export function Component() {
  const table = useServerTable()
  const list = useQuery({ queryKey: ['sys-migrations'], queryFn: migrationsStatus })
  const qc = useQueryClient()
  const { confirm, dialog } = useConfirm()
  const run = useMutation({
    mutationFn: runAllMigrations,
    onSuccess: (result) => {
      void qc.invalidateQueries({ queryKey: ['sys-migrations'] })
      void qc.invalidateQueries({ queryKey: ['sys-hospitals'] })
      const failed = result.filter((row) => !row.ok).length
      toast.success(failed ? `Xong, ${failed} viện lỗi` : 'Đã chạy migration tất cả viện')
    },
    onError: (error) => toast.error(messageFor(error)),
  })
  const columns: ColumnDef<MigrationStatus>[] = [
    { accessorKey: 'code', header: 'Mã viện' },
    {
      id: 'pending',
      header: 'Chờ chạy',
      cell: ({ row }) =>
        row.original.error
          ? row.original.error
          : row.original.pending?.length
            ? row.original.pending.join(', ')
            : 'Không',
    },
  ]
  const rows = list.data ?? []
  const start = (table.params.page - 1) * table.params.limit
  return (
    <>
      {dialog}
      <PageHeader
        title="Migration"
        actions={
          <Button
            onClick={async () => {
              if ((await confirm({ title: 'Chạy migration tất cả viện?' })) !== false) run.mutate()
            }}
          >
            Chạy tất cả
          </Button>
        }
      />
      <DataTable
        tableId="sys-migrations"
        columns={columns}
        data={rows.slice(start, start + table.params.limit)}
        total={rows.length}
        params={table.params}
        onPageChange={table.setPage}
        onLimitChange={table.setLimit}
        isLoading={list.isPending}
        error={list.error}
        onRetry={() => void list.refetch()}
        getRowId={(row) => row.id}
      />
    </>
  )
}
