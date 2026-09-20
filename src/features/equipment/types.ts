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
export type SoftwareHistory = components['schemas']['SoftwareHistoryResponseDto']
export type ComponentRow = components['schemas']['ComponentResponseDto']
export type ComponentReplacement = components['schemas']['ReplacementResponseDto']
export type Transfer = components['schemas']['TransferResponseDto']
export type Counter = components['schemas']['CounterResponseDto']
export type EquipmentEvent = components['schemas']['EventResponseDto']
export type Network = components['schemas']['EquipmentNetworkResponseDto']
export type Runway = components['schemas']['RunwayResponseDto']
export type RunwayItem = components['schemas']['RunwayItemDto']
export type EquipmentComparison = components['schemas']['EquipmentComparisonDto']
export type StatusHistory = components['schemas']['StatusHistoryResponseDto']

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
