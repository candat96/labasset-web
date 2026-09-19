import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, useServerTable } from '@/components/data-table'
import { PageHeader } from '@/components/page/PageHeader'
import { formatDateTime } from '@/lib/format/date'
import { listRecurring } from '../api'
import type { components } from '@/api/schema'

type Row = components['schemas']['RecurringResponseDto']

export function Component() {
  const table = useServerTable()
  const list = useQuery({
    queryKey: ['requests', 'recurring', table.params],
    queryFn: () => listRecurring({ page: table.params.page, limit: table.params.limit }),
  })
  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      { accessorKey: 'departmentId', header: 'Khoa' },
      { accessorKey: 'dayOfMonth', header: 'Ngày trong tháng' },
      { accessorKey: 'priority', header: 'Ưu tiên' },
      {
        accessorKey: 'lastGeneratedAt',
        header: 'Sinh lần cuối',
        cell: ({ getValue }) => formatDateTime(getValue<string | null>()),
      },
    ],
    [],
  )
  return (
    <>
      <PageHeader
        title="Phiếu định kỳ"
        description="Hệ thống tự tạo phiếu nháp lúc 05:30 ngày đã chọn"
      />
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
      />
    </>
  )
}
