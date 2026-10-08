import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { DataTable, useServerTable } from '@/components/data-table'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatusBadge } from '@/components/status-badge'
import { AsyncSelect } from '@/components/form/async-select'
import { Archive, Eye, Pencil } from 'lucide-react'
import { FilterPanel, FilterPanelField } from '@/components/page/FilterPanel'
import { RowActions } from '@/components/page/RowActions'
import { ConfirmDialog } from '@/components/page/ConfirmDialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { faultSeverityMap, faultStatusMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { useCan } from '@/app/guards/useCan'
import { ADM, STAFF } from '@/routes/roles'
import { catalogOptions, resolveCatalogItem } from '@/api/references'
import { listFaultSuggestions } from '../api'
import { faultKeys, useArchiveFault, useFaults } from '../hooks'
import {
  FAULT_SEVERITIES,
  FAULT_STATUSES,
  type Fault,
  type FaultListParams,
  type FaultSeverity,
  type FaultStatus,
} from '../types'

/** Ô lọc gõ liên tục: giữ giá trị nháp rồi mới đẩy lên URL sau 300 ms. */
function DebouncedFilterInput({
  label,
  placeholder,
  value,
  onCommit,
}: {
  label: string
  placeholder?: string
  value: string | undefined
  onCommit: (value: string | undefined) => void
}) {
  const [draft, setDraft] = useState(value ?? '')
  useEffect(() => {
    setDraft(value ?? '')
  }, [value])
  useEffect(() => {
    if (draft === (value ?? '')) return
    const timer = setTimeout(() => onCommit(draft || undefined), 300)
    return () => clearTimeout(timer)
  }, [draft, value, onCommit])
  return (
    <Input
      aria-label={label}
      placeholder={placeholder}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
    />
  )
}

