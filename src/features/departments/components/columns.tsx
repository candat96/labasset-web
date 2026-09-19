import { Link } from 'react-router'
import type { ColumnDef } from '@tanstack/react-table'
import type { TFunction } from 'i18next'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StatusBadge } from '@/components/page/StatusBadge'
import type { Department } from '../types'

function UserCount({ id }: { id: string }) {
  return (
    <Link className="text-primary hover:underline" to={`/admin/departments/${id}?tab=users`}>
      Xem người dùng
    </Link>
  )
}
export function buildColumns({
  t,
  tc,
  usersById,
  canWrite,
  onEdit,
  onDelete,
}: {
  t: TFunction<'departments'>
  tc: TFunction
  usersById: Map<string, string>
  canWrite: boolean
  onEdit: (d: Department) => void
  onDelete: (d: Department) => void
}): ColumnDef<Department>[] {
  const cols: ColumnDef<Department>[] = [
    {
      id: 'userCount',
      header: 'Số người dùng',
      cell: ({ row }) => <UserCount id={row.original.id} />,
    },
    {
      accessorKey: 'code',
      header: t('fields.code'),
      meta: { label: t('fields.code'), className: 'w-32' },
      cell: ({ getValue }) => (
        <code className="bg-muted rounded border px-1 font-mono text-xs">{getValue<string>()}</code>
      ),
    },
    {
      accessorKey: 'name',
      header: t('fields.name'),
      meta: { label: t('fields.name') },
      cell: ({ row }) => (
        <Link
          className="text-primary font-medium hover:underline"
          to={`/admin/departments/${row.original.id}`}
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: 'type',
      header: t('fields.type'),
      meta: { label: t('fields.type') },
      cell: ({ getValue }) => <Badge variant="secondary">{t(`types.${getValue<string>()}`)}</Badge>,
    },
    {
      accessorKey: 'headUserId',
      header: t('fields.headUserId'),
      meta: { label: t('fields.headUserId') },
      cell: ({ getValue }) => {
        const id = getValue<string | null>()
        return id ? (usersById.get(id) ?? '—') : '—'
      },
    },
    {
      accessorKey: 'phone',
      header: t('fields.phone'),
      meta: { label: t('fields.phone') },
      cell: ({ getValue }) => getValue<string | null>() ?? '—',
    },
    {
      accessorKey: 'location',
      header: t('fields.location'),
      meta: { label: t('fields.location') },
      cell: ({ getValue }) => getValue<string | null>() ?? '—',
    },
    {
      accessorKey: 'isActive',
      header: t('fields.isActive'),
      meta: { label: t('fields.isActive'), className: 'w-28' },
      cell: ({ getValue }) =>
        getValue<boolean>() ? (
          <StatusBadge status="success" label={tc('status.active')} />
        ) : (
          <StatusBadge status="muted" label={tc('status.inactive')} />
        ),
    },
  ]
  if (canWrite) {
    cols.push({
      id: 'actions',
      header: '',
      enableHiding: false,
      meta: { className: 'w-0 text-right' },
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={tc('actions.more')}>
              <MoreHorizontal aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(row.original)}>
              <Pencil aria-hidden /> {tc('actions.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(row.original)}>
              <Trash2 aria-hidden /> {tc('actions.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    })
  }
  return cols
}
