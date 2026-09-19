import type { components } from '@/api/schema'

export type Fault = components['schemas']['FaultListItemDto']
export type FaultDetail = components['schemas']['FaultResponseDto']
export type FaultPage = components['schemas']['FaultPageDto']
export type CreateFault = components['schemas']['CreateFaultDto']
export type UpdateFault = components['schemas']['UpdateFaultDto']
export type FaultStatus = Fault['status']
export type FaultSeverity = Fault['severity']
export type FaultScope = Fault['scope']
export type FaultProposal = components['schemas']['FaultProposalResponseDto']
export type FaultVersion = components['schemas']['FaultVersionListItemDto']
export type FaultHistory = components['schemas']['FaultHistoryDto']

export const FAULT_STATUSES: FaultStatus[] = ['draft', 'published', 'archived']
export const FAULT_SEVERITIES: FaultSeverity[] = ['low', 'medium', 'high', 'critical']
export const FAULT_SCOPES: FaultScope[] = ['model', 'group', 'all']

export interface FaultListParams {
  page?: number
  limit?: number
  q?: string
  model?: string
  manufacturerId?: string
  groupId?: string
  errorCode?: string
  severity?: FaultSeverity
  status?: FaultStatus
  sort?: 'relevance' | 'viewCount' | 'updatedAt'
}
