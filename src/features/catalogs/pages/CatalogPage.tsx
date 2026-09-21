import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
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
import { FilterBar, FilterField } from '@/components/filter-bar'
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
  const { t } = useTranslation('catalogs')
  const { t: tc } = useTranslation()
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
  const navigate = useNavigate()
  const remove = useMutation({
    mutationFn: (id: string) => deleteCatalog(slug, id),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['catalogs', slug] })
      toast.success(result.deactivated ? t('deactivated') : t('deleted'))
    },
    onError: (error) => toast.error(messageFor(error)),
  })
  const columns = useMemo<ColumnDef<CatalogRow>[]>(
    () => [
      {
        accessorKey: 'code',
        header: t('fields.code'),
        cell: ({ getValue }) => <code className="font-mono text-xs">{getValue<string>()}</code>,
      },
      {
        accessorKey: 'name',
        header: t('fields.name'),
        cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
      },
      ...config.fields.map((field) => ({
        accessorKey: field.name,
        header: t(`catalogFields.${slug}.${field.name}`),
        cell: ({ row }: { row: { original: CatalogRow } }) =>
          field.type === 'boolean'
            ? row.original[field.name]
              ? t('boolean.yes')
              : t('boolean.no')
            : String(row.original[field.name] ?? '—'),
      })),
      {
        accessorKey: 'isActive',
        header: t('fields.status'),
        cell: ({ row }) => (
          <StatusBadge
            value={row.original.isActive ? 'active' : 'inactive'}
            map={commonStatusMap}
          />
        ),
      },
      {
        id: 'actions',
        header: tc('actions.more'),
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
              {tc('actions.edit')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (
                  (await confirm({
                    title: t('deleteTitle', { name: row.original.name }),
                    description: t('deleteDesc'),
                    destructive: true,
                  })) !== false
                )
                  remove.mutate(row.original.id)
              }}
            >
              {tc('actions.delete')}
            </Button>
          </div>
        ),
      },
    ],
    [config.fields, confirm, remove, slug, t, tc],
  )
  return (
    <>
      <PageHeader
        title={t(`titles.${slug}`)}
        actions={
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              {tc('actions.import')}
            </Button>
            <Button
              onClick={() => {
                setEditing(undefined)
                setFormOpen(true)
              }}
            >
              {t('add')}
            </Button>
          </>
        }
      />
      <div className="mb-3 max-w-sm">
        <Select value={slug} onValueChange={(value) => navigate(`/admin/catalogs/${value}`)}>
          <SelectTrigger aria-label={t('filter.select')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {catalogSlugs.map((item) => (
              <SelectItem key={item} value={item}>
                {t(`titles.${item}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
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
          <FilterBar>
            <FilterField label={t('search.label')}>
              <Input
                aria-label={t('search.label')}
                value={table.inputQ}
                onChange={(event) => table.setQ(event.target.value)}
                placeholder={t('search.placeholder')}
              />
            </FilterField>
            <FilterField label={t('filter.status')}>
              <Select
                value={active ?? 'all'}
                onValueChange={(value) =>
                  table.setFilter('isActive', value === 'all' ? undefined : value)
                }
              >
                <SelectTrigger aria-label={t('filter.status')} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filter.allStatuses')}</SelectItem>
                  <SelectItem value="true">{t('filter.active')}</SelectItem>
                  <SelectItem value="false">{t('filter.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
          </FilterBar>
        }
        toolbarRight={
          <Button
            variant="outline"
            onClick={() => void exportCatalog(slug, { q: params.q, isActive: params.isActive })}
          >
            {tc('actions.export')}
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
