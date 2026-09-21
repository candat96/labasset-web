import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader, PageMeta } from '@/components/page/PageHeader'
import { SectionCard } from '@/components/page/SectionCard'
import { ActionMenu } from '@/components/page/ActionMenu'
import { DataList } from '@/components/page/DataList'
import { DetailSkeleton } from '@/components/page/DetailSkeleton'
import { ErrorState } from '@/components/page/ErrorState'
import { StatusBadge } from '@/components/status-badge'
import { commonStatusMap } from '@/lib/status-maps'
import { formatDateTime } from '@/lib/format/date'
import { AtSign, Building2, Clock, KeyRound, Lock, ShieldCheck, Trash2, Unlock } from 'lucide-react'
import { TemporaryPasswordDialog } from '@/components/temporary-password-dialog'
import { useConfirm } from '@/components/confirm-dialog'
import { useAuthStore } from '@/stores/auth.store'
import { useCan } from '@/app/guards/useCan'
import { ADM } from '@/routes/roles'
import { messageFor } from '@/api/errors'
import { allDepartments } from '@/api/references'
import { getUser, userAction, deleteUser } from '../api'
import { UserFormDialog } from '../components/UserFormDialog'
import { useRoleLabel } from '../role-label'
export function Component() {
  const { t } = useTranslation('users')
  const { t: tc } = useTranslation()
  const roleLabel = useRoleLabel()
  const { id = '' } = useParams(),
    navigate = useNavigate(),
    qc = useQueryClient()
  const list = useQuery({ queryKey: ['users', 'detail', id], queryFn: () => getUser(id) })
  const departments = useQuery({ queryKey: ['references', 'departments'], queryFn: allDepartments })
  const self = useAuthStore((s) => s.user?.id === id),
    canWrite = useCan(ADM)
  const [edit, setEdit] = useState(false),
    [password, setPassword] = useState<string | null>(null)
  const { confirm, dialog } = useConfirm()
  const action = useMutation({
    mutationFn: async (name: 'activate' | 'deactivate' | 'reset-password' | 'delete') => {
      if (name === 'delete') await deleteUser(id)
      else {
        const result = await userAction(id, name)
        if (result?.tempPassword) setPassword(result.tempPassword)
      }
      return name
    },
    onSuccess: (name) => {
      void qc.invalidateQueries({ queryKey: ['users'] })
      toast.success(t('actions.done'))
      if (name === 'delete') navigate('/admin/users')
    },
    onError: (e) => toast.error(messageFor(e)),
  })
  if (list.isPending) return <DetailSkeleton label={t('loading')} />
  if (list.error) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />
  const row = list.data
  const run = async (name: Parameters<typeof action.mutate>[0], title: string) => {
    if (
      (await confirm({
        title: `${title} ${row.fullName}?`,
        destructive: name === 'delete' || name === 'deactivate',
      })) !== false
    )
      action.mutate(name)
  }
  const departmentName =
    departments.data?.find((d) => d.id === row.departmentId)?.name ?? row.departmentId
  const roles = row.roles.map((r) => roleLabel(r)).join(', ')
  const confirmKeys = {
    resetPassword: t('confirm.resetPassword', { name: row.fullName }),
    deactivate: t('confirm.deactivate', { name: row.fullName }),
    activate: t('confirm.activate', { name: row.fullName }),
    delete: t('confirm.delete', { name: row.fullName }),
  }
  return (
    <>
      <PageHeader
        eyebrow={t('title')}
        title={row.fullName}
        badge={
          row.isActive === undefined ? undefined : (
            <StatusBadge value={row.isActive ? 'active' : 'inactive'} map={commonStatusMap} />
          )
        }
        meta={
          <>
            <PageMeta icon={<AtSign />}>{row.username}</PageMeta>
            {departmentName && <PageMeta icon={<Building2 />}>{departmentName}</PageMeta>}
            <PageMeta icon={<ShieldCheck />}>{roles}</PageMeta>
            {row.lastLoginAt && (
              <PageMeta icon={<Clock />}>
                {t('fields.lastLoginAt')}: {formatDateTime(row.lastLoginAt)}
              </PageMeta>
            )}
          </>
        }
        actions={
          canWrite && (
            <ActionMenu
              items={[
                {
                  key: 'edit',
                  label: tc('actions.edit'),
                  variant: 'primary' as const,
                  onClick: () => setEdit(true),
                },
                {
                  key: 'reset',
                  label: t('actions.resetPassword'),
                  icon: <KeyRound />,
                  disabled: action.isPending,
                  onClick: () => void run('reset-password', confirmKeys.resetPassword),
                },
                !self &&
                  row.isActive === true && {
                    key: 'lock',
                    label: t('actions.lock'),
                    icon: <Lock />,
                    disabled: action.isPending,
                    onClick: () => void run('deactivate', confirmKeys.deactivate),
                  },
                !self &&
                  row.isActive === false && {
                    key: 'unlock',
                    label: t('actions.unlock'),
                    icon: <Unlock />,
                    disabled: action.isPending,
                    onClick: () => void run('activate', confirmKeys.activate),
                  },
                !self && {
                  key: 'delete',
                  label: tc('actions.delete'),
                  variant: 'destructive' as const,
                  icon: <Trash2 />,
                  separator: true,
                  disabled: action.isPending,
                  onClick: () => void run('delete', confirmKeys.delete),
                },
              ]}
            />
          )
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <SectionCard title={t('info', { defaultValue: 'Thông tin tài khoản' })}>
          <DataList
            columns={2}
            items={[
              { label: t('fields.username'), value: row.username },
              { label: t('fields.fullName'), value: row.fullName },
              { label: t('fields.email'), value: row.email },
              { label: t('fields.phone'), value: row.phone },
              { label: t('fields.department'), value: departmentName },
              { label: t('fields.roles'), value: roles },
            ]}
          />
        </SectionCard>
        <SectionCard title={t('fields.isActive')}>
          <DataList
            columns={1}
            items={[
              {
                label: t('fields.isActive'),
                value:
                  row.isActive === undefined ? (
                    <span className="text-muted-foreground font-normal">
                      {t('detail.statusMissing')}
                    </span>
                  ) : (
                    <StatusBadge
                      value={row.isActive ? 'active' : 'inactive'}
                      map={commonStatusMap}
                    />
                  ),
              },
              {
                label: t('fields.lastLoginAt'),
                value: row.lastLoginAt ? formatDateTime(row.lastLoginAt) : null,
              },
            ]}
          />
        </SectionCard>
      </div>
      <UserFormDialog open={edit} onOpenChange={setEdit} user={row} onPassword={setPassword} />
      <TemporaryPasswordDialog password={password} onClose={() => setPassword(null)} />
      {dialog}
    </>
  )
}
