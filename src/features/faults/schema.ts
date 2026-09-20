import { z } from 'zod'

const optionalText = z.string()
const optionalId = z.string().nullable()

export const faultStepSchema = z.object({
  order: z.number().int().min(1),
  instruction: z.string().trim().min(1, 'Bắt buộc'),
  expectedResult: optionalText,
  cautions: optionalText,
  imageFileId: optionalId,
})

export const faultPartSchema = z.object({
  name: z.string().trim().min(1, 'Bắt buộc'),
  // API (FaultPartDto) yêu cầu số nguyên ≥ 1.
  quantity: z.number().int().min(1),
  note: optionalText,
  componentTypeId: optionalId,
  supplyId: optionalId,
})

export const faultSchema = z
  .object({
    scope: z.enum(['model', 'group', 'all']),
    model: optionalText,
    groupId: optionalId,
    manufacturerId: optionalId,
    errorCode: optionalText,
    title: z.string().trim().min(1, 'Bắt buộc').max(255),
    symptoms: optionalText,
    causes: optionalText,
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    estMinutes: z.union([z.literal(''), z.number().int().min(0)]),
    faultGroupId: optionalId,
    steps: z.array(faultStepSchema),
    parts: z.array(faultPartSchema),
  })
  .superRefine((value, ctx) => {
    if (value.scope === 'model' && !value.model.trim()) {
      ctx.addIssue({ code: 'custom', path: ['model'], message: 'Bắt buộc với phạm vi model' })
    }
    if (value.scope === 'group' && !value.groupId) {
      ctx.addIssue({ code: 'custom', path: ['groupId'], message: 'Bắt buộc với phạm vi nhóm' })
    }
  })

export type FaultForm = z.infer<typeof faultSchema>
