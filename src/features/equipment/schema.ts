import { z } from 'zod'
import { decimalString } from '@/lib/validation/decimal'

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
  originalValue: decimalString({ maxScale: 0, min: '0' }),
  warrantyUntil: optionalText,
  purchaseContractNo: optionalText,
  decisionNo: optionalText,
  circulationNo: optionalText,
  groupId: optionalId,
  departmentId: optionalId,
  roomId: optionalId,
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

/** Tạo mới: Khoa/Phòng ban và Phòng bắt buộc (API không bắt `roomId` — quyết định UX, xem 09-rooms). */
export const equipmentCreateSchema = equipmentSchema.superRefine((values, ctx) => {
  if (!values.departmentId)
    ctx.addIssue({ code: 'custom', path: ['departmentId'], message: 'Bắt buộc' })
  if (!values.roomId) ctx.addIssue({ code: 'custom', path: ['roomId'], message: 'Bắt buộc' })
})

export const accessorySchema = z.object({
  code: optionalText,
  name: z.string().trim().min(1, 'Bắt buộc').max(255),
  type: z.enum(['power_cable', 'data_cable', 'tube', 'probe', 'ups', 'other']),
  quantity: z.union([z.literal(''), z.number().int().min(1, 'Tối thiểu 1')]),
  condition: z.enum(['good', 'worn', 'broken']),
  replacedAt: optionalText,
  notes: optionalText,
})
export type AccessoryForm = z.infer<typeof accessorySchema>

export const softwareSchema = z.object({
  name: z.string().trim().min(1, 'Bắt buộc').max(255),
  version: optionalText,
  updatedOn: optionalText,
  licenseExpiresAt: optionalText,
  licenseKey: optionalText,
  notes: optionalText,
})
export type SoftwareForm = z.infer<typeof softwareSchema>

export const softwareUpgradeSchema = z.object({
  toVersion: z.string().trim().min(1, 'Bắt buộc').max(128),
  note: optionalText,
})
export type SoftwareUpgradeForm = z.infer<typeof softwareUpgradeSchema>

export const componentSchema = z.object({
  name: z.string().trim().min(1, 'Bắt buộc').max(255),
  componentTypeId: optionalId,
  partNo: optionalText,
  serial: optionalText,
  installedAt: optionalText,
  lifespanHours: z.union([z.literal(''), z.number().int().min(1, 'Tối thiểu 1')]),
  lifespanTests: z.union([z.literal(''), z.number().int().min(1, 'Tối thiểu 1')]),
  lifespanMonths: z.union([z.literal(''), z.number().int().min(1, 'Tối thiểu 1')]),
  notes: optionalText,
})
export type ComponentForm = z.infer<typeof componentSchema>

export const replaceComponentSchema = z.object({
  reason: z.string().trim().min(1, 'Bắt buộc').max(2000),
  newSerial: optionalText,
  cost: decimalString({ maxScale: 0, min: '0' }),
  repairTicketId: optionalId,
  replacedAt: optionalText,
})
export type ReplaceComponentForm = z.infer<typeof replaceComponentSchema>

export const supplyRowSchema = z.object({
  supplyId: z.string(),
  normQtyPerDay: decimalString({ maxScale: 4, min: '0' }),
  normQtyPerTest: decimalString({ maxScale: 4, min: '0' }),
  isPrimary: z.boolean(),
  notes: optionalText,
})
export const suppliesSchema = z.object({ rows: z.array(supplyRowSchema) })
export type SuppliesForm = z.infer<typeof suppliesSchema>

export const counterSchema = z.object({
  recordedAt: optionalText,
  runHours: decimalString({ maxScale: 2, min: '0' }),
  testCount: z.union([z.literal(''), z.number().int().min(0)]),
  note: optionalText,
})
export type CounterForm = z.infer<typeof counterSchema>

export const statusChangeSchema = z.object({
  status: z.enum(['active', 'broken', 'awaiting_parts', 'suspended', 'retired', 'disposed']),
  reason: z.string().trim().min(1, 'Bắt buộc').max(2000),
})
export type StatusChangeForm = z.infer<typeof statusChangeSchema>

export const cloneSchema = z.object({
  code: z.union([
    z.literal(''),
    z
      .string()
      .trim()
      .pipe(
        z.string().regex(/^[\p{L}\p{N}._\-[\]()+/ ;]{1,128}$/u, 'Mã: chữ, số, . _ - [ ] ( ) + / ;'),
      ),
  ]),
  name: optionalText,
  serial: optionalText,
})
export type CloneForm = z.infer<typeof cloneSchema>

export const transferSchema = z.object({
  toDepartmentId: z.string().min(1, 'Bắt buộc'),
  toRoomId: optionalId,
  toLocation: optionalText,
  reason: z.string().trim().min(1, 'Bắt buộc').max(2000),
})
export type TransferForm = z.infer<typeof transferSchema>
