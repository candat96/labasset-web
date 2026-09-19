import { z } from 'zod'

export const hospitalSchema = z.object({
  code: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9_]{2,32}$/, 'Mã 2–32 ký tự A–Z, số hoặc _')),
  name: z.string().trim().min(1, 'Bắt buộc').max(255),
  plan: z.enum(['standard', 'pro']),
  maxUsers: z.union([z.literal(''), z.number().int().min(1)]).nullable(),
  licenseExpiresAt: z.string(),
  contactName: z.string(),
  contactEmail: z.union([z.literal(''), z.email('Email không hợp lệ')]),
  contactPhone: z.string(),
  notes: z.string(),
})
export type HospitalValues = z.infer<typeof hospitalSchema>
