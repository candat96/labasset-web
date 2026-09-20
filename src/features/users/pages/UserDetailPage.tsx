import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/page/ErrorState'
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
  if (list.isPending) return <p role="status">{t('loading')}</p>
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
  const confirmKeys = {
    resetPassword: t('confirm.resetPassword', { name: row.fullName }),
    deactivate: t('confirm.deactivate', { name: row.fullName }),
    activate: t('confirm.activate', { name: row.fullName }),
    delete: t('confirm.delete', { name: row.fullName }),
  }
  return (
    <>
      <PageHeader
        title={row.fullName}
        description={row.username}
        actions={
          canWrite && (
            <>
              <Button onClick={() => setEdit(true)}>{tc('actions.edit')}</Button>
              <Button
                variant="outline"
                disabled={action.isPending}
                onClick={() => void run('reset-password', confirmKeys.resetPassword)}
              >
                {t('actions.resetPassword')}
              </Button>
              {!self && (
                <>
                  {row.isActive === true && (
                    <Button
                      variant="outline"
                      disabled={action.isPending}
                      onClick={() => void run('deactivate', confirmKeys.deactivate)}
                    >
                      {t('actions.lock')}
                    </Button>
                  )}
                  {row.isActive === false && (
                    <Button
                      variant="outline"
                      disabled={action.isPending}
                      onClick={() => void run('activate', confirmKeys.activate)}
                    >
                      {t('actions.unlock')}
                    </Button>
                  )}
                  {row.isActive === undefined && (
                    <p className="text-muted-foreground text-sm">{t('detail.statusMissing')}</p>
                  )}
                  <Button
                    variant="destructive"
                    disabled={action.isPending}
                    onClick={() => void run('delete', confirmKeys.delete)}
                  >
                    {tc('actions.delete')}
                  </Button>
                </>
              )}
            </>
          )
        }
      />
      <dl className="bg-card grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
        {[
          [t('fields.email'), row.email],
          [t('fields.phone'), row.phone],
          [
            t('fields.department'),
            departments.data?.find((d) => d.id === row.departmentId)?.name ?? row.departmentId,
          ],
          [t('fields.roles'), row.roles.map((r) => roleLabel(r)).join(', ')],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{value || '—'}</dd>
          </div>
        ))}
      </dl>
      <UserFormDialog open={edit} onOpenChange={setEdit} user={row} onPassword={setPassword} />
      <TemporaryPasswordDialog password={password} onClose={() => setPassword(null)} />
      {dialog}
    </>
  )
}