export function Component() {
  const { t } = useTranslation('faults')
  const canWrite = useCan(STAFF)
  const isAdm = useCan(ADM)
  const navigate = useNavigate()
  const table = useServerTable({
    filterKeys: ['model', 'manufacturerId', 'groupId', 'errorCode', 'severity', 'status', 'sort'],
  })
  const f = table.params.filters
  const sort = (f.sort ?? table.params.sort) as FaultListParams['sort']
  const params: FaultListParams = {
    page: table.params.page,
    limit: table.params.limit,
    q: table.params.q || undefined,
    model: f.model,
    manufacturerId: f.manufacturerId,
    groupId: f.groupId,
    errorCode: f.errorCode,
    severity: f.severity as FaultSeverity | undefined,
    status: f.status as FaultStatus | undefined,
    sort: sort === 'relevance' || sort === 'viewCount' || sort === 'updatedAt' ? sort : undefined,
  }
  const list = useFaults(params)
  const archive = useArchiveFault()
  const [toArchive, setToArchive] = useState<Fault | null>(null)

  // Chip bộ lọc đang áp, gỡ được từng cái.
  const activeFilters: Array<{ key: string; label: string; onRemove: () => void }> = []
  const addChip = (key: string, label: string) =>
    activeFilters.push({ key, label, onRemove: () => table.setFilter(key, undefined) })
  if (f.errorCode) addChip('errorCode', `${t('filters.errorCode')}: ${f.errorCode}`)
  if (f.model) addChip('model', `${t('filters.model')}: ${f.model}`)
  if (f.manufacturerId) addChip('manufacturerId', t('filters.manufacturer'))
  if (f.groupId) addChip('groupId', t('filters.group'))
  if (f.severity)
    addChip(
      'severity',
      `${t('filters.severity')}: ${faultSeverityMap[f.severity]?.label ?? f.severity}`,
    )
  if (f.status)
    addChip('status', `${t('filters.status')}: ${faultStatusMap[f.status]?.label ?? f.status}`)
  if (f.sort) addChip('sort', `${t('filters.sort')}: ${f.sort}`)

  const pending = useQuery({
    queryKey: [...faultKeys.suggestions, 'pending-count'],
    queryFn: () => listFaultSuggestions({ status: 'pending', page: 1, limit: 1 }),
    enabled: isAdm,
  })
  const columns = useMemo<ColumnDef<Fault>[]>(
    () => [
      {
        accessorKey: 'errorCode',
        header: t('columns.errorCode'),
        cell: ({ row }) => (
          <Link
            className="text-primary font-mono text-xs hover:underline"
            to={`/faults/${row.original.id}`}
          >
            {row.original.errorCode || '—'}
          </Link>
        ),
      },
      { accessorKey: 'title', header: t('columns.title') },
      {
        accessorKey: 'scope',
        header: t('columns.scope'),
        cell: ({ row }) => {
          const scope = row.original.scope
          const extra = scope === 'model' && row.original.model ? ` · ${row.original.model}` : ''
          return `${t(`scope.${scope}`)}${extra}`
        },
      },
      {
        accessorKey: 'severity',
        header: t('columns.severity'),
        cell: ({ row }) => <StatusBadge value={row.original.severity} map={faultSeverityMap} />,
      },
      {
        accessorKey: 'status',
        header: t('columns.status'),
        cell: ({ row }) => <StatusBadge value={row.original.status} map={faultStatusMap} />,
      },
      { accessorKey: 'viewCount', header: t('columns.viewCount') },
      {
        id: 'helpful',
        header: t('columns.helpful'),
        cell: ({ row }) => `👍 ${row.original.helpfulCount}`,
      },
      {
        accessorKey: 'version',
        header: t('columns.version'),
        cell: ({ row }) => `v${row.original.version}`,
      },
      {
        accessorKey: 'updatedAt',
        header: t('columns.updatedAt'),
        cell: ({ getValue }) => formatDateTime(getValue<string>()),
      },
      {
        // Sửa / xoá ngay trên dòng (bảng lỗi 2026-10-07, mục #28).
        id: 'actions',
        header: t('columns.actions', { defaultValue: 'Thao tác' }),
        enableHiding: false,
        enableSorting: false,
        meta: { label: t('columns.actions', { defaultValue: 'Thao tác' }), align: 'right' },
        cell: ({ row }) => (
          <RowActions
            items={[
              {
                key: 'open',
                label: t('actions.open', { defaultValue: 'Xem chi tiết' }),
                icon: <Eye aria-hidden />,
                to: `/faults/${row.original.id}`,
              },
              canWrite && {
                key: 'edit',
                label: t('common:actions.edit'),
                icon: <Pencil aria-hidden />,
                to: `/faults/${row.original.id}/edit`,
              },
              // API không xoá hẳn bản ghi lỗi (nó là tri thức đã dùng để chẩn
              // đoán) — thao tác tương ứng là lưu trữ.
              isAdm &&
                row.original.status !== 'archived' && {
                  key: 'archive',
                  label: t('actions.archive', { defaultValue: 'Lưu trữ' }),
                  icon: <Archive aria-hidden />,
                  variant: 'destructive' as const,
                  separator: true,
                  onClick: () => setToArchive(row.original),
                },
            ]}
            max={2}
          />
        ),
      },
    ],
    [t, canWrite, isAdm],
  )
  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('listHint', {
          defaultValue:
            'Kho tri thức lỗi theo model/nhóm máy: triệu chứng, nguyên nhân, cách xử lý.',
        })}
        actions={
          <div className="flex flex-wrap gap-2">
            {isAdm && (
              <Button variant="outline" asChild>
                <Link to="/faults/suggestions">
                  {pending.data?.total
                    ? t('suggestions.buttonCount', { n: pending.data.total })
                    : t('suggestions.button')}
                </Link>
              </Button>
            )}
            {canWrite && (
              <Button asChild>
                <Link to="/faults/new">{t('create')}</Link>
              </Button>
            )}
          </div>
        }
      />
      <FilterPanel
        storageKey="faults"
        activeFilters={activeFilters}
        onReset={table.params.q || Object.keys(f).length ? table.reset : undefined}
        toolbar={
          <Input
            className="w-72 max-w-full"
            aria-label={t('filters.q')}
            placeholder={t('filters.qPlaceholder')}
            value={table.inputQ}
            onChange={(event) => table.setQ(event.target.value)}
          />
        }
        fields={
          <>
            <FilterPanelField label={t('filters.errorCode')}>
              <DebouncedFilterInput
                label={t('filters.errorCode')}
                placeholder={t('filters.errorCode')}
                value={f.errorCode}
                onCommit={(value) => table.setFilter('errorCode', value)}
              />
            </FilterPanelField>
            <FilterPanelField label={t('filters.model')}>
              <DebouncedFilterInput
                label={t('filters.model')}
                placeholder={t('filters.model')}
                value={f.model}
                onCommit={(value) => table.setFilter('model', value)}
              />
            </FilterPanelField>
            <FilterPanelField label={t('filters.manufacturer')}>
              <AsyncSelect
                label={t('filters.manufacturer')}
                queryKey="manufacturers"
                loadOptions={(q) => catalogOptions('manufacturers', q)}
                resolveOption={(id) => resolveCatalogItem('manufacturers', id)}
                value={f.manufacturerId ?? null}
                onChange={(value) =>
                  table.setFilter('manufacturerId', typeof value === 'string' ? value : undefined)
                }
                clearable
                showLabel={false}
              />
            </FilterPanelField>
            <FilterPanelField label={t('filters.group')}>
              <AsyncSelect
                label={t('filters.group')}
                queryKey="equipment-groups"
                loadOptions={(q) => catalogOptions('equipment-groups', q)}
                resolveOption={(id) => resolveCatalogItem('equipment-groups', id)}
                value={f.groupId ?? null}
                onChange={(value) =>
                  table.setFilter('groupId', typeof value === 'string' ? value : undefined)
                }
                clearable
                showLabel={false}
              />
            </FilterPanelField>
            <FilterPanelField label={t('filters.severity')}>
              <Select
                value={f.severity ?? '__all__'}
                onValueChange={(value) =>
                  table.setFilter('severity', value === '__all__' ? undefined : value)
                }
              >
                <SelectTrigger aria-label={t('filters.severity')} className="w-full">
                  <SelectValue placeholder={t('filters.severity')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t('filters.allSeverities')}</SelectItem>
                  {FAULT_SEVERITIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {faultSeverityMap[item]?.label ?? item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterPanelField>
            <FilterPanelField label={t('filters.status')}>
              <Select
                value={f.status ?? '__all__'}
                onValueChange={(value) =>
                  table.setFilter('status', value === '__all__' ? undefined : value)
                }
              >
                <SelectTrigger aria-label={t('filters.status')} className="w-full">
                  <SelectValue placeholder={t('filters.status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t('filters.allStatuses')}</SelectItem>
                  {FAULT_STATUSES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {faultStatusMap[item]?.label ?? item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterPanelField>
            <FilterPanelField label={t('filters.sort')}>
              <Select
                value={sort ?? '__default__'}
                onValueChange={(value) =>
                  table.setFilter('sort', value === '__default__' ? undefined : value)
                }
              >
                <SelectTrigger aria-label={t('filters.sort')} className="w-full">
                  <SelectValue placeholder={t('filters.sort')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__default__">{t('filters.sortDefault')}</SelectItem>
                  <SelectItem value="relevance">{t('filters.sortRelevance')}</SelectItem>
                  <SelectItem value="viewCount">{t('filters.sortViewCount')}</SelectItem>
                  <SelectItem value="updatedAt">{t('filters.sortUpdatedAt')}</SelectItem>
                </SelectContent>
              </Select>
            </FilterPanelField>
          </>
        }
      >
        <DataTable
          tableId="faults"
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
          onRowClick={(row) => navigate(`/faults/${row.id}`)}
        />
      </FilterPanel>
      <ConfirmDialog
        open={!!toArchive}
        onOpenChange={(open) => !open && setToArchive(null)}
        title={t('archiveTitle', { defaultValue: 'Lưu trữ lỗi này?' })}
        description={toArchive?.title}
        destructive
        loading={archive.isPending}
        onConfirm={() => {
          if (toArchive) archive.mutate(toArchive.id, { onSuccess: () => setToArchive(null) })
        }}
      />
    </>
  )
}
