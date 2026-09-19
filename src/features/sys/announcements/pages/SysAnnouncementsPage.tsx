import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/form/FormDialog'
import { TextField, SelectField } from '@/components/form/fields'
import { DatetimeField } from '@/components/form/datetime-field'
import { useConfirm } from '@/components/confirm-dialog'
import { applyServerErrors, messageFor } from '@/api/errors'
import { formatDateTime } from '@/lib/format/date'
import {
  createSysAnnouncement,
  deleteSysAnnouncement,
  listSysAnnouncements,
  updateSysAnnouncement,
  type SysAnnouncement,
} from '../api'
import { announcementSchema, type AnnouncementValues } from '../schema'

const empty: AnnouncementValues = {
  title: '',
  body: '',
  level: 'info',
  startsAt: '',
  endsAt: '',
}

export function Component() {
  const table = useServerTable()
  const list = useQuery({
    queryKey: ['sys-announcements', table.params.page, table.params.limit],
    queryFn: () => listSysAnnouncements(table.params.page, table.params.limit),
    placeholderData: (previous) => previous,
  })
  const qc = useQueryClient()
  const { confirm, dialog } = useConfirm()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SysAnnouncement | undefined>()
  const form = useForm<AnnouncementValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: empty,
  })
  useEffect(() => {
    if (!open) return
    form.reset(
      editing
        ? {
            title: editing.title,
            body: editing.body,
            level: editing.level === 'warning' ? 'warning' : 'info',
            startsAt: editing.startsAt,
            endsAt: editing.endsAt ?? '',
          }
        : empty,
    )
  }, [open, editing, form])
  const save = useMutation({
    mutationFn: async (values: AnnouncementValues) => {
      const body = {
        title: values.title,
        body: values.body,
        level: values.level,
        startsAt: values.startsAt,
        endsAt: values.endsAt || null,
      } as Parameters<typeof createSysAnnouncement>[0]
      if (editing) await updateSysAnnouncement(editing.id, body)
      else await createSysAnnouncement(body)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sys-announcements'] })
      setOpen(false)
      toast.success('Đã lưu thông báo')
    },
    onError: (error) => {
      if (!applyServerErrors(form, error)) toast.error(messageFor(error))
    },
  })
  const remove = useMutation({
    mutationFn: deleteSysAnnouncement,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sys-announcements'] })
      toast.success('Đã xoá thông báo')
    },
    onError: (error) => toast.error(messageFor(error)),
  })
  const columns: ColumnDef<SysAnnouncement>[] = [
    { accessorKey: 'title', header: 'Tiêu đề' },
    { accessorKey: 'level', header: 'Mức' },
    {
      accessorKey: 'startsAt',
      header: 'Bắt đầu',
      cell: ({ getValue }) => formatDateTime(getValue<string>()),
    },
    {
      accessorKey: 'endsAt',
      header: 'Kết thúc',
      cell: ({ getValue }) => formatDateTime(getValue<string | null>()) || '—',
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
              setOpen(true)
            }}
          >
            Sửa
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              if (
                (await confirm({ title: `Xoá ${row.original.title}?`, destructive: true })) !==
                false
              )
                remove.mutate(row.original.id)
            }}
          >
            Xoá
          </Button>
        </div>
      ),
    },
  ]
  return (
    <>
      {dialog}
      <PageHeader
        title="Thông báo hệ thống"
        actions={
          <Button
            onClick={() => {
              setEditing(undefined)
              setOpen(true)
            }}
          >
            Thêm thông báo
          </Button>
        }
      />
      <DataTable
        tableId="sys-announcements"
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
      />
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Sửa thông báo' : 'Thêm thông báo'}
        form={form}
        onSubmit={(values) => save.mutateAsync(values)}
        submitting={save.isPending}
      >
        <TextField control={form.control} name="title" label="Tiêu đề" />
        <TextField control={form.control} name="body" label="Nội dung" />
        <SelectField
          control={form.control}
          name="level"
          label="Mức"
          options={[
            { value: 'info', label: 'Thông tin' },
            { value: 'warning', label: 'Cảnh báo' },
          ]}
        />
        <DatetimeField control={form.control} name="startsAt" label="Bắt đầu" />
        <DatetimeField control={form.control} name="endsAt" label="Kết thúc" />
      </FormDialog>
    </>
  )
}
