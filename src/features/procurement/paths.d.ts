/**
 * Hợp đồng API tạm cho module Dự trù (E1a) theo spec 2026-09-21-du-tru-design.md §6.
 * Backend chưa xong → type tay kiểu `paths` của openapi-typescript.
 * Khi labasset-api commit T2+ → `npm run api:gen` và chuyển sang `api` +
 * `components['schemas']` thật, xoá file này.
 */

export type DemandPeriodKind = 'annual' | 'quarterly' | 'adhoc'
export type DemandPeriodStatus =
  'draft' | 'collecting' | 'consolidating' | 'approved' | 'closed' | 'cancelled'
export type DemandRequestStatus = 'draft' | 'submitted' | 'dept_approved' | 'returned' | 'accepted'
export type DemandItemType = 'supply' | 'component' | 'equipment' | 'service'
export type DemandPriority = 'normal' | 'high' | 'urgent'
export type DemandDecision = 'buy' | 'from_stock' | 'reject'
export type DemandSuggestionBasis = 'consumption' | 'min_stock'

export interface DemandSuggestion {
  consumption12m?: string
  avgMonthly?: string
  onHand?: string
  runwayDays?: number
  minStock?: string
  maxStock?: string
  lastUnitPrice?: string
  basis?: DemandSuggestionBasis
}

export interface DemandPeriod {
  id: string
  code: string
  name: string
  kind: DemandPeriodKind
  year: number
  quarter?: number
  /** 12 (12 tháng) | 4 (4 quý) | 1 (tổng) */
  buckets: 12 | 4 | 1
  submitDeadline?: string
  status: DemandPeriodStatus
  notes?: string
  approvedBy?: string
  approvedAt?: string
  consolidatedAt?: string
  closedAt?: string
  createdAt: string
  updatedAt: string
  progress?: { departments: number; submitted: number; deptApproved: number; accepted: number }
  totalRequested?: string
  totalApproved?: string
}

export interface CreateDemandPeriodDto {
  name: string
  kind: DemandPeriodKind
  year: number
  quarter?: number
  submitDeadline?: string
  notes?: string
}

export interface UpdateDemandPeriodDto {
  name?: string
  submitDeadline?: string
  notes?: string
}

export interface DemandPeriodSummary {
  departments: number
  submitted: number
  deptApproved: number
  accepted: number
  totalRequested: string
  totalApproved: string
  byItemType: { supply: string; component: string; equipment: string; service: string }
}

export interface DemandPeriodOperations {
  createRequests?: number
}

export interface DemandDepartmentLite {
  id: string
  code: string
  name: string
}

export interface DemandLine {
  id: string
  requestId: string
  itemType: DemandItemType
  supplyId?: string
  supply?: { id: string; code: string; name: string; unit?: string }
  equipmentId?: string
  equipment?: { id: string; code: string; name: string }
  itemName: string
  spec?: string
  unit: string
  qtyByBucket: string[]
  qtyRequested: string
  unitPriceEst: string
  amountEst: string
  reason?: string
  priority: DemandPriority
  suggestedQty?: string
  suggestion?: DemandSuggestion
  qtyApproved?: string
  approverNote?: string
  sortOrder: number
}

export interface CreateDemandLineDto {
  itemType: DemandItemType
  supplyId?: string
  equipmentId?: string
  itemName?: string
  spec?: string
  unit?: string
  qtyByBucket: string[]
  unitPriceEst?: string
  reason?: string
  priority?: DemandPriority
}

export type UpdateDemandLineDto = CreateDemandLineDto & Partial<CreateDemandLineDto>
export interface UpdateDemandLineRowDto extends CreateDemandLineDto {
  id: string
}

export interface DemandRequest {
  id: string
  periodId: string
  departmentId: string
  department: DemandDepartmentLite
  status: DemandRequestStatus
  createdBy?: string
  createdAt: string
  submittedAt?: string
  deptApprovedBy?: string
  deptApprovedAt?: string
  returnReason?: string
  totalEstimated: string
  lineCount?: number
  notes?: string
  period?: DemandPeriod
  lines?: DemandLine[]
}

export interface AcceptDemandLineDto {
  id: string
  qtyApproved: string
  approverNote?: string
}

export interface DemandLineSuggestInput {
  departmentId: string
  supplyId: string
  periodId: string
}

export interface DemandConsolidationBreakdown {
  departmentId: string
  departmentName?: string
  requestId: string
  lineId: string
  qtyRequested: string
  qtyApproved: string
}

export interface DemandConsolidation {
  id: string
  periodId: string
  key: string
  itemType: DemandItemType
  supplyId?: string
  itemName: string
  spec?: string
  unit?: string
  qtyRequested: string
  qtyApproved: string
  unitPricePlan: string
  amountPlan: string
  breakdown: DemandConsolidationBreakdown[]
  decision: DemandDecision
  suggestedDecision?: DemandDecision
  note?: string
  sortOrder: number
}

export interface UpdateDemandConsolidationDto {
  qtyApproved?: string
  breakdown?: { lineId: string; qtyApproved: string }[]
  unitPricePlan?: string
  decision?: DemandDecision
  note?: string
}

export interface DemandLineImportResult {
  imported: number
  errors: { row: number; message: string }[]
}

interface DemandPaginated<TItem> {
  items: TItem[]
  total: number
  page: number
  limit: number
}
export type DemandPaginated2<TItem> = DemandPaginated<TItem>

