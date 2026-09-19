import type { components } from '@/api/schema'

export type Equipment = components['schemas']['EquipmentListItemDto']
export type EquipmentDetail = components['schemas']['EquipmentDetailDto']
export type EquipmentPage = components['schemas']['EquipmentPageDto']
export type EquipmentStatus = NonNullable<components['schemas']['EquipmentStatusDto']['status']>
export const EQUIPMENT_STATUSES: EquipmentStatus[] = [
  'active',
  'broken',
  'awaiting_parts',
  'suspended',
  'retired',
  'disposed',
]
export const STATUS_TRANSITIONS: Record<EquipmentStatus, EquipmentStatus[]> = {
  active: ['broken', 'awaiting_parts', 'suspended', 'retired'],
  broken: ['active', 'awaiting_parts', 'retired'],
  awaiting_parts: ['active', 'broken', 'retired'],
  suspended: ['active', 'retired'],
  retired: ['disposed', 'active'],
  disposed: [],
}

export type CreateEquipment = components['schemas']['CreateEquipmentDto']
export type UpdateEquipment = components['schemas']['UpdateEquipmentDto']
export type Accessory = components['schemas']['AccessoryResponseDto']
export type Software = components['schemas']['SoftwareResponseDto']
export type ComponentRow = components['schemas']['ComponentResponseDto']
export type Transfer = components['schemas']['TransferResponseDto']
export type Counter = components['schemas']['CounterResponseDto']
export type EquipmentEvent = components['schemas']['EventResponseDto']
export type Network = components['schemas']['EquipmentNetworkResponseDto']

export interface EquipmentListParams {
  page?: number
  limit?: number
  q?: string
  departmentId?: string
  groupId?: string
  manufacturerId?: string
  staffId?: string
  status?: string
  maintenanceDueBefore?: string
  calibrationDueBefore?: string
  calibrationOverdue?: boolean
  sort?: 'code' | 'name' | 'status' | 'departmentId' | 'commissionedAt' | 'updatedAt'
  order?: 'asc' | 'desc'
}

export interface EquipmentSupplyLink {
  equipmentId?: string
  supplyId: string
  normQtyPerTest: string | null
  normQtyPerDay: string | null
  isPrimary: boolean
  notes: string | null
}
