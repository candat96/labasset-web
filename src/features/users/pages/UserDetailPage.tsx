import { useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PageHeader } from '@/components/page/PageHeader'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/page/ErrorState'
import { TemporaryPasswordDialog } from '@/components/temporary-password-dialog'
import { useConfirm } from '@/components/confirm-dialog'
import { useAuthStore } from '@/stores/auth.store'
import { useCan } from '@/app/guards/useCan'
import { ADM, type Role } from '@/routes/roles'
import { roleLabels } from '@/lib/role-labels'
import { messageFor } from '@/api/errors'
import { allDepartments } from '@/api/references'
import { getUser, userAction, deleteUser } from '../api'
import { UserFormDialog } from '../components/UserFormDialog'
export function Component() {
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
      toast.success('Đã thực hiện')
      if (name === 'delete') navigate('/admin/users')
    },
    onError: (e) => toast.error(messageFor(e)),
  })
  if (list.isPending) return <p role="status">Đang tải người dùng…</p>
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
  return (
    <>
      <PageHeader
        title={row.fullName}
        description={row.username}
        actions={
          canWrite && (
            <>
              <Button onClick={() => setEdit(true)}>Sửa</Button>
              <Button
                variant="outline"
                disabled={action.isPending}
                onClick={() => void run('reset-password', 'Đặt lại mật khẩu')}
              >
                Reset mật khẩu
              </Button>
              {!self && (
                <>
                  {row.isActive !== false && (
                    <Button
                      variant="outline"
                      disabled={action.isPending}
                      onClick={() => void run('deactivate', 'Khoá')}
                    >
                      Khoá
                    </Button>
                  )}
                  {row.isActive !== true && (
                    <Button
                      variant="outline"
                      disabled={action.isPending}
                      onClick={() => void run('activate', 'Mở khoá')}
                    >
                      Mở khoá
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    disabled={action.isPending}
                    onClick={() => void run('delete', 'Xoá')}
                  >
                    Xoá
                  </Button>
                </>
              )}
            </>
          )
        }
      />
      <dl className="bg-card grid gap-4 rounded-lg border p-4 sm:grid-cols-2">
        {[
          ['Email', row.email],
          ['Điện thoại', row.phone],
          [
            'Khoa',
            departments.data?.find((d) => d.id === row.departmentId)?.name ?? row.departmentId,
          ],
          ['Vai trò', row.roles.map((r) => roleLabels[r as Role] ?? r).join(', ')],
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
