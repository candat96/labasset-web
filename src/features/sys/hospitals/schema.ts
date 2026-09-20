import { z } from 'zod'
import i18n from '@/lib/i18n'

export const hospitalSchema = z.object({
  code: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9_]{2,32}$/, i18n.t('sys:hospital.errors.code'))),
  name: z.string().trim().min(1).max(255),
  plan: z.enum(['standard', 'pro']),
  maxUsers: z.union([z.literal(''), z.number().int().min(1)]).nullable(),
  licenseExpiresAt: z.string(),
  contactName: z.string(),
  contactEmail: z.union([z.literal(''), z.email(i18n.t('sys:hospital.errors.email'))]),
  contactPhone: z.string(),
  notes: z.string(),
})
export type HospitalValues = z.infer<typeof hospitalSchema>
