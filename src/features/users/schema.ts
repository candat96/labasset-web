import { z } from 'zod'
import { ROLES } from '@/routes/roles'
export const userSchema = z
  .object({
    username: z
      .string()
      .regex(
        /^[a-z0-9._-]{3,64}$/,
        'Từ 3–64 ký tự chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang',
      ),
    fullName: z.string().trim().min(1, 'Bắt buộc').max(255),
    email: z.union([z.literal(''), z.email('Email không hợp lệ')]),
    phone: z.string().refine((v) => !v || /^[0-9+ ]{6,32}$/.test(v), 'Số điện thoại không hợp lệ'),
    roles: z.array(z.enum(ROLES)).min(1, 'Chọn ít nhất một vai trò'),
    departmentId: z.string().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.roles.some((r) => r === 'DEPT_HEAD' || r === 'DEPT_USER') && !v.departmentId)
      ctx.addIssue({
        code: 'custom',
        path: ['departmentId'],
        message: 'Vai trò khoa bắt buộc chọn khoa/phòng',
      })
  })
export type UserValues = z.infer<typeof userSchema>
