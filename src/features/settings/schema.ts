import { z } from 'zod'

export const settingsSchema = z.object({
  hospital: z.object({
    name: z.string().max(255),
    address: z.string().max(1000),
    logoFileId: z.string().nullable(),
  }),
  approval: z.object({
    levels: z.union([z.literal(1), z.literal(2)], { error: 'Chọn 1 hoặc 2 cấp' }),
  }),
  repair: z.object({
    requireAcceptance: z.boolean(),
    sla: z.object({
      low: z.number().positive(),
      medium: z.number().positive(),
      high: z.number().positive(),
      critical: z.number().positive(),
    }),
  }),
  requests: z.object({
    restrictToCompatible: z.boolean(),
  }),
  stock: z.object({
    defaultWarehouseId: z.string().nullable(),
    cancelWindowDays: z.number().int().min(0),
  }),
  alerts: z.object({
    stockMinEnabled: z.boolean(),
    expiryDaysBefore: z.number().int().min(0),
    maintenanceDaysBefore: z.number().int().min(0),
    calibrationDaysBefore: z.number().int().min(0),
    repairCostPctOfValue: z.number().min(0).max(100),
  }),
  maintenance: z.object({
    dueGraceDays: z.number().int().min(0),
  }),
})
export type SettingsForm = z.infer<typeof settingsSchema>
