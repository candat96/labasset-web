import { enumLabel, requestTypeLabels } from '@/lib/enum-labels'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar, FilterField } from '@/components/filter-bar'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/status-badge'
import { requestStatusMap } from '@/lib/status-maps'
import { formatDate } from '@/lib/format/date'
import { dayRangeToIso } from '@/lib/format/date-range'
import { useCan } from '@/app/guards/useCan'
import { HEADS, STAFF } from '@/routes/roles'
import { useConfirm } from '@/components/confirm-dialog'
import { useAuthStore } from '@/stores/auth.store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/date-picker'
import { AsyncSelect } from '@/components/form/async-select'
import { departmentOptions } from '@/api/references'
import { messageFor } from '@/api/errors'
import { approveBulk, listRequests } from '../api'
import type { components } from '@/api/schema'
import { useTranslation } from 'react-i18next'

type Row = components['schemas']['RequestResponseDto']

export function Component() {
  const { t } = useTranslation('requests')

  const canStaff = useCan(STAFF)
  const canHead = useCan(HEADS)
  const userId = useAuthStore((state) => state.user?.id)
  const navigate = useNavigate()
  const table = useServerTable({
    filterKeys: [
      'status',
      'type',
      'departmentId',
      'priority',
      'requesterId',
      'from',
      'to',
      'pendingFor',
    ],
  })
  const f = table.params.filters
  const params = {
    page: table.params.page,
    limit: table.params.limit,
    q: table.params.q || undefined,
    status: f.status,
    type: f.type,
    pendingFor: f.pendingFor === 'me' ? 'me' : undefined,
    requesterId: f.requesterId === 'mine' ? userId : f.requesterId,
    priority: f.priority,
    departmentId: f.departmentId,
    ...dayRangeToIso(f.from, f.to),
  }
  const list = useQuery({
    queryKey: ['requests', params],
    queryFn: () => listRequests(params),
    placeholderData: (p) => p,
  })
  const qc = useQueryClient()
  const invalidateList = () => {
    void qc.invalidateQueries({ queryKey: ['requests'] })
  }
  const pending = useQuery({
    queryKey: ['requests', 'pending-count'],
    queryFn: () => listRequests({ pendingFor: 'me', page: 1, limit: 1 }),
    enabled: canHead,
  })
  const [selected, setSelected] = useState<string[]>([])
  const { confirm, dialog } = useConfirm()
  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: 'select',
        header: '',
        cell: ({ row }) => (
          <Checkbox
            aria-label={t('selectRequest', { code: row.original.code })}
            checked={selected.includes(row.original.id)}
            disabled={!['submitted', 'dept_approved'].includes(row.original.status)}
            onClick={(e) => e.stopPropagation()}
            onCheckedChange={(on) =>
              setSelected((curr) =>
                on === true
                  ? [...curr, row.original.id]
                  : curr.filter((id) => id !== row.original.id),
              )
            }
          />
        ),
      },
      {
        accessorKey: 'code',
        header: t('code'),
        cell: ({ row }) => (
          <Link
            className="text-primary font-mono text-xs hover:underline"
            to={`/requests/${row.original.id}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      {
        accessorKey: 'type',
        header: t('type'),
        cell: ({ row }) => enumLabel(requestTypeLabels, row.original.type),
      },
      { accessorKey: 'equipmentId', header: t('equipment') },
      { accessorKey: 'departmentName', header: 'Khoa' },
      { accessorKey: 'requesterName', header: t('requester') },
      {
        accessorKey: 'priority',
        header: t('priority'),
        cell: ({ row }) =>
          row.original.priority === 'urgent' ? (
            <StatusBadge value="urgent" map={{ urgent: { label: t('urgent'), tone: 'danger' } }} />
          ) : (
            t('normal')
          ),
      },
      {
        accessorKey: 'neededBy',
        header: t('neededBy'),
        cell: ({ row }) => (
          <span
            className={
              row.original.neededBy && row.original.neededBy < new Date().toISOString().slice(0, 10)
                ? 'text-destructive'
                : undefined
            }
          >
            {formatDate(row.original.neededBy)}
          </span>
        ),
      },
      {
        accessorKey: 'itemCount',
        header: t('itemCount'),
      },
      {
        accessorKey: 'createdAt',
        header: t('createdAt'),
        cell: ({ getValue }) => formatDate(getValue<string>()),
      },
      {
        accessorKey: 'status',
        header: t('status'),
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1">
            <StatusBadge value={row.original.status} map={requestStatusMap} />
            {(row.original.quotaExceeded || row.original.partiallyIssued) && '⚠'}
          </span>
        ),
      },
    ],
    [selected, t],
  )
  return (
    <>
      {dialog}
      <PageHeader
        title={t('title')}
        description={t('listHint', {
          defaultValue: 'Phiếu yêu cầu vật tư và sửa chữa từ các khoa; duyệt, cấp phát và nhận.',
        })}
        actions={
          <div className="flex gap-2">
            {canStaff && selected.length > 0 && (
              <Button
                variant="outline"
                onClick={async () => {
                  if (
                    (await confirm({
                      title: t('approveBulkConfirm', { count: selected.length }),
                    })) === false
                  )
                    return
                  try {
                    const result = await approveBulk(selected)
                    const response = result as {
                      approved?: unknown[]
                      skipped?: Array<{ code?: string; message?: string }>
                    }
                    toast.success(
                      t('approvedCount', { count: response.approved?.length ?? selected.length }),
                    )
                    if (response.skipped?.length) {
                      toast.warning(
                        response.skipped
                          .map((item) => `${item.code ?? '—'}: ${item.message ?? '—'}`)
                          .join('\n'),
                      )
                    }
                    setSelected([])
                    invalidateList()
                  } catch (error) {
                    toast.error(messageFor(error))
                  }
                }}
              >
                {t('bulkApprove')}
              </Button>
            )}
            <Button asChild>
              <Link to="/requests/new">{t('createRequest')}</Link>
            </Button>
          </div>
        }
      />
      <div className="mb-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={!f.pendingFor && !f.status ? 'default' : 'outline'}
          onClick={() =>
            table.setFilters({ pendingFor: undefined, status: undefined, requesterId: undefined })
          }
        >
          {t('all')}
        </Button>
        {canHead && (
          <Button
            size="sm"
            variant={f.pendingFor === 'me' ? 'default' : 'outline'}
            onClick={() => table.setFilters({ pendingFor: 'me', status: undefined })}
          >
            {t('pendingMine')}
            {pending.data?.total ? ` (${pending.data.total})` : ''}
          </Button>
        )}
        <Button
          size="sm"
          variant={f.requesterId === 'mine' ? 'default' : 'outline'}
          onClick={() => table.setFilters({ requesterId: 'mine', pendingFor: undefined })}
        >
          {t('mine')}
        </Button>
        <Button
          size="sm"
          variant={f.status === 'approved,partially_approved' ? 'default' : 'outline'}
          onClick={() => table.setFilter('status', 'approved,partially_approved')}
        >
          {t('awaitingIssue')}
        </Button>
        <Button
          size="sm"
          variant={f.status === 'issued' ? 'default' : 'outline'}
          onClick={() => table.setFilter('status', 'issued')}
        >
          {t('awaitingReceive')}
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link to="/requests/quotas">{t('quotas')}</Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link to="/requests/recurring">{t('recurring')}</Link>
        </Button>
      </div>
      <DataTable
        tableId="requests"
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
        onRowClick={(row) => navigate(`/requests/${row.id}`)}
        toolbarLeft={
          <FilterBar>
            <FilterField label={t('searchRequest')}>
              <Input
                aria-label={t('searchRequest')}
                value={table.inputQ}
                onChange={(e) => table.setQ(e.target.value)}
                placeholder={t('searchRequest')}
              />
            </FilterField>
            <FilterField label={t('status')}>
              <Select
                value={f.status ?? 'all'}
                onValueChange={(value) =>
                  table.setFilter('status', value === 'all' ? undefined : value)
                }
              >
                <SelectTrigger aria-label={t('status')} className="w-full">
                  <SelectValue placeholder={t('status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  {[
                    'draft',
                    'submitted',
                    'dept_approved',
                    'approved',
                    'partially_approved',
                    'issued',
                    'received',
                    'rejected',
                    'cancelled',
                  ].map((status) => (
                    <SelectItem key={status} value={status}>
                      {requestStatusMap[status]?.label ?? status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label={t('type')}>
              <Select
                value={f.type ?? 'all'}
                onValueChange={(value) =>
                  table.setFilter('type', value === 'all' ? undefined : value)
                }
              >
                <SelectTrigger aria-label={t('type')} className="w-full">
                  <SelectValue placeholder={t('type')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  <SelectItem value="supply">{t('typeSupply')}</SelectItem>
                  <SelectItem value="repair">{t('typeRepair')}</SelectItem>
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label={t('department')}>
              <AsyncSelect
                label={t('department')}
                queryKey="request-departments"
                loadOptions={departmentOptions}
                value={f.departmentId ?? null}
                onChange={(value) =>
                  table.setFilter('departmentId', typeof value === 'string' ? value : undefined)
                }
                clearable
              />
            </FilterField>
            <FilterField label={t('from')}>
              <DatePicker
                ariaLabel={t('from')}
                value={f.from}
                onChange={(value) => table.setFilter('from', value)}
              />
            </FilterField>
            <FilterField label={t('to')}>
              <DatePicker
                ariaLabel={t('to')}
                value={f.to}
                onChange={(value) => table.setFilter('to', value)}
              />
            </FilterField>
          </FilterBar>
        }
      />
    </>
  )
}
