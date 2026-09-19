import { z } from 'zod'

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

export const completeSchema = z.object({
  resolutionSummary: z.string().trim().min(1, 'Bắt buộc'),
  postRepairWarrantyUntil: z.string(),
  calibrationRequired: z.boolean(),
  propose: z.boolean(),
  proposeTitle: z.string(),
  proposeInstruction: z.string(),
})
export type CompleteForm = z.infer<typeof completeSchema>

export const acceptanceSchema = z.object({
  accepted: z.boolean(),
  rating: z.union([z.literal(''), z.number().int().min(1).max(5)]),
  note: z.string(),
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
    quantity: z.string().trim().min(1, 'Bắt buộc'),
    unitCost: z.string(),
    supplyId: z.string().nullable(),
    stockLotId: z.string().nullable(),
    invoiceFileId: z.string().nullable(),
    componentId: z.string().nullable(),
    newSerial: z.string(),
    note: z.string(),
    reason: z.string(),
  })
  .superRefine((value, ctx) => {
    if (value.source === 'stock' && !value.supplyId)
      ctx.addIssue({ code: 'custom', path: ['supplyId'], message: 'Bắt buộc' })
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
  quotationAmount: z.string(),
  quotationFileId: z.string().nullable(),
  contractNo: z.string(),
  visitAt: z.string(),
  note: z.string(),
})
export type VendorForm = z.infer<typeof vendorSchema>

export const costSchema = z.object({
  category: z.enum(['parts', 'labor', 'service', 'transport', 'other']),
  description: z.string().trim().min(1, 'Bắt buộc'),
  amount: z.string().trim().min(1, 'Bắt buộc'),
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
