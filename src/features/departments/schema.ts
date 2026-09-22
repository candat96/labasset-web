import { z } from 'zod'
import i18n from '@/lib/i18n'
import { DEPARTMENT_TYPES } from './types'

export const departmentSchema = () =>
  z.object({
    // Mã không bắt buộc — để trống server tự sinh (handoff 16); nhập thì kiểm tra định dạng.
    code: z
      .string()
      .trim()
      .transform((s) => s.toUpperCase())
      .pipe(
        z.union([
          z.literal(''),
          z.string().regex(/^[A-Z0-9_-]{1,32}$/, i18n.t('departments:codeInvalid')),
        ]),
      ),
    name: z.string().trim().min(1).max(255),
    type: z.enum(DEPARTMENT_TYPES),
    headUserId: z.string().min(1).nullable().optional(),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+ ]{6,32}$/, i18n.t('departments:phoneInvalid'))
      .or(z.literal(''))
      .optional(),
    location: z.string().trim().max(255).optional(),
    sortOrder: z.coerce.number().int().min(0).default(0),
    isActive: z.boolean().default(true),
  })

export type DepartmentFormValues = z.input<ReturnType<typeof departmentSchema>>
export type DepartmentFormOutput = z.output<ReturnType<typeof departmentSchema>>
