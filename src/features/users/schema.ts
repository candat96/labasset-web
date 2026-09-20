import { z } from 'zod'
import i18n from '@/lib/i18n'
import { ROLES } from '@/routes/roles'
export const userSchema = z
  .object({
    username: z.string().regex(/^[a-z0-9._-]{3,64}$/, i18n.t('users:errors.username')),
    fullName: z.string().trim().min(1).max(255),
    email: z.union([z.literal(''), z.email(i18n.t('users:errors.email'))]),
    phone: z.string().refine((v) => !v || /^[0-9+ ]{6,32}$/.test(v), i18n.t('users:errors.phone')),
    roles: z.array(z.enum(ROLES)).min(1, i18n.t('users:errors.roles')),
    departmentId: z.string().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.roles.some((r) => r === 'DEPT_HEAD' || r === 'DEPT_USER') && !v.departmentId)
      ctx.addIssue({
        code: 'custom',
        path: ['departmentId'],
        message: i18n.t('users:errors.departmentId'),
      })
  })
export type UserValues = z.infer<typeof userSchema>
