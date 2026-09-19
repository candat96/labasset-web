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
import { stockDocStatusMap } from '@/lib/status-maps'
import { FormDialog } from '@/components/form/FormDialog'
import { SelectField } from '@/components/form/fields'
import { QtyField } from '@/components/form/qty-field'
import { FormField, FormItem, FormMessage } from '@/components/ui/form'
import { AsyncSelect } from '@/components/form/async-select'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { applyServerErrors, messageFor } from '@/api/errors'
import { catalogOptions, departmentOptions, supplyOptions } from '@/api/references'
import { listIssues, postIssue, quickIssue } from '../api'
import type { Issue } from '../types'

export function Component() {
  const canWrite = useCan(STAFF)
  const navigate = useNavigate()
  const table = useServerTable({ filterKeys: ['status', 'type', 'warehouseId', 'from', 'to'] })
  const f = table.params.filters
  const params = {
    page: table.params.page,
    limit: table.params.limit,
    q: table.params.q || undefined,
    status: f.status,
    type: f.type,
  }
  const list = useQuery({
    queryKey: ['stock', 'issues', params],
    queryFn: () => listIssues(params),
    placeholderData: (p) => p,
  })
  const [quick, setQuick] = useState(false)
  const form = useForm({
    defaultValues: {
      type: 'to_department' as const,
      warehouseId: '',
      toDepartmentId: '',
      supplyId: '',
      quantity: '1',
    },
  })
  const columns = useMemo<ColumnDef<Issue>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã',
        cell: ({ row }) => (
          <Link
            className="text-primary font-mono text-xs hover:underline"
            to={`/stock/issues/${row.original.id}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      { accessorKey: 'type', header: 'Loại' },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => <StatusBadge value={row.original.status} map={stockDocStatusMap} />,
      },
      {
        id: 'fefo',
        header: 'FEFO',
        cell: ({ row }) => (row.original.fefoWarning ? '⚠' : ''),
      },
      {
        id: 'post',
        header: '',
        cell: ({ row }) =>
          canWrite && row.original.status === 'draft' ? (
            <Button
              size="sm"
              onClick={async (event) => {
                event.stopPropagation()
                try {
                  await postIssue(row.original.id)
                  toast.success('Đã ghi sổ')
                  void list.refetch()
                } catch (error) {
                  toast.error(messageFor(error))
                }
              }}
            >
              Ghi sổ
            </Button>
          ) : null,
      },
    ],
    [canWrite, list],
  )
  return (
    <>
      <PageHeader
        title="Phiếu xuất"
        actions={
          canWrite && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setQuick(true)}>
                Xuất nhanh
              </Button>
              <Button asChild>
                <Link to="/stock/issues/new">Tạo phiếu xuất</Link>
              </Button>
            </div>
          )
        }
      />
      <DataTable
        tableId="stock-issues"
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
        onRowClick={(row) => navigate(`/stock/issues/${row.id}`)}
        toolbarLeft={
          <Input
            aria-label="Tìm phiếu xuất"
            value={table.inputQ}
            onChange={(e) => table.setQ(e.target.value)}
          />
        }
      />
      <FormDialog
        open={quick}
        onOpenChange={setQuick}
        title="Xuất nhanh"
        form={form}
        onSubmit={async (values) => {
          try {
            const created = await quickIssue({
              type: values.type,
              warehouseId: values.warehouseId,
              toDepartmentId: values.toDepartmentId || undefined,
              items: [{ supplyId: values.supplyId, quantity: values.quantity, name: 'Vật tư' }],
            } as never)
            toast.success('Đã xuất')
            setQuick(false)
            navigate(`/stock/issues/${created.id}`)
          } catch (error) {
            if (!applyServerErrors(form, error)) toast.error(messageFor(error))
          }
        }}
      >
        <SelectField
          control={form.control}
          name="type"
          label="Loại"
          options={[{ value: 'to_department', label: 'Cấp cho khoa' }]}
        />
        <FormField
          control={form.control}
          name="warehouseId"
          render={({ field }) => (
            <FormItem>
              <AsyncSelect
                label="Kho"
                queryKey="warehouses"
                loadOptions={(q) => catalogOptions('warehouses', q)}
                value={field.value || null}
                onChange={(v) => field.onChange(typeof v === 'string' ? v : '')}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="toDepartmentId"
          render={({ field }) => (
            <FormItem>
              <AsyncSelect
                label="Khoa nhận"
                queryKey="departments"
                loadOptions={departmentOptions}
                value={field.value || null}
                onChange={(v) => field.onChange(typeof v === 'string' ? v : '')}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="supplyId"
          render={({ field }) => (
            <FormItem>
              <AsyncSelect
                label="Vật tư"
                queryKey="supplies"
                loadOptions={supplyOptions}
                value={field.value || null}
                onChange={(v) => field.onChange(typeof v === 'string' ? v : '')}
              />
              <FormMessage />
            </FormItem>
          )}
        />
        <QtyField control={form.control} name="quantity" label="Số lượng" />
      </FormDialog>
    </>
  )
}
