import { z } from 'zod'
import i18n from '@/lib/i18n'

export const evaluationSchema = z
  .object({
    periodFrom: z.string().min(1),
    periodTo: z.string().min(1),
    deliveryScore: z.number().min(0).max(10),
    qualityScore: z.number().min(0).max(10),
    documentScore: z.number().min(0).max(10),
    supportScore: z.number().min(0).max(10),
    note: z.string().max(4000).optional(),
  })
  .refine((value) => !value.periodFrom || !value.periodTo || value.periodTo >= value.periodFrom, {
    path: ['periodTo'],
    message: i18n.t('suppliers:periodInvalid'),
  })

export type EvaluationForm = z.infer<typeof evaluationSchema>
