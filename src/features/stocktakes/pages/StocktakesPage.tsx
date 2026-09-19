import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/status-badge'
import { stocktakeStatusMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { FormDialog } from '@/components/form/FormDialog'
import { TextField, SelectField } from '@/components/form/fields'
import { DateField } from '@/components/form/date-field'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { applyServerErrors, messageFor } from '@/api/errors'
import { createStocktake, listStocktakes } from '../api'
import type { components } from '@/api/schema'

type Row = components['schemas']['StocktakeSessionResponseDto']

export function Component() {
  const canWrite = useCan(STAFF)
  const navigate = useNavigate()
  const table = useServerTable({ filterKeys: ['status', 'type', 'from', 'to'] })
  const f = table.params.filters
  const list = useQuery({
    queryKey: ['stocktakes', table.params],
    queryFn: () =>
      listStocktakes({
        page: table.params.page,
        limit: table.params.limit,
        status: f.status,
        type: f.type,
        from: f.from,
        to: f.to,
      }),
    placeholderData: (p) => p,
  })
  const [open, setOpen] = useState(false)
  const form = useForm({
    defaultValues: {
      name: '',
      type: 'supply' as const,
      scopeType: 'all' as const,
      notes: '',
      plannedAt: '',
    },
  })
  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã',
        cell: ({ row }) => (
          <Link
            className="text-primary font-mono text-xs hover:underline"
            to={`/stocktakes/${row.original.id}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      { accessorKey: 'name', header: 'Tên' },
      { accessorKey: 'type', header: 'Loại' },
      { accessorKey: 'scopeType', header: 'Phạm vi' },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => <StatusBadge value={row.original.status} map={stocktakeStatusMap} />,
      },
      {
        accessorKey: 'plannedAt',
        header: 'Kế hoạch',
        cell: ({ getValue }) => formatDateTime(getValue<string | null>()),
      },
    ],
    [],
  )
  return (
    <>
      <PageHeader
        title="Kiểm kê"
        actions={canWrite && <Button onClick={() => setOpen(true)}>Tạo đợt</Button>}
      />
      <DataTable
        tableId="stocktakes"
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
        onRowClick={(row) => navigate(`/stocktakes/${row.id}`)}
        toolbarLeft={
          <Input
            aria-label="Tìm đợt"
            value={table.inputQ}
            onChange={(e) => table.setQ(e.target.value)}
          />
        }
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Tạo đợt kiểm kê"
        form={form}
        onSubmit={async (values) => {
          try {
            const created = await createStocktake({
              name: values.name,
              type: values.type,
              scopeType: values.scopeType,
              notes: values.notes || undefined,
              plannedAt: values.plannedAt || undefined,
            } as never)
            toast.success('Đã tạo đợt')
            setOpen(false)
            navigate(`/stocktakes/${created.id}`)
          } catch (error) {
            if (!applyServerErrors(form, error)) toast.error(messageFor(error))
          }
        }}
      >
        <TextField control={form.control} name="name" label="Tên" />
        <SelectField
          control={form.control}
          name="type"
          label="Loại"
          options={[
            { value: 'supply', label: 'Vật tư' },
            { value: 'equipment', label: 'Thiết bị' },
          ]}
        />
        <SelectField
          control={form.control}
          name="scopeType"
          label="Phạm vi"
          options={[
            { value: 'all', label: 'Toàn viện' },
            { value: 'department', label: 'Khoa' },
            { value: 'warehouse', label: 'Kho' },
          ]}
        />
        <DateField control={form.control} name="plannedAt" label="Kế hoạch" />
      </FormDialog>
    </>
  )
}
