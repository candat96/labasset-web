import { z } from 'zod'

const optionalText = z.string()
const optionalId = z.string().nullable()

export const equipmentSchema = z.object({
  code: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .pipe(z.union([z.literal(''), z.string().regex(/^[A-Z0-9_-]{1,32}$/, 'Mã A–Z, số, _ hoặc -')])),
  name: z.string().trim().min(1, 'Bắt buộc').max(255),
  model: optionalText,
  serial: optionalText,
  assetCode: optionalText,
  manufacturerId: optionalId,
  supplierId: optionalId,
  countryOfOrigin: optionalText,
  manufactureYear: z.union([z.literal(''), z.number().int().min(1900).max(2100)]),
  receivedAt: optionalText,
  commissionedAt: optionalText,
  fundingSourceId: optionalId,
  originalValue: optionalText,
  warrantyUntil: optionalText,
  purchaseContractNo: optionalText,
  decisionNo: optionalText,
  groupId: optionalId,
  departmentId: optionalId,
  location: optionalText,
  deptContactUserId: optionalId,
  staffInChargeUserId: optionalId,
  testTypes: optionalText,
  throughputPerHour: z.union([z.literal(''), z.number().int().min(0)]),
  notes: optionalText,
  specs: z.object({
    voltage: optionalText,
    power: optionalText,
    dimensions: optionalText,
    weight: optionalText,
    env: z.object({
      temp: optionalText,
      humidity: optionalText,
      ups: optionalText,
      water: optionalText,
      gas: optionalText,
    }),
  }),
})
export type EquipmentForm = z.infer<typeof equipmentSchema>

export const accessorySchema = z.object({
  code: optionalText,
  name: z.string().trim().min(1, 'Bắt buộc'),
  type: z.enum(['power_cable', 'data_cable', 'tube', 'probe', 'ups', 'other']),
  quantity: z.union([z.literal(''), z.number().int().min(1)]),
  condition: z.enum(['good', 'worn', 'broken']),
  replacedAt: optionalText,
  notes: optionalText,
})
export type AccessoryForm = z.infer<typeof accessorySchema>

export const softwareSchema = z.object({
  name: z.string().trim().min(1, 'Bắt buộc'),
  version: optionalText,
  updatedOn: optionalText,
  licenseExpiresAt: optionalText,
  licenseKey: optionalText,
  notes: optionalText,
})
export type SoftwareForm = z.infer<typeof softwareSchema>

export const componentSchema = z.object({
  name: z.string().trim().min(1, 'Bắt buộc'),
  componentTypeId: optionalId,
  partNo: optionalText,
  serial: optionalText,
  installedAt: optionalText,
  lifespanHours: z.union([z.literal(''), z.number().int().min(0)]),
  lifespanTests: z.union([z.literal(''), z.number().int().min(0)]),
  lifespanMonths: z.union([z.literal(''), z.number().int().min(0)]),
  notes: optionalText,
})
export type ComponentForm = z.infer<typeof componentSchema>
