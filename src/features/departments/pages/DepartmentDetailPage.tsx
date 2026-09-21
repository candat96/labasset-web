import { Link, useParams } from 'react-router'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { DoorOpen, MapPin, Phone, Users } from 'lucide-react'
import { DetailLayout } from '@/components/detail-layout'
import { DataTable, useServerTable } from '@/components/data-table'
import { FilterBar } from '@/components/filter-bar'
import { ErrorState } from '@/components/page/ErrorState'
import { DetailSkeleton } from '@/components/page/DetailSkeleton'
import { DataList } from '@/components/page/DataList'
import { PageMeta } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { AuditTrail } from '@/components/audit-trail'
import { StatusBadge } from '@/components/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/page/EmptyState'
import { RoomFormDialog } from '@/components/room-form-dialog'
import { useCan } from '@/app/guards/useCan'
import { STAFF } from '@/routes/roles'
import { enumLabel } from '@/lib/enum-labels'
import { commonStatusMap } from '@/lib/status-maps'
import {
  getDepartment,
  getDepartmentRoomCounts,
  getDepartmentRooms,
  getDepartmentUsers,
  type DepartmentRoom,
  type DepartmentUser,
} from '../api'
export function Component() {
  const { t } = useTranslation('departments')
  const { id = '' } = useParams()
  const table = useServerTable()
  const department = useQuery({
    queryKey: ['departments', 'detail', id],
    queryFn: () => getDepartment(id),
  })
  const users = useQuery({
    queryKey: ['departments', id, 'users', table.params.page, table.params.limit],
    queryFn: () => getDepartmentUsers(id, table.params.page, table.params.limit),
  })
  const canAddRoom = useCan(STAFF)
  const [roomDialog, setRoomDialog] = useState(false)
  const rooms = useQuery({
    queryKey: ['departments', id, 'rooms'],
    queryFn: () => getDepartmentRooms(id),
  })
  const roomCounts = useQuery({
    queryKey: ['departments', id, 'room-counts'],
    queryFn: () => getDepartmentRoomCounts(id),
  })
  const roomColumns = useMemo<ColumnDef<DepartmentRoom>[]>(
    () => [
      {
        accessorKey: 'code',
        header: t('roomColumns.code', { defaultValue: 'Mã' }),
        cell: ({ getValue }) => <code className="font-mono text-xs">{getValue<string>()}</code>,
      },
      {
        accessorKey: 'name',
        header: t('roomColumns.name', { defaultValue: 'Tên phòng' }),
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-2 font-medium">
            {row.original.name}
            {row.original.departmentId === null && (
              <Badge variant="secondary">{t('roomShared', { defaultValue: 'Dùng chung' })}</Badge>
            )}
          </span>
        ),
      },
      {
        id: 'buildingFloor',
        header: t('roomColumns.buildingFloor', { defaultValue: 'Toà/Tầng' }),
        cell: ({ row }) =>
          [row.original.building, row.original.floor].filter(Boolean).join(' / ') || '—',
      },
      {
        accessorKey: 'roomType',
        header: t('roomColumns.roomType', { defaultValue: 'Loại phòng' }),
        cell: ({ row }) => enumLabel('roomType', row.original.roomType),
      },
      {
        id: 'equipmentCount',
        header: t('roomColumns.equipmentCount', { defaultValue: 'Số máy' }),
        cell: ({ row }) => {
          const count = roomCounts.data?.get(row.original.code) ?? 0
          return count ? (
            <Link
              className="text-primary hover:underline"
              to={`/equipment?departmentId=${id}&roomId=${row.original.id}`}
            >
              {count}
            </Link>
          ) : (
            '0'
          )
        },
      },
      {
        accessorKey: 'isActive',
        header: t('fields.isActive'),
        cell: ({ row }) => (
          <StatusBadge
            value={row.original.isActive ? 'active' : 'inactive'}
            map={commonStatusMap}
          />
        ),
      },
    ],
    [id, roomCounts.data, t],
  )
  const columns = useMemo<ColumnDef<DepartmentUser>[]>(
    () => [
      { accessorKey: 'username', header: t('userColumns.username') },
      { accessorKey: 'fullName', header: t('userColumns.fullName') },
      { accessorKey: 'email', header: t('userColumns.email') },
      {
        accessorKey: 'roles',
        header: t('userColumns.roles'),
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.roles.map((r) => (
              <Badge variant="secondary" key={r}>
                {enumLabel('role', r)}
              </Badge>
            ))}
          </div>
        ),
      },
    ],
    [t],
  )
  if (department.isPending) return <DetailSkeleton label={t('loadingDetail')} />
  if (department.error)
    return <ErrorState error={department.error} onRetry={() => void department.refetch()} />
  const row = department.data
  return (
    <DetailLayout
      code={row.code}
      eyebrow={t('title', { defaultValue: 'Khoa/Phòng ban' })}
      name={row.name}
      badge={<StatusBadge value={row.isActive ? 'active' : 'inactive'} map={commonStatusMap} />}
      meta={
        <>
          <PageMeta icon={<Users />}>{row.code}</PageMeta>
          {row.location && <PageMeta icon={<MapPin />}>{row.location}</PageMeta>}
          {row.phone && <PageMeta icon={<Phone />}>{row.phone}</PageMeta>}
        </>
      }
      information={
        <>
          <h2 className="mb-3 text-[15px] leading-6 font-semibold">
            {t('info', { defaultValue: 'Thông tin' })}
          </h2>
          <DataList
            columns={1}
            items={[
              { label: t('fields.code', { defaultValue: 'Mã' }), value: row.code },
              { label: t('fields.phone'), value: row.phone },
              { label: t('fields.location'), value: row.location },
              { label: t('userCount'), value: users.data?.total },
              { label: t('roomCount', { defaultValue: 'Số phòng' }), value: rooms.data?.length },
            ]}
          />
        </>
      }
      tabs={[
        {
          value: 'users',
          label: t('users'),
          content: (
            <DataTable
              tableId="department-users"
              columns={columns}
              data={users.data?.items}
              total={users.data?.total ?? 0}
              params={table.params}
              toolbarLeft={<FilterBar>{null}</FilterBar>}
              onPageChange={table.setPage}
              onLimitChange={table.setLimit}
              isLoading={users.isPending}
              error={users.error}
              onRetry={() => void users.refetch()}
              getRowId={(u) => u.id}
            />
          ),
        },
        {
          value: 'rooms',
          label: t('rooms', { defaultValue: 'Phòng' }),
          count: rooms.data?.length,
          content: (
            <>
              {rooms.data && rooms.data.length === 0 ? (
                <SectionCard
                  title={t('rooms', { defaultValue: 'Phòng' })}
                  actions={
                    canAddRoom && (
                      <Button onClick={() => setRoomDialog(true)}>
                        {t('addRoom', { defaultValue: 'Thêm phòng' })}
                      </Button>
                    )
                  }
                >
                  <EmptyState
                    icon={DoorOpen}
                    title={t('roomsEmpty', { defaultValue: 'Chưa có phòng nào' })}
                    description={t('roomsEmptyHint', {
                      defaultValue: 'Thêm phòng để chỉ rõ máy đặt ở đâu trong Khoa/Phòng ban này.',
                    })}
                  />
                </SectionCard>
              ) : (
                <DataTable
                  tableId="department-rooms"
                  columns={roomColumns}
                  data={rooms.data}
                  total={rooms.data?.length ?? 0}
                  params={{
                    ...table.params,
                    page: 1,
                    limit: Math.max(rooms.data?.length ?? 0, 20),
                  }}
                  onPageChange={() => {}}
                  onLimitChange={() => {}}
                  toolbarLeft={<FilterBar>{null}</FilterBar>}
                  toolbarRight={
                    canAddRoom && (
                      <Button onClick={() => setRoomDialog(true)}>
                        {t('addRoom', { defaultValue: 'Thêm phòng' })}
                      </Button>
                    )
                  }
                  isLoading={rooms.isPending}
                  error={rooms.error}
                  onRetry={() => void rooms.refetch()}
                  getRowId={(r) => r.id}
                />
              )}
              <RoomFormDialog
                open={roomDialog}
                onOpenChange={setRoomDialog}
                departmentId={id}
                departmentName={row.name}
                onCreated={() => void rooms.refetch()}
              />
            </>
          ),
        },
        {
          value: 'audit',
          label: t('audit', { defaultValue: 'Nhật ký' }),
          content: (
            <SectionCard title={t('audit', { defaultValue: 'Nhật ký thay đổi' })}>
              <AuditTrail entityType="department" entityId={id} />
            </SectionCard>
          ),
        },
      ]}
    />
  )
}
