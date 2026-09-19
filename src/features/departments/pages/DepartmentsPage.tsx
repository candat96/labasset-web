import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Download, Loader2, Plus, Search, Upload } from 'lucide-react'
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
import { ConfirmDialog } from '@/components/page/ConfirmDialog'
import { useCan } from '@/app/guards/useCan'
import { ADM } from '@/routes/roles'
import { messageFor } from '@/api/errors'
import { useActiveUsers } from '@/features/users/hooks'
import { exportDepartments } from '../api'
import { buildColumns } from '../components/columns'
import { DepartmentFormDialog } from '../components/DepartmentFormDialog'
import { ImportDialog } from '../components/ImportDialog'
import { useDeleteDepartment, useDepartments } from '../hooks'
import type { Department } from '../types'

export function Component() {
  const { t } = useTranslation('departments')
  const { t: tc } = useTranslation()
  const canWrite = useCan(ADM)
  const table = useServerTable({ filterKeys: ['isActive'] })
  const isActive = table.params.filters.isActive
  const listParams = {
    page: table.params.page,
    limit: table.params.limit,
    ...(table.params.q ? { q: table.params.q } : {}),
    ...(isActive === 'true' || isActive === 'false' ? { isActive: isActive === 'true' } : {}),
  }
  const list = useDepartments(listParams)
  const users = useActiveUsers()
  const del = useDeleteDepartment()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [deleting, setDeleting] = useState<Department | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const usersById = useMemo(
    () => new Map((users.data ?? []).map((u) => [u.id, u.fullName])),
    [users.data],
  )
  const columns = useMemo(
    () =>
      buildColumns({
        t,
        tc,
        usersById,
        canWrite,
        onEdit: (d) => {
          setEditing(d)
          setFormOpen(true)
        },
        onDelete: setDeleting,
      }),
    [t, tc, usersById, canWrite],
  )

  const doExport = async () => {
    setExporting(true)
    try {
      await exportDepartments({ q: listParams.q, isActive: listParams.isActive })
    } catch (e) {
      toast.error(messageFor(e))
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={
          canWrite && (
            <>
              <Button variant="outline" onClick={() => setImportOpen(true)}>
                <Upload aria-hidden /> {tc('actions.import')}
              </Button>
              <Button
                onClick={() => {
                  setEditing(null)
                  setFormOpen(true)
                }}
              >
                <Plus aria-hidden /> {t('create')}
              </Button>
            </>
          )
        }
      />
      <DataTable
        tableId="departments"
        columns={columns}
        data={list.data?.items}
        total={list.data?.total ?? 0}
        params={table.params}
        onPageChange={table.setPage}
        onLimitChange={table.setLimit}
        isLoading={list.isPending}
        error={list.error}
        onRetry={() => void list.refetch()}
        emptyTitle={t('empty')}
        getRowId={(d) => d.id}
        toolbarLeft={
          <>
            <div className="relative">
              <Search
                className="text-muted-foreground absolute top-1/2 left-2 size-4 -translate-y-1/2"
                aria-hidden
              />
              <Input
                className="h-8 w-64 pl-8"
                placeholder={tc('actions.search')}
                aria-label={tc('actions.search')}
                value={table.inputQ}
                onChange={(e) => table.setQ(e.target.value)}
              />
            </div>
            <Select
              value={isActive ?? 'all'}
              onValueChange={(v) => table.setFilter('isActive', v === 'all' ? undefined : v)}
            >
              <SelectTrigger size="sm" className="w-36" aria-label={t('filter.status')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tc('status.all')}</SelectItem>
                <SelectItem value="true">{tc('status.active')}</SelectItem>
                <SelectItem value="false">{tc('status.inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        toolbarRight={
          <Button variant="outline" size="sm" onClick={() => void doExport()} disabled={exporting}>
            {exporting ? (
              <Loader2 className="animate-spin" aria-hidden />
            ) : (
              <Download aria-hidden />
            )}
            {tc('actions.export')}
          </Button>
        }
      />
      <DepartmentFormDialog open={formOpen} onOpenChange={setFormOpen} department={editing} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={t('deleteTitle', { name: deleting?.name ?? '' })}
        description={t('deleteDesc')}
        confirmLabel={tc('actions.delete')}
        destructive
        loading={del.isPending}
        onConfirm={() => {
          if (!deleting) return
          del.mutate(deleting.id, {
            onSuccess: () => setDeleting(null),
            onError: (e) => toast.error(messageFor(e)),
          })
        }}
      />
    </>
  )
}
