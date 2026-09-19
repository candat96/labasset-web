import { z } from 'zod'
import i18n from '@/lib/i18n'

const rule = () => i18n.t('auth:passwordRule')
const mismatch = () => i18n.t('auth:passwordMismatch')

/** ≥8 ký tự, có chữ và số (theo mô tả DTO của API). */
export const passwordSchema = () =>
  z
    .string()
    .min(8, rule())
    .regex(/[A-Za-z]/, rule())
    .regex(/\d/, rule())

export const loginSchema = (multi: boolean) =>
  z.object({
    hospitalCode: multi ? z.string().trim().min(1) : z.string().optional(),
    username: z.string().trim().min(1),
    password: z.string().min(1),
  })
export type LoginValues = z.infer<ReturnType<typeof loginSchema>>

export const otpSchema = z.object({ code: z.string().regex(/^\d{6}$/, 'Mã OTP gồm 6 chữ số') })
export type OtpValues = z.infer<typeof otpSchema>

export const forgotSchema = (multi: boolean) =>
  z.object({
    hospitalCode: multi ? z.string().trim().min(1) : z.string().optional(),
    username: z.string().trim().min(1),
  })
export type ForgotValues = z.infer<ReturnType<typeof forgotSchema>>

export const resetSchema = () =>
  z
    .object({ next: passwordSchema(), confirm: z.string() })
    .refine((v) => v.next === v.confirm, { path: ['confirm'], message: mismatch() })
export type ResetValues = z.infer<ReturnType<typeof resetSchema>>

export const changeSchema = () =>
  z
    .object({ current: z.string().min(1), next: passwordSchema(), confirm: z.string() })
    .refine((v) => v.next === v.confirm, { path: ['confirm'], message: mismatch() })
export type ChangeValues = z.infer<ReturnType<typeof changeSchema>>
