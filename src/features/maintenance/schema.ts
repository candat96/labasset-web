import { z } from 'zod'

export const templateItemSchema = z.object({
  key: z.string(),
  label: z.string().trim().min(1, 'Bắt buộc'),
  type: z.enum(['check', 'measure', 'text']),
  unit: z.string(),
  min: z.union([z.literal(''), z.number()]),
  max: z.union([z.literal(''), z.number()]),
  optional: z.boolean(),
})

export const templateSchema = z.object({
  name: z.string().trim().min(1, 'Bắt buộc'),
  groupId: z.string().nullable(),
  model: z.string(),
  isActive: z.boolean(),
  items: z.array(templateItemSchema).min(1, 'Cần ít nhất 1 mục'),
})
export type TemplateForm = z.infer<typeof templateSchema>

export const planSchema = z
  .object({
    name: z.string().trim().min(1, 'Bắt buộc'),
    target: z.enum(['equipment', 'group']),
    equipmentId: z.string().nullable(),
    groupId: z.string().nullable(),
    templateId: z.string().min(1, 'Bắt buộc'),
    cycleKind: z.enum(['months', 'days']),
    cycleValue: z.number().int().min(1),
    startDate: z.string().min(1, 'Bắt buộc'),
    endDate: z.string(),
    defaultAssigneeId: z.string().nullable(),
    source: z.enum(['internal', 'vendor_contract']),
    supplierId: z.string().nullable(),
    contractNo: z.string(),
    isActive: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.target === 'equipment' && !value.equipmentId)
      ctx.addIssue({ code: 'custom', path: ['equipmentId'], message: 'Bắt buộc' })
    if (value.target === 'group' && !value.groupId)
      ctx.addIssue({ code: 'custom', path: ['groupId'], message: 'Bắt buộc' })
  })
export type PlanForm = z.infer<typeof planSchema>

export const adhocSchema = z.object({
  equipmentId: z.string().min(1, 'Bắt buộc'),
  scheduledAt: z.string().min(1, 'Bắt buộc'),
  assigneeId: z.string().nullable(),
  templateId: z.string().nullable(),
  notes: z.string(),
})
export type AdhocForm = z.infer<typeof adhocSchema>
