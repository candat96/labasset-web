import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation('sys')
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
      toast.success(failed ? t('migration.partial', { failed }) : t('migration.success'))
    },
    onError: (error) => toast.error(messageFor(error)),
  })
  const columns: ColumnDef<MigrationStatus>[] = [
    { accessorKey: 'code', header: t('migration.columns.code') },
    {
      id: 'pending',
      header: t('migration.columns.pending'),
      cell: ({ row }) =>
        row.original.error
          ? row.original.error
          : row.original.pending?.length
            ? row.original.pending.join(', ')
            : t('migration.none'),
    },
  ]
  const rows = list.data ?? []
  const start = (table.params.page - 1) * table.params.limit
  return (
    <>
      {dialog}
      <PageHeader
        title={t('migration.title')}
        actions={
          <Button
            onClick={async () => {
              if ((await confirm({ title: t('migration.confirmRunAll') })) !== false) run.mutate()
            }}
          >
            {t('migration.runAll')}
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
