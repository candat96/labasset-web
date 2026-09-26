import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar, FilterField } from '@/components/filter-bar'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/status-badge'
import { commonStatusMap } from '@/lib/status-maps'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { useTemplates } from '../hooks'
import type { Template } from '../types'
import { useTranslation } from 'react-i18next'

export function Component() {
  const { t } = useTranslation('maintenance')

  const canWrite = useCan(STAFF)
  const navigate = useNavigate()
  const table = useServerTable()
  const list = useTemplates()
  const q = table.params.q.toLowerCase()
  const items = (list.data ?? []).filter(
    (row) =>
      !q || row.name.toLowerCase().includes(q) || (row.model ?? '').toLowerCase().includes(q),
  )
  const columns = useMemo<ColumnDef<Template>[]>(
    () => [
      {
        accessorKey: 'name',
        header: t('name'),
        cell: ({ row }) => (
          <Link className="text-primary" to={`/maintenance/templates/${row.original.id}/edit`}>
            {row.original.name}
          </Link>
        ),
      },
      { accessorKey: 'model', header: 'Model' },
      {
        id: 'items',
        header: t('itemCount'),
        cell: ({ row }) => row.original.items.length,
      },
      { accessorKey: 'version', header: 'Version' },
      {
        accessorKey: 'isActive',
        header: t('status'),
        cell: ({ row }) => (
          <StatusBadge
            value={row.original.isActive ? 'active' : 'inactive'}
            map={commonStatusMap}
          />
        ),
      },
    ],
    [t],
  )
  return (
    <>
      <PageHeader
        title={t('templatesTitle')}
        description={t('templatesHint')}
        actions={
          canWrite && (
            <Button asChild>
              <Link to="/maintenance/templates/new">{t('createTemplate')}</Link>
            </Button>
          )
        }
      />
      <DataTable
        tableId="maint-templates"
        columns={columns}
        data={items}
        total={items.length}
        params={table.params}
        onPageChange={table.setPage}
        onLimitChange={table.setLimit}
        isLoading={list.isPending}
        error={list.error}
        onRetry={() => void list.refetch()}
        getRowId={(row) => row.id}
        onRowClick={(row) => navigate(`/maintenance/templates/${row.id}/edit`)}
        toolbarLeft={
          <FilterBar>
            <FilterField label={t('searchTemplate')}>
              <Input
                aria-label={t('searchTemplate')}
                value={table.inputQ}
                onChange={(e) => table.setQ(e.target.value)}
                placeholder={t('searchTemplate')}
              />
            </FilterField>
          </FilterBar>
        }
      />
    </>
  )
}