export type DemandPaths = {
  '/v1/demand/periods': {
    get: {
      parameters: {
        query?: {
          year?: number
          status?: DemandPeriodStatus
          page?: number
          limit?: number
        }
      }
      responses: { 200: DemandPaginated<DemandPeriod> }
    }
    post: {
      requestBody: { content: { 'application/json': CreateDemandPeriodDto } }
      responses: { 200: DemandPeriod }
    }
  }
  '/v1/demand/periods/{id}': {
    get: {
      parameters: { path: { id: string } }
      responses: { 200: DemandPeriod }
    }
    patch: {
      parameters: { path: { id: string } }
      requestBody: { content: { 'application/json': UpdateDemandPeriodDto } }
      responses: { 200: DemandPeriod }
    }
  }
  '/v1/demand/periods/{id}/open': {
    post: {
      parameters: { path: { id: string } }
      responses: { 200: DemandPeriod }
    }
  }
  '/v1/demand/periods/{id}/consolidate': {
    post: {
      parameters: { path: { id: string } }
      requestBody?: { content: { 'application/json': { skipUnsubmitted?: boolean } } }
      responses: { 200: DemandPeriod }
    }
  }
  '/v1/demand/periods/{id}/approve': {
    post: {
      parameters: { path: { id: string } }
      responses: { 200: DemandPeriod }
    }
  }
  '/v1/demand/periods/{id}/close': {
    post: {
      parameters: { path: { id: string } }
      responses: { 200: { period: DemandPeriod; createdRequests: number } }
    }
  }
  '/v1/demand/periods/{id}/cancel': {
    post: {
      parameters: { path: { id: string } }
      requestBody: { content: { 'application/json': { reason: string } } }
      responses: { 200: DemandPeriod }
    }
  }
  '/v1/demand/periods/{id}/clone': {
    post: {
      parameters: { path: { id: string } }
      responses: { 200: DemandPeriod }
    }
  }
  '/v1/demand/periods/{id}/requests': {
    get: {
      parameters: { path: { id: string } }
      responses: { 200: DemandRequest[] }
    }
  }
  '/v1/demand/periods/{id}/summary': {
    get: {
      parameters: { path: { id: string } }
      responses: { 200: DemandPeriodSummary }
    }
  }
  '/v1/demand/periods/{id}/consolidation': {
    get: {
      parameters: {
        path: { id: string }
        query?: { itemType?: DemandItemType; departmentId?: string; q?: string }
      }
      responses: { 200: DemandConsolidation[] }
    }
  }
  '/v1/demand/periods/{id}/consolidation/rebuild': {
    post: {
      parameters: { path: { id: string } }
      responses: { 200: DemandConsolidation[] }
    }
  }
  '/v1/demand/periods/{id}/export.xlsx': {
    get: {
      parameters: { path: { id: string } }
      responses: { 200: Blob }
    }
  }
  '/v1/demand/periods/{id}/proposal.pdf': {
    get: {
      parameters: { path: { id: string } }
      responses: { 200: Blob }
    }
  }
  '/v1/demand/consolidation/{id}': {
    patch: {
      parameters: { path: { id: string } }
      requestBody: { content: { 'application/json': UpdateDemandConsolidationDto } }
      responses: { 200: DemandConsolidation }
    }
  }
  '/v1/demand/my': {
    get: {
      responses: {
        200: {
          toSubmit: DemandRequest[]
          toApprove: DemandRequest[]
          toAccept: DemandRequest[]
        }
      }
    }
  }
  '/v1/demand/requests/{id}': {
    get: {
      parameters: { path: { id: string } }
      responses: { 200: DemandRequest }
    }
    patch: {
      parameters: { path: { id: string } }
      requestBody: { content: { 'application/json': { notes?: string } } }
      responses: { 200: DemandRequest }
    }
  }
  '/v1/demand/requests/{id}/submit': {
    post: { parameters: { path: { id: string } }; responses: DemandRequest }
  }
  '/v1/demand/requests/{id}/dept-approve': {
    post: { parameters: { path: { id: string } }; responses: DemandRequest }
  }
  '/v1/demand/requests/{id}/return': {
    post: {
      parameters: { path: { id: string } }
      requestBody: { content: { 'application/json': { reason: string } } }
      responses: { 200: DemandRequest }
    }
  }
  '/v1/demand/requests/{id}/accept': {
    post: {
      parameters: { path: { id: string } }
      requestBody: { content: { 'application/json': { lines?: AcceptDemandLineDto[] } } }
      responses: { 200: DemandRequest }
    }
  }
  '/v1/demand/requests/{id}/suggest-all': {
    post: { parameters: { path: { id: string } }; responses: DemandRequest }
  }
  '/v1/demand/requests/{id}/lines': {
    post: {
      parameters: { path: { id: string } }
      requestBody: { content: { 'application/json': CreateDemandLineDto } }
      responses: { 200: DemandLine }
    }
  }
  '/v1/demand/requests/{id}/lines/import': {
    post: {
      parameters: { path: { id: string } }
      requestBody: { content: { 'multipart/form-data': FormData } }
      responses: { 200: DemandLineImportResult }
    }
  }
  '/v1/demand/requests/template': {
    get: { responses: Blob }
  }
  '/v1/demand/lines/{lineId}': {
    patch: {
      parameters: { path: { lineId: string } }
      requestBody: { content: { 'application/json': UpdateDemandLineDto } }
      responses: { 200: DemandLine }
    }
    delete: { parameters: { path: { lineId: string } }; responses: void }
  }
  '/v1/demand/lines/suggest': {
    post: {
      requestBody: { content: { 'application/json': DemandLineSuggestInput } }
      responses: {
        200: { suggestedQty: string; qtyByBucket: string[]; suggestion?: DemandSuggestion }
      }
    }
  }
}
