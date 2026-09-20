import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar } from '@/components/filter-bar'
import { PageHeader } from '@/components/page/PageHeader'
import { formatDateTime } from '@/lib/format/date'
import { listRecurring } from '../api'
import type { components } from '@/api/schema'
import { useTranslation } from 'react-i18next'

type Row = components['schemas']['RecurringResponseDto']

export function Component() {
  const { t } = useTranslation('requests')

  const table = useServerTable()
  const list = useQuery({
    queryKey: ['requests', 'recurring', table.params],
    queryFn: () => listRecurring({ page: table.params.page, limit: table.params.limit }),
  })
  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      { accessorKey: 'departmentId', header: 'Khoa' },
      { accessorKey: 'dayOfMonth', header: t('dayOfMonth') },
      { accessorKey: 'priority', header: t('priority') },
      {
        accessorKey: 'lastGeneratedAt',
        header: t('lastGeneratedAt'),
        cell: ({ getValue }) => formatDateTime(getValue<string | null>()),
      },
    ],
    [t],
  )
  return (
    <>
      <PageHeader title={t('recurring')} description={t('recurringDesc')} />
      <DataTable
        tableId="recurring"
        columns={columns}
        data={list.data?.items}
        total={list.data?.total ?? 0}
        params={table.params}
        onPageChange={table.setPage}
        onLimitChange={table.setLimit}
        isLoading={list.isPending}
        error={list.error}
        onRetry={() => void list.refetch()}
        toolbarLeft={<FilterBar>{null}</FilterBar>}
      />
    </>
  )
}
