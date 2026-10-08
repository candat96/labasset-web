import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { ArrowLeft, Check, Eye, X } from 'lucide-react'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar, FilterField } from '@/components/filter-bar'
import { PageHeader } from '@/components/page/PageHeader'
import { RowActions } from '@/components/page/RowActions'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/status-badge'
import { AsyncSelect } from '@/components/form/async-select'
import { AttachmentsPanel } from '@/components/attachments-panel'
import { transferStatusMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { useCan } from '@/app/guards/useCan'
import { ADM } from '@/routes/roles'
import { useConfirm } from '@/components/confirm-dialog'
import { departmentOptions, resolveDepartment } from '@/api/references'
import { useRoomLookup } from '@/api/lookups'
import { messageFor } from '@/api/errors'
import { approveTransfer, cancelTransfer, listAllTransfers, rejectTransfer } from '../api'
import { transferKeys } from '../hooks'
import { shortId, useDepartmentNames, useEquipmentNames, useUserNames } from '../components/lookups'
import { useAuthStore } from '@/stores/auth.store'
import type { Transfer } from '../types'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

const statuses = ['pending', 'approved', 'rejected', 'cancelled'] as const

export function Component() {
  const { t } = useTranslation('equipment')
  const isAdm = useCan(ADM)
  const userId = useAuthStore((s) => s.user?.id)
  const table = useServerTable({ filterKeys: ['status', 'departmentId'] })
  const status = statuses.find((s) => s === table.params.filters.status)
  const departmentId = table.params.filters.departmentId
  const list = useQuery({
    queryKey: transferKeys.list({
      page: table.params.page,
      limit: table.params.limit,
      status,
      departmentId,
    }),
    queryFn: () => listAllTransfers({ page: table.params.page, limit: table.params.limit, status }),
    placeholderData: (p) => p,
  })
  const equipmentNames = useEquipmentNames()
  const departmentNames = useDepartmentNames()
  const userNames = useUserNames(isAdm)
  const roomNames = useRoomLookup()
  const roomName = (id: string | null) => (id ? (roomNames.get(id)?.name ?? shortId(id)) : '—')
  const [row, setRow] = useState<Transfer | null>(null)
  const qc = useQueryClient()
  const { confirm, dialog } = useConfirm()
  const invalidate = (transfer: Transfer) => {
    void qc.invalidateQueries({ queryKey: transferKeys.all })
    void qc.invalidateQueries({ queryKey: ['equipment', 'detail', transfer.equipmentId] })
    void qc.invalidateQueries({ queryKey: ['equipment', 'list'] })
  }
  const equipmentName = (id: string) => equipmentNames.get(id) ?? shortId(id)
  const departmentName = (id: string | null) =>
    id ? (departmentNames.get(id) ?? shortId(id)) : '—'
  const userName = (id: string | null) => (id ? (userNames.get(id) ?? shortId(id)) : '—')
  const approve = async (transfer: Transfer) => {
    try {
      await approveTransfer(transfer.equipmentId, transfer.id)
      toast.success(t('transfers.approved'))
      invalidate(transfer)
      setRow(null)
    } catch (e) {
      toast.error(messageFor(e))
    }
  }
  const reject = async (transfer: Transfer) => {
    const reason = await confirm({ title: t('transfers.rejectTitle'), requireReason: true })
    if (reason === false) return
    try {
      await rejectTransfer(transfer.equipmentId, transfer.id, reason)
      toast.success(t('transfers.rejected'))
      invalidate(transfer)
      setRow(null)
    } catch (e) {
      toast.error(messageFor(e))
    }
  }
  const columns: ColumnDef<Transfer>[] = [
    {
      id: 'equipmentId',
      header: t('transfers.equipment'),
      meta: {
        label: t('transfers.equipment'),
        className: 'max-w-[380px] min-w-[220px] whitespace-normal',
      },
      cell: ({ row: r }) => (
        <Link
          className="text-primary font-medium hover:text-primary/80"
          to={`/equipment/${r.original.equipmentId}`}
        >
          {equipmentName(r.original.equipmentId)}
        </Link>
      ),
    },
    {
      id: 'route',
      header: t('transfers.route'),
      cell: ({ row: r }) =>
        `${departmentName(r.original.fromDepartmentId)} → ${departmentName(r.original.toDepartmentId)}`,
    },
    {
      id: 'toRoom',
      header: t('transfers.toRoom'),
      cell: ({ row: r }) => roomName(r.original.toRoomId),
    },
    { accessorKey: 'reason', header: t('transfers.reason') },
    {
      accessorKey: 'status',
      header: t('transfers.status'),
      cell: ({ row: r }) => <StatusBadge value={r.original.status} map={transferStatusMap} />,
    },
    {
      id: 'requestedBy',
      header: t('transfers.requestedBy'),
      cell: ({ row: r }) => userName(r.original.requestedBy),
    },
    {
      accessorKey: 'createdAt',
      header: t('transfers.createdAt'),
      cell: ({ getValue }) => formatDateTime(getValue<string>()),
    },
    {
      // Duyệt / từ chối ngay trên dòng: trước đây phải mở popup chi tiết mới
      // thấy hai nút này (bảng lỗi 2026-10-07, mục #25 nhóm điều chuyển).
      id: 'actions',
      header: t('transfers.actions', { defaultValue: 'Thao tác' }),
      enableHiding: false,
      enableSorting: false,
      meta: { label: t('transfers.actions', { defaultValue: 'Thao tác' }), align: 'right' },
      cell: ({ row: r }) => (
        <RowActions
          items={[
            isAdm &&
              r.original.status === 'pending' && {
                key: 'approve',
                label: t('actions.approve'),
                icon: <Check aria-hidden />,
                onClick: () => void approve(r.original),
              },
            isAdm &&
              r.original.status === 'pending' && {
                key: 'reject',
                label: t('actions.reject'),
                icon: <X aria-hidden />,
                variant: 'destructive' as const,
                onClick: () => void reject(r.original),
              },
            {
              key: 'detail',
              label: t('transfers.detail', { defaultValue: 'Chi tiết' }),
              icon: <Eye aria-hidden />,
              onClick: () => setRow(r.original),
            },
          ]}
        />
      ),
    },
  ]
  const rows = (list.data?.items ?? []).filter(
    (item) =>
      !departmentId ||
      item.fromDepartmentId === departmentId ||
      item.toDepartmentId === departmentId,
  )
  return (
    <>
      {dialog}
      <PageHeader
        title={t('transfers.title')}
        description={t('transfers.listHint', {
          defaultValue: 'Yêu cầu điều chuyển máy giữa các khoa chờ duyệt và đã xử lý.',
        })}
      />
      <DataTable
        tableId="equipment-transfers"
        columns={columns}
        data={rows}
        total={list.data?.total ?? 0}
        params={table.params}
        onPageChange={table.setPage}
        onLimitChange={table.setLimit}
        isLoading={list.isPending}
        error={list.error}
        onRetry={() => void list.refetch()}
        getRowId={(r) => r.id}
        onRowClick={setRow}
        emptyTitle={t('transfers.empty')}
        toolbarLeft={
          <FilterBar>
            <FilterField label={t('transfers.status')}>
              <Select
                value={status ?? 'all'}
                onValueChange={(value) =>
                  table.setFilter('status', value === 'all' ? undefined : value)
                }
              >
                <SelectTrigger aria-label={t('transfers.status')} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.all')}</SelectItem>
                  {statuses.map((value) => (
                    <SelectItem key={value} value={value}>
                      {transferStatusMap[value]?.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label={t('fields.department')}>
              <AsyncSelect
                label={t('fields.department')}
                queryKey="departments"
                loadOptions={departmentOptions}
                value={departmentId ?? null}
                onChange={(value) =>
                  table.setFilter('departmentId', typeof value === 'string' ? value : undefined)
                }
                resolveOption={resolveDepartment}
                clearable
              />
            </FilterField>
          </FilterBar>
        }
      />
      <Sheet open={!!row} onOpenChange={(open) => !open && setRow(null)}>
        <SheetContent className="overflow-y-auto">
          {/* Tiêu đề 18px/600 kèm nút quay lại, giống các popup khác (bảng lỗi
              2026-10-07, mục #26). */}
          <SheetHeader>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="-ml-2 size-8 shrink-0"
                aria-label="Quay lại"
                onClick={() => setRow(null)}
              >
                <ArrowLeft aria-hidden />
              </Button>
              <SheetTitle className="text-[18px] leading-7 font-semibold">
                {t('transfers.detail', { defaultValue: 'Chi tiết điều chuyển' })}
              </SheetTitle>
            </div>
          </SheetHeader>
          {row && (
            <div className="space-y-3 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={row.status} map={transferStatusMap} />
                <Link
                  className="text-primary font-medium hover:text-primary/80"
                  to={`/equipment/${row.equipmentId}`}
                >
                  {equipmentName(row.equipmentId)}
                </Link>
              </div>
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">{t('transfers.fromDepartment')}</dt>
                  <dd>{departmentName(row.fromDepartmentId)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t('transfers.toDepartment')}</dt>
                  <dd>{departmentName(row.toDepartmentId)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t('transfers.toRoom')}</dt>
                  <dd>{roomName(row.toRoomId)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t('transfers.toLocation')}</dt>
                  <dd>{row.toLocation ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t('transfers.reason')}</dt>
                  <dd>{row.reason ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t('transfers.requestedBy')}</dt>
                  <dd>{userName(row.requestedBy)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t('transfers.approvedBy')}</dt>
                  <dd>{userName(row.approvedBy)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t('transfers.createdAt')}</dt>
                  <dd>{formatDateTime(row.createdAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">{t('transfers.transferredAt')}</dt>
                  <dd>{formatDateTime(row.transferredAt) || '—'}</dd>
                </div>
              </dl>
              {isAdm && row.status === 'pending' && (
                <div className="flex gap-2">
                  <Button onClick={() => void approve(row)}>{t('actions.approve')}</Button>
                  <Button variant="outline" onClick={() => void reject(row)}>
                    {t('actions.reject')}
                  </Button>
                </div>
              )}
              {row.status === 'pending' && row.requestedBy === userId && (
                <Button
                  variant="ghost"
                  onClick={async () => {
                    if ((await confirm({ title: t('transfers.cancelTitle') })) === false) return
                    try {
                      await cancelTransfer(row.equipmentId, row.id)
                      toast.success(t('transfers.cancelled'))
                      invalidate(row)
                      setRow(null)
                    } catch (e) {
                      toast.error(messageFor(e))
                    }
                  }}
                >
                  {t('actions.cancel')}
                </Button>
              )}
              <div>
                <h3 className="mb-2 font-medium">{t('kinds.handover')}</h3>
                <AttachmentsPanel
                  entityType="equipment_transfer"
                  entityId={row.id}
                  kinds={[{ value: 'handover', label: t('kinds.handover') }]}
                />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
