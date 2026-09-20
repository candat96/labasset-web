import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { messageFor } from '@/api/errors'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, useServerTable } from '@/components/data-table'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/status-badge'
import { commonStatusMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { useConfirm } from '@/components/confirm-dialog'
import { api, unwrap } from '@/api/client'
import { pageQuery } from '@/api/paths'
import type { components } from '@/api/schema'

type JobRun = components['schemas']['JobRunViewDto']

export function Component() {
  const { t } = useTranslation('sys')
  const table = useServerTable()
  const list = useQuery({
    queryKey: ['sys-jobs', table.params.page, table.params.limit],
    queryFn: () =>
      unwrap(
        api.GET('/sys/jobs', {
          params: { query: pageQuery({ page: table.params.page, limit: table.params.limit }) },
        }),
      ),
    placeholderData: (previous) => previous,
  })
  const qc = useQueryClient()
  const { confirm, dialog } = useConfirm()
  const run = useMutation({
    mutationFn: (name: string) =>
      unwrap(api.POST('/sys/jobs/{name}/run', { params: { path: { name } } })),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sys-jobs'] })
      toast.success(t('job.ran'))
    },
    onError: (error) => toast.error(messageFor(error)),
  })
  const columns: ColumnDef<JobRun>[] = [
    { accessorKey: 'name', header: t('job.columns.name') },
    {
      accessorKey: 'status',
      header: t('job.columns.status'),
      cell: ({ row }) => <StatusBadge value={row.original.status} map={commonStatusMap} />,
    },
    {
      accessorKey: 'startedAt',
      header: t('job.columns.startedAt'),
      cell: ({ getValue }) => formatDateTime(getValue<string>()),
    },
    {
      accessorKey: 'finishedAt',
      header: t('job.columns.finishedAt'),
      cell: ({ getValue }) => formatDateTime(getValue<string | null>()) || '—',
    },
    {
      accessorKey: 'error',
      header: t('job.columns.result'),
      cell: ({ row }) => row.original.error ?? (row.original.status === 'success' ? 'OK' : '—'),
    },
  ]
  return (
    <>
      {dialog}
      <PageHeader title={t('job.title')} />
      <div className="mb-4 flex flex-wrap gap-2">
        {(list.data?.jobs ?? []).map((name) => (
          <Button
            key={name}
            variant="outline"
            disabled={list.data?.running.includes(name) || run.isPending}
            onClick={async () => {
              if ((await confirm({ title: t('job.confirmRun', { name }) })) !== false)
                run.mutate(name)
            }}
          >
            {t('job.run', { name })}
          </Button>
        ))}
      </div>
      <DataTable
        tableId="sys-jobs"
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
    </>
  )
}
