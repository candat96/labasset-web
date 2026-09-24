import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, PowerOff } from 'lucide-react'
import { DataTable, useServerTable } from '@/components/data-table'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DatePicker } from '@/components/date-picker'
import { FilterBar, FilterField, FilterPreset } from '@/components/filter-bar'
import { MultiSelect } from '@/components/multi-select'
import { StatusBadge } from '@/components/status-badge'
import { AsyncSelect } from '@/components/form/async-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { faultSeverityMap, repairStatusMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { formatVnd } from '@/lib/format/money'
import { dayRangeToIso } from '@/lib/format/date-range'
import { departmentOptions, equipmentOptions, staffUserOptions } from '@/api/references'
import { useCan } from '@/app/guards/useCan'
import { ADM } from '@/routes/roles'
import { useAuthStore } from '@/stores/auth.store'
import { useDepartmentNames, useRepairs } from '../hooks'
import {
  REPAIR_SEVERITIES,
  REPAIR_STATUSES,
  type Repair,
  type RepairListParams,
  type RepairSeverity,
} from '../types'

const PRESETS = ['all', 'mine', 'new', 'overdue'] as const
type Preset = (typeof PRESETS)[number]

export function Component() {
  const { t } = useTranslation('repairs')
  const navigate = useNavigate()
  const me = useAuthStore((s) => s.user?.id)
  const canListUsers = useCan(ADM)
  const departmentName = useDepartmentNames()
  const table = useServerTable({
    filterKeys: [
      'status',
      'severity',
      'assigneeId',
      'departmentId',
      'equipmentId',
      'overdue',
      'from',
      'to',
      'preset',
    ],
  })
  const f = table.params.filters
  const preset = (f.preset ?? 'all') as Preset
  const range = dayRangeToIso(f.from, f.to)
  const params: RepairListParams = {
    page: table.params.page,
    limit: table.params.limit,
    q: table.params.q || undefined,
    status: f.status,
    severity: f.severity as RepairSeverity | undefined,
    assigneeId: f.assigneeId,
    departmentId: f.departmentId,
    equipmentId: f.equipmentId,
    overdue: f.overdue === 'true' ? true : undefined,
    from: range.from,
    to: range.to,
  }
  const list = useRepairs(params)
  const setPreset = (id: Preset) => {
    if (id === 'all')
      table.setFilters({
        preset: undefined,
        assigneeId: undefined,
        status: undefined,
        overdue: undefined,
      })
    else if (id === 'mine')
      table.setFilters({ preset: id, assigneeId: 'me', status: undefined, overdue: undefined })
    else if (id === 'new')
      table.setFilters({ preset: id, status: 'new', assigneeId: undefined, overdue: undefined })
    else table.setFilters({ preset: id, overdue: 'true', status: undefined, assigneeId: undefined })
  }
  const columns = useMemo<ColumnDef<Repair>[]>(
    () => [
      {
        accessorKey: 'code',
        header: t('columns.code'),
        cell: ({ row }) => (
          <Link
            className="text-primary font-mono text-xs hover:underline"
            to={`/repairs/${row.original.id}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      {
        id: 'equipment',
        header: t('columns.equipment'),
        meta: { label: t('columns.equipment'), className: 'max-w-[380px] whitespace-normal' },
        cell: ({ row }) =>
          row.original.equipment
            ? `${row.original.equipment.code} – ${row.original.equipment.name}`
            : row.original.equipmentId,
      },
      {
        accessorKey: 'reportedDepartmentId',
        header: t('columns.department'),
        cell: ({ row }) => departmentName(row.original.reportedDepartmentId),
      },
      {
        id: 'room',
        header: t('columns.room', { defaultValue: 'Phòng' }),
        cell: ({ row }) => row.original.room?.name ?? '—',
      },
      {
        accessorKey: 'severity',
        header: t('columns.severity'),
        cell: ({ row }) => <StatusBadge value={row.original.severity} map={faultSeverityMap} />,
      },
      {
        id: 'down',
        header: t('columns.equipmentDown'),
        cell: ({ row }) =>
          row.original.equipmentDown ? (
            <PowerOff
              className="text-destructive size-4"
              aria-label={t('columns.equipmentDownLabel')}
            />
          ) : null,
      },
      {
        accessorKey: 'status',
        header: t('columns.status'),
        cell: ({ row }) => <StatusBadge value={row.original.status} map={repairStatusMap} />,
      },
      {
        id: 'assignee',
        header: t('columns.assignee'),
        cell: ({ row }) => row.original.assignee?.fullName ?? '—',
      },
      {
        accessorKey: 'dueAt',
        header: t('columns.dueAt'),
        cell: ({ row }) => (
          <span className={row.original.isOverdue ? 'text-destructive font-medium' : undefined}>
            {formatDateTime(row.original.dueAt) || '—'}
            {row.original.isOverdue && (
              <StatusBadge
                value="overdue"
                map={{ overdue: { label: t('detail.overdue'), tone: 'danger' } }}
              />
            )}
          </span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: t('columns.createdAt'),
        cell: ({ getValue }) => formatDateTime(getValue<string>()),
      },
      {
        accessorKey: 'totalCost',
        header: t('columns.cost'),
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1">
            {formatVnd(row.original.totalCost) || '—'}
            {row.original.costWarning && (
              <AlertTriangle
                className="text-destructive size-4"
                aria-label={t('columns.warningLabel')}
              />
            )}
          </span>
        ),
      },
    ],
    [t, departmentName],
  )
  const selectedStatuses = (f.status ?? '').split(',').filter(Boolean)
  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('listHint', {
          defaultValue: 'Phiếu báo hỏng và sửa chữa máy; theo dõi phân công, SLA và chi phí.',
        })}
        actions={
          <Button asChild>
            <Link to="/repairs/new">{t('new')}</Link>
          </Button>
        }
      />
      <DataTable
        tableId="repairs"
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
        onRowClick={(row) => navigate(`/repairs/${row.id}`)}
        toolbarLeft={
          <FilterBar
            presets={PRESETS.map((item) => (
              <FilterPreset key={item} active={preset === item} onClick={() => setPreset(item)}>
                {t(`presets.${item}`)}
              </FilterPreset>
            ))}
            onClear={table.params.q || Object.keys(f).length ? table.reset : undefined}
          >
            <FilterField label={t('filters.q')}>
              <Input
                aria-label={t('filters.q')}
                placeholder={t('filters.qPlaceholder')}
                value={table.inputQ}
                onChange={(event) => table.setQ(event.target.value)}
              />
            </FilterField>
            <FilterField label={t('filters.status')}>
              <MultiSelect
                value={selectedStatuses}
                onChange={(next) =>
                  table.setFilter('status', next.length ? next.join(',') : undefined)
                }
                options={REPAIR_STATUSES.map((status) => ({
                  value: status,
                  label: repairStatusMap[status]?.label ?? status,
                }))}
                placeholder={t('filters.status')}
              />
            </FilterField>
            <FilterField label={t('filters.severity')}>
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
                  {REPAIR_SEVERITIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {faultSeverityMap[item]?.label ?? item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            {canListUsers && (
              <FilterField label={t('filters.assignee')}>
                <AsyncSelect
                  label={t('filters.assignee')}
                  queryKey="staff-users"
                  loadOptions={staffUserOptions}
                  value={f.assigneeId && f.assigneeId !== 'me' ? f.assigneeId : null}
                  onChange={(value) =>
                    table.setFilter('assigneeId', typeof value === 'string' ? value : undefined)
                  }
                  clearable
                  showLabel={false}
                />
              </FilterField>
            )}
            {me && (
              <FilterField label={t('filters.me')}>
                <Button
                  className="w-full"
                  type="button"
                  size="sm"
                  variant={f.assigneeId === 'me' ? 'default' : 'outline'}
                  onClick={() =>
                    table.setFilter('assigneeId', f.assigneeId === 'me' ? undefined : 'me')
                  }
                >
                  {t('filters.me')}
                </Button>
              </FilterField>
            )}
            <FilterField label={t('filters.department')}>
              <AsyncSelect
                label={t('filters.department')}
                queryKey="departments"
                loadOptions={departmentOptions}
                value={f.departmentId ?? null}
                onChange={(value) =>
                  table.setFilter('departmentId', typeof value === 'string' ? value : undefined)
                }
                clearable
                showLabel={false}
              />
            </FilterField>
            <FilterField label={t('filters.equipment')}>
              <AsyncSelect
                label={t('filters.equipment')}
                queryKey="equipment"
                loadOptions={equipmentOptions}
                value={f.equipmentId ?? null}
                onChange={(value) =>
                  table.setFilter('equipmentId', typeof value === 'string' ? value : undefined)
                }
                clearable
                showLabel={false}
              />
            </FilterField>
            <FilterField label={t('filters.from')}>
              <DatePicker
                ariaLabel={t('filters.from')}
                value={f.from ?? ''}
                onChange={(value) => table.setFilter('from', value)}
              />
            </FilterField>
            <FilterField label={t('filters.to')}>
              <DatePicker
                ariaLabel={t('filters.to')}
                value={f.to ?? ''}
                onChange={(value) => table.setFilter('to', value)}
              />
            </FilterField>
          </FilterBar>
        }
      />
    </>
  )
}
