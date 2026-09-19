import { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DataTable, useServerTable } from '@/components/data-table'
import { PageHeader } from '@/components/page/PageHeader'
import { StatusBadge } from '@/components/status-badge'
import { commonStatusMap } from '@/lib/status-maps'
import { useConfirm } from '@/components/confirm-dialog'
import { messageFor } from '@/api/errors'
import { catalogConfigs } from '../config'
import { deleteCatalog, exportCatalog, listCatalog } from '../api'
import { catalogSlugs, type CatalogRow, type CatalogSlug } from '../types'
import { CatalogFormDialog } from '../components/CatalogFormDialog'
import { CatalogImportDialog } from '../components/CatalogImportDialog'

export function Component() {
  const { name = '' } = useParams()
  if (!catalogSlugs.some((slug) => slug === name)) return <Navigate to="/404" replace />
  return <CatalogPage slug={name as CatalogSlug} />
}

export function CatalogPage({ slug }: { slug: CatalogSlug }) {
  const config = catalogConfigs[slug]
  const table = useServerTable({ filterKeys: ['isActive'] })
  const active = table.params.filters.isActive
  const params = {
    page: table.params.page,
    limit: table.params.limit,
    q: table.params.q || undefined,
    isActive: active === undefined ? undefined : active === 'true',
  }
  const list = useQuery({
    queryKey: ['catalogs', slug, params],
    queryFn: async () => {
      const result = await listCatalog(slug, params)
      return Array.isArray(result)
        ? { items: result, total: result.length, page: 1, limit: result.length }
        : result
    },
    placeholderData: (previous) => previous,
  })
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<CatalogRow | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const { confirm, dialog } = useConfirm()
  const remove = useMutation({
    mutationFn: (id: string) => deleteCatalog(slug, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalogs', slug] })
      toast.success('Đã xoá danh mục')
    },
    onError: (error) => toast.error(messageFor(error)),
  })
  const columns = useMemo<ColumnDef<CatalogRow>[]>(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã',
        cell: ({ getValue }) => <code className="font-mono text-xs">{getValue<string>()}</code>,
      },
      {
        accessorKey: 'name',
        header: 'Tên',
        cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
      },
      ...config.fields.map((field) => ({
        accessorKey: field.name,
        header: field.label,
        cell: ({ row }: { row: { original: CatalogRow } }) =>
          field.type === 'boolean'
            ? row.original[field.name]
              ? 'Có'
              : 'Không'
            : String(row.original[field.name] ?? '—'),
      })),
      {
        accessorKey: 'isActive',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <StatusBadge
            value={row.original.isActive ? 'active' : 'inactive'}
            map={commonStatusMap}
          />
        ),
      },
      {
        id: 'actions',
        header: 'Thao tác',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(row.original)
                setFormOpen(true)
              }}
            >
              Sửa
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (
                  (await confirm({
                    title: `Xoá ${row.original.name}?`,
                    description:
                      'Nếu danh mục đang được dùng, hệ thống sẽ yêu cầu ngưng hoạt động.',
                    destructive: true,
                  })) !== false
                )
                  remove.mutate(row.original.id)
              }}
            >
              Xoá
            </Button>
          </div>
        ),
      },
    ],
    [config.fields, confirm, remove],
  )
  return (
    <>
      <PageHeader
        title={config.title}
        actions={
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              Nhập Excel
            </Button>
            <Button
              onClick={() => {
                setEditing(undefined)
                setFormOpen(true)
              }}
            >
              Thêm mới
            </Button>
          </>
        }
      />
      <DataTable
        tableId={`catalog-${slug}`}
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
          <>
            <Input
              aria-label="Tìm danh mục"
              value={table.inputQ}
              onChange={(event) => table.setQ(event.target.value)}
              placeholder="Tìm mã hoặc tên"
              className="w-64"
            />
            <Select
              value={active ?? 'all'}
              onValueChange={(value) =>
                table.setFilter('isActive', value === 'all' ? undefined : value)
              }
            >
              <SelectTrigger aria-label="Lọc trạng thái">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Mọi trạng thái</SelectItem>
                <SelectItem value="true">Hoạt động</SelectItem>
                <SelectItem value="false">Ngưng hoạt động</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        toolbarRight={
          <Button
            variant="outline"
            onClick={() => void exportCatalog(slug, { q: params.q, isActive: params.isActive })}
          >
            Xuất Excel
          </Button>
        }
      />
      <CatalogFormDialog
        slug={slug}
        config={config}
        row={editing}
        open={formOpen}
        onOpenChange={setFormOpen}
      />
      <CatalogImportDialog slug={slug} open={importOpen} onOpenChange={setImportOpen} />
      {dialog}
    </>
  )
}
