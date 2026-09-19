import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FormDialog } from '@/components/form/FormDialog'
import { TextField } from '@/components/form/fields'
import { AsyncSelect } from '@/components/form/async-select'
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ROLES } from '@/routes/roles'
import { roleLabels } from '@/lib/role-labels'
import { departmentOptions } from '@/api/references'
import { applyServerErrors, messageFor } from '@/api/errors'
import { createUser, updateUser } from '../api'
import { userSchema, type UserValues } from '../schema'
import type { User, UpdateUser } from '../types'
const values = (user?: User): UserValues => ({
  username: user?.username ?? '',
  fullName: user?.fullName ?? '',
  email: user?.email ?? '',
  phone: user?.phone ?? '',
  roles: (user?.roles ?? []).filter((r): r is (typeof ROLES)[number] => ROLES.some((x) => x === r)),
  departmentId: user?.departmentId ?? null,
})
export function UserFormDialog({
  open,
  onOpenChange,
  user,
  onPassword,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  user?: User
  onPassword: (password: string) => void
}) {
  const form = useForm<UserValues>({
    resolver: zodResolver(userSchema),
    defaultValues: values(user),
    mode: 'onBlur',
  })
  useEffect(() => {
    if (open) form.reset(values(user))
  }, [open, user, form])
  const qc = useQueryClient()
  const save = useMutation({
    mutationFn: async (v: UserValues) => {
      if (!user) {
        const result = await createUser({
          ...v,
          email: v.email || undefined,
          phone: v.phone || undefined,
          departmentId: v.departmentId || undefined,
        })
        onPassword(result.tempPassword)
      } else {
        const before = values(user)
        const body: Record<string, unknown> = {}
        for (const key of ['fullName', 'email', 'phone', 'roles', 'departmentId'] as const)
          if (JSON.stringify(v[key]) !== JSON.stringify(before[key]))
            body[key] = v[key] === '' ? null : v[key]
        if (Object.keys(body).length) await updateUser(user.id, body as UpdateUser)
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['users'] })
      onOpenChange(false)
      toast.success('Đã lưu người dùng')
    },
    onError: (e) => {
      if (!applyServerErrors(form, e)) toast.error(messageFor(e))
    },
  })
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={user ? 'Sửa người dùng' : 'Thêm người dùng'}
      form={form}
      onSubmit={(v) => save.mutate(v)}
      submitting={save.isPending}
    >
      <TextField control={form.control} name="username" label="Tài khoản" disabled={!!user} />
      <TextField control={form.control} name="fullName" label="Họ tên" />
      <TextField control={form.control} name="email" label="Email" type="email" />
      <TextField control={form.control} name="phone" label="Điện thoại" />
      <FormField
        control={form.control}
        name="roles"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Vai trò</FormLabel>
            <div className="grid gap-2 sm:grid-cols-2">
              {ROLES.map((role) => (
                <div className="flex items-center gap-2" key={role}>
                  <Checkbox
                    id={`role-${role}`}
                    checked={field.value.includes(role)}
                    onCheckedChange={(checked) =>
                      field.onChange(
                        checked ? [...field.value, role] : field.value.filter((r) => r !== role),
                      )
                    }
                  />
                  <Label htmlFor={`role-${role}`}>{roleLabels[role]}</Label>
                </div>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="departmentId"
        render={({ field }) => (
          <FormItem>
            <AsyncSelect
              label="Khoa/phòng"
              queryKey="departments"
              loadOptions={departmentOptions}
              value={field.value}
              onChange={(v) => field.onChange(v)}
              clearable
            />
            <FormMessage />
          </FormItem>
        )}
      />
    </FormDialog>
  )
}
