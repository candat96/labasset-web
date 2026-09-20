import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnDef } from '@tanstack/react-table'
import { toast } from 'sonner'
import { DataTable, useServerTable } from '@/components/data-table'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { FormDialog } from '@/components/form/FormDialog'
import { TextField, SelectField } from '@/components/form/fields'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
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
  const { t } = useTranslation('sys')
  const { t: tc } = useTranslation()
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
      toast.success(t('announcement.saved'))
    },
    onError: (error) => {
      if (!applyServerErrors(form, error)) toast.error(messageFor(error))
    },
  })
  const remove = useMutation({
    mutationFn: deleteSysAnnouncement,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sys-announcements'] })
      toast.success(t('announcement.deleted'))
    },
    onError: (error) => toast.error(messageFor(error)),
  })
  const columns: ColumnDef<SysAnnouncement>[] = [
    { accessorKey: 'title', header: t('announcement.fields.title') },
    { accessorKey: 'level', header: t('announcement.fields.level') },
    {
      accessorKey: 'startsAt',
      header: t('announcement.fields.startsAt'),
      cell: ({ getValue }) => formatDateTime(getValue<string>()),
    },
    {
      accessorKey: 'endsAt',
      header: t('announcement.fields.endsAt'),
      cell: ({ getValue }) => formatDateTime(getValue<string | null>()) || '—',
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
              setOpen(true)
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
                  title: t('announcement.deleteTitle', { name: row.original.title }),
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
  ]
  return (
    <>
      {dialog}
      <PageHeader
        title={t('announcement.title')}
        actions={
          <Button
            onClick={() => {
              setEditing(undefined)
              setOpen(true)
            }}
          >
            {t('announcement.add')}
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
        title={editing ? t('announcement.edit') : t('announcement.add')}
        form={form}
        onSubmit={(values) => save.mutateAsync(values)}
        submitting={save.isPending}
      >
        <TextField control={form.control} name="title" label={t('announcement.fields.title')} />
        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('announcement.fields.body')}</FormLabel>
              <FormControl>
                <Textarea rows={6} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <SelectField
          control={form.control}
          name="level"
          label={t('announcement.fields.level')}
          options={[
            { value: 'info', label: t('announcement.levels.info') },
            { value: 'warning', label: t('announcement.levels.warning') },
          ]}
        />
        <DatetimeField
          control={form.control}
          name="startsAt"
          label={t('announcement.fields.startsAt')}
        />
        <DatetimeField
          control={form.control}
          name="endsAt"
          label={t('announcement.fields.endsAt')}
        />
      </FormDialog>
    </>
  )
}
