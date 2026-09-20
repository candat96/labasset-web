import { z } from 'zod'
import { decimalString } from '@/lib/validation/decimal'

/** Chuỗi tiền VND (scale 0). `required` = bắt buộc nhập. */
function moneyString(required = false) {
  const base = decimalString({ maxScale: 0, min: '0' })
  return required ? base.min(1, 'Bắt buộc') : base
}

export const repairCreateSchema = z.object({
  equipmentId: z.string().min(1, 'Bắt buộc'),
  description: z.string().trim().min(1, 'Bắt buộc'),
  errorCode: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  equipmentDown: z.boolean(),
  reportedDepartmentId: z.string().nullable(),
  faultId: z.string().nullable(),
})
export type RepairCreateForm = z.infer<typeof repairCreateSchema>

export const diagnosisSchema = z.object({
  diagnosis: z.string().trim().min(1, 'Bắt buộc'),
  faultId: z.string().nullable(),
  faultGroupId: z.string().nullable(),
  resolutionType: z.enum(['internal', 'vendor', 'warranty', 'spare_equipment']).nullable(),
})
export type DiagnosisForm = z.infer<typeof diagnosisSchema>

export const assignSchema = z.object({
  primaryUserId: z.string().min(1, 'Bắt buộc'),
  assistantIds: z.array(z.string()),
  dueAt: z.string(),
})
export type AssignForm = z.infer<typeof assignSchema>

/** Trạng thái hợp lệ của `POST /:id/status` (RepairStatusDto). */
export const REPAIR_STATUS_OPTIONS = ['in_progress', 'awaiting_parts', 'awaiting_vendor'] as const

export const statusSchema = z.object({
  status: z.enum(REPAIR_STATUS_OPTIONS),
  // Backend yêu cầu note 1..2000 ký tự.
  note: z.string().trim().min(1, 'Bắt buộc'),
})
export type StatusForm = z.infer<typeof statusSchema>

/** Từ chối việc (respond declined) bắt buộc có lý do. */
export const declineSchema = z.object({
  note: z.string().trim().min(1, 'Bắt buộc'),
})
export type DeclineForm = z.infer<typeof declineSchema>

export const proposeStepSchema = z.object({
  instruction: z.string().trim().min(1, 'Bắt buộc'),
  expectedResult: z.string(),
  cautions: z.string(),
})

export const proposePartSchema = z.object({
  name: z.string().trim().min(1, 'Bắt buộc'),
  quantity: z.number().int().min(1),
  note: z.string(),
})

export const completeSchema = z
  .object({
    resolutionSummary: z.string().trim().min(1, 'Bắt buộc'),
    postRepairWarrantyUntil: z.string(),
    calibrationRequired: z.boolean(),
    propose: z.boolean(),
    proposeTitle: z.string(),
    proposeSymptoms: z.string(),
    proposeSteps: z.array(proposeStepSchema),
    proposeParts: z.array(proposePartSchema),
  })
  .superRefine((value, ctx) => {
    if (!value.propose) return
    if (!value.proposeTitle.trim())
      ctx.addIssue({ code: 'custom', path: ['proposeTitle'], message: 'Bắt buộc' })
    if (value.proposeSteps.length === 0)
      ctx.addIssue({ code: 'custom', path: ['proposeSteps'], message: 'Bắt buộc' })
  })
export type CompleteForm = z.infer<typeof completeSchema>

export const acceptanceSchema = z
  .object({
    accepted: z.boolean(),
    rating: z.union([z.literal(''), z.number().int().min(1).max(5)]),
    note: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.accepted && value.rating === '')
      ctx.addIssue({ code: 'custom', path: ['rating'], message: 'Bắt buộc' })
  })
export type AcceptanceForm = z.infer<typeof acceptanceSchema>

export const logSchema = z.object({
  action: z.string().trim().min(1, 'Bắt buộc'),
  note: z.string(),
  durationMinutes: z.union([z.literal(''), z.number().int().min(0)]),
  at: z.string(),
})
export type LogForm = z.infer<typeof logSchema>

export const partSchema = z
  .object({
    source: z.enum(['stock', 'purchased', 'component_replace']),
    name: z.string(),
    // RepairPartDto.quantity: số thập phân 1..4 chữ số, > 0 (web giới hạn 3).
    quantity: decimalString({ maxScale: 3, min: '0.001' }),
    unitCost: moneyString(),
    supplyId: z.string().nullable(),
    stockLotId: z.string().nullable(),
    invoiceFileId: z.string().nullable(),
    componentId: z.string().nullable(),
    newSerial: z.string(),
    reason: z.string(),
    cost: moneyString(),
    note: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.source === 'stock' && !value.supplyId)
      ctx.addIssue({ code: 'custom', path: ['supplyId'], message: 'Bắt buộc' })
    if (value.source === 'stock' && !value.quantity.trim())
      ctx.addIssue({ code: 'custom', path: ['quantity'], message: 'Bắt buộc' })
    if (value.source === 'purchased' && !value.name.trim())
      ctx.addIssue({ code: 'custom', path: ['name'], message: 'Bắt buộc' })
    if (value.source === 'component_replace' && !value.componentId)
      ctx.addIssue({ code: 'custom', path: ['componentId'], message: 'Bắt buộc' })
  })
export type PartForm = z.infer<typeof partSchema>

export const vendorSchema = z.object({
  supplierId: z.string().min(1, 'Bắt buộc'),
  engineerName: z.string(),
  engineerPhone: z.string(),
  quotationAmount: moneyString(),
  quotationFileId: z.string().nullable(),
  contractNo: z.string(),
  visitAt: z.string(),
  note: z.string(),
})
export type VendorForm = z.infer<typeof vendorSchema>

export const costSchema = z.object({
  category: z.enum(['parts', 'labor', 'service', 'transport', 'other']),
  description: z.string().trim().min(1, 'Bắt buộc'),
  amount: moneyString(true),
  invoiceNo: z.string(),
  invoiceDate: z.string(),
  paidAt: z.string(),
})
export type CostForm = z.infer<typeof costSchema>

export const editRepairSchema = z.object({
  description: z.string().trim().min(1, 'Bắt buộc'),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  equipmentDown: z.boolean(),
})
export type EditRepairForm = z.infer<typeof editRepairSchema>

export const signSchema = z.object({
  role: z.enum(['technician', 'department']),
  signerName: z.string().trim().min(1, 'Bắt buộc').max(255),
})
export type SignForm = z.infer<typeof signSchema>
