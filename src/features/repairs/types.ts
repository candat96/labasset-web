import type { components } from '@/api/schema'

export type Repair = components['schemas']['RepairSummaryDto']
export type RepairDetail = components['schemas']['RepairDetailDto']
export type RepairPage = components['schemas']['RepairPageDto']
export type CreateRepair = components['schemas']['CreateRepairDto']
export type UpdateRepair = components['schemas']['UpdateRepairDto']
export type RepairAssignment = components['schemas']['RepairAssignmentResponseDto']
export type RepairLog = components['schemas']['RepairLogResponseDto']
export type RepairPart = components['schemas']['RepairPartResponseDto']
export type RepairVendor = components['schemas']['RepairVendorResponseDto']
export type RepairCost = components['schemas']['RepairCostResponseDto']
export type RepairStats = components['schemas']['RepairStatsDto']
export type RepairWorkload = components['schemas']['RepairWorkloadDto']
export type RepairSeverity = NonNullable<CreateRepair['severity']>

export const REPAIR_STATUSES = [
  'new',
  'accepted',
  'in_progress',
  'awaiting_parts',
  'awaiting_vendor',
  'completed',
  'acceptance',
  'closed',
  'cancelled',
] as const
export type RepairStatus = (typeof REPAIR_STATUSES)[number]

export const REPAIR_SEVERITIES: RepairSeverity[] = ['low', 'medium', 'high', 'critical']
export const WORK_STATUSES = ['in_progress', 'awaiting_parts', 'awaiting_vendor'] as const
export const OPEN_STATUSES = [
  'new',
  'accepted',
  'in_progress',
  'awaiting_parts',
  'awaiting_vendor',
] as const

export interface RepairListParams {
  page?: number
  limit?: number
  q?: string
  status?: string
  severity?: RepairSeverity
  assigneeId?: string
  departmentId?: string
  equipmentId?: string
  overdue?: boolean
  from?: string
  to?: string
}

export const RESOLUTION_TYPES = ['internal', 'vendor', 'warranty', 'spare_equipment'] as const
export type ResolutionType = (typeof RESOLUTION_TYPES)[number]

export const COST_CATEGORIES = ['parts', 'labor', 'service', 'transport', 'other'] as const
export const PART_SOURCES = ['stock', 'purchased', 'component_replace'] as const
