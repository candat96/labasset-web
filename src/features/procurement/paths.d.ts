/**
 * Hợp đồng API module Dự trù (E1a).
 * - T2 (14f42ca) đã có thật: kỳ, phiếu, dòng, gợi ý, import, my → tham chiếu
 *   `components['schemas']` từ `src/api/schema.d.ts` (sinh bằng `npm run api:gen`).
 * - T3–T5 CHƯA có: summary, consolidation, approve/close/consolidate/clone,
 *   export.xlsx/proposal.pdf, `/v1/me/tasks.demand` → giữ type tay theo spec §6,
 *   xoá dần khi backend commit T3+ (lệch ghi trong WEB-NOTES).
 * Lưu ý: một số field trong swagger backend còn bị khai mất schema (sinh ra
 * `Record<string, never>`), ví dụ `itemName`/`spec`/`supplyId`/`unitPriceEst` —
 * trong file này chuẩn hoá về type thật (string) để call site dùng bình thường.
 */

import type { components } from '@/api/schema'

type S = components['schemas']

// ==== Types thật (backend T2) ====
export type DemandPeriodKind = 'annual' | 'quarterly' | 'adhoc'
export type DemandPeriodStatus =
  'draft' | 'collecting' | 'consolidating' | 'approved' | 'closed' | 'cancelled'
export type DemandRequestStatus = 'draft' | 'submitted' | 'dept_approved' | 'returned' | 'accepted'
export type DemandItemType = 'supply' | 'component' | 'equipment' | 'service'
export type DemandPriority = 'normal' | 'high' | 'urgent'
export type DemandDecision = 'buy' | 'from_stock' | 'reject'
export type DemandSuggestionBasis = 'consumption' | 'min_stock'

/** Kỳ chi tiết (GET /periods/{id}, POST tạo) — T2 thật, thêm totals (T3+) khi có.
 *  progress bắt buộc ở DetailDto, nhưng item trong danh sách GET /periods không có
 *  progress → đánh dấu optional để dùng chung một kiểu cho list + detail. */
export type DemandPeriod = Omit<S['DemandPeriodDetailDto'], 'progress'> & {
  progress?: S['DemandPeriodProgressDto']
  /** T3+ (summary) chưa có — tạm undefined; xoá khi backend trả totals */
  totalRequested?: string
  totalApproved?: string
}

/** Kỳ (danh sách — GET /periods) — không có progress */
export type DemandPeriodListItem = Pick<
  S['DemandPeriodResponseDto'],
  | 'id'
  | 'code'
  | 'name'
  | 'kind'
  | 'year'
  | 'quarter'
  | 'buckets'
  | 'submitDeadline'
  | 'status'
  | 'notes'
  | 'approvedBy'
  | 'closedAt'
> & {
  /** T3+ — progress rỗng ở list */
  progress?: { total: number; submitted: number; deptApproved: number; accepted: number }
  totalApproved?: string
}

export type DemandPeriodPage = S['DemandPeriodPageDto']
export type DemandPeriodProgress = S['DemandPeriodProgressDto']

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

/** Phiếu các khoa (GET /periods/{id}/requests) — item trong DemandRequestSummaryPageDto */
export type DemandRequestSummary = S['DemandDepartmentSummaryDto']
export type DemandRequestSummaryPage = S['DemandRequestSummaryPageDto']

/** Phiếu chi tiết (GET/PATCH /requests/{id}, /my) */
export type DemandRequest = S['DemandRequestDetailDto']
export type DemandRequestPage = S['DemandRequestPageDto']

export interface CreateAcceptLineDto {
  id: string
  qtyApproved: string
  approverNote?: string
}
/** AcceptRequestDto trong swagger chỉ khai `lines?` không gõ phần tử — chuẩn hoá tay */
export interface AcceptRequestDto {
  lines?: CreateAcceptLineDto[]
}

export interface DemandLineSuggestInput {
  departmentId: string
  supplyId: string
  periodKind: DemandPeriodKind
}

export interface DemandLineImportResult {
  imported: number
  errors: { row?: number; message?: string; field?: string }[]
}

export interface DemandPeriodOperations {
  createRequests?: number
}

export interface DemandDepartmentLite {
  id: string
  code: string
  name: string
}

/** Dòng dự trù (DemandLineResponseDto) — swagger thiếu nested supply/equipment */
export interface DemandLine extends Omit<S['DemandLineResponseDto'], 'suggestion'> {
  suggestion?: {
    consumption12m?: string
    avgMonthly?: string
    onHand?: string
    runwayDays?: number
    minStock?: string
    maxStock?: string
    lastUnitPrice?: string
    basis?: DemandSuggestionBasis
  } | null
  suggestedQty?: string | null
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

export type UpdateDemandLineDto = Partial<CreateDemandLineDto>
export interface UpdateDemandLineRowDto extends CreateDemandLineDto {
  id: string
}

// ==== T4 thật (api:gen 2026-09-22) ====
export type DemandConsolidation = S['DemandConsolidationRowDto']
export type DemandConsolidationList = S['DemandConsolidationListDto']
export type DemandSummary = S['DemandSummaryDto']
export type DemandSummaryByItemType = S['DemandSummaryByItemTypeDto']
export type CloseResult = S['CloseResultDto']
/** `note` trong swagger còn Serialized Record<string,never> — chuẩn hoá chuỗi. */
export type UpdateConsolidationDto = Omit<S['UpdateConsolidationDto'], 'note'> & {
  note?: string
}

// ==== T5 chưa có — type tay theo spec §6 ====
export interface DemandPeriodSummary {
  departments: number
  submitted: number
  deptApproved: number
  accepted: number
  totalRequested: string
  totalApproved: string
  byItemType: { supply: string; component: string; equipment: string; service: string }
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

interface DemandPaginated<TItem> {
  items: TItem[]
  total: number
  page: number
  limit: number
}

export type DemandPaths = {
  '/v1/demand/periods': {
    get: {
      parameters: {
        query?: { year?: number; status?: string; page?: number; limit?: number }
      }
      responses: { 200: DemandPaginated<DemandPeriodListItem> }
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
  // T4 thật: POST consolidate — skipUnsubmitted truyền qua query, trả luôn danh sách tổng hợp.
  '/v1/demand/periods/{id}/consolidate': {
    post: {
      parameters: {
        path: { id: string }
        query?: { skipUnsubmitted?: boolean }
      }
      responses: { 200: DemandConsolidationList }
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
      responses: { 200: CloseResult }
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
      requestBody: {
        content: {
          'application/json': {
            name: string
            kind: DemandPeriodKind
            year: number
            quarter?: number
            submitDeadline?: string
            notes?: string
          }
        }
      }
      responses: { 200: DemandPeriod }
    }
  }
  '/v1/demand/periods/{id}/requests': {
    get: {
      parameters: { path: { id: string } }
      responses: { 200: DemandRequestSummaryPage }
    }
  }
  '/v1/demand/periods/{id}/summary': {
    get: {
      parameters: { path: { id: string } }
      responses: { 200: DemandSummary }
    }
  }
  '/v1/demand/periods/{id}/consolidation': {
    get: {
      parameters: { path: { id: string } }
      responses: { 200: DemandConsolidationList }
    }
  }
  '/v1/demand/periods/{id}/consolidation/rebuild': {
    post: {
      parameters: { path: { id: string } }
      responses: { 200: DemandConsolidationList }
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
      requestBody: { content: { 'application/json': UpdateConsolidationDto } }
      responses: { 200: DemandConsolidationList }
    }
  }
  // T2 thật — GET /my trả trang phiếu của khoa mình (không còn {toSubmit,...})
  '/v1/demand/my': {
    get: {
      parameters: {
        query?: { status?: string; page?: number; limit?: number }
      }
      responses: { 200: DemandRequestPage }
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
    post: { parameters: { path: { id: string } }; responses: { 200: DemandRequest } }
  }
  '/v1/demand/requests/{id}/dept-approve': {
    post: { parameters: { path: { id: string } }; responses: { 200: DemandRequest } }
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
      requestBody: { content: { 'application/json': AcceptRequestDto } }
      responses: { 200: DemandRequest }
    }
  }
  '/v1/demand/requests/{id}/suggest-all': {
    post: { parameters: { path: { id: string } }; responses: { 200: DemandRequest } }
  }
  '/v1/demand/requests/{id}/lines': {
    post: {
      parameters: { path: { id: string } }
      requestBody: { content: { 'application/json': unknown } }
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
    get: { responses: { 200: Blob } }
  }
  '/v1/demand/lines/{lineId}': {
    patch: {
      parameters: { path: { lineId: string } }
      requestBody: { content: { 'application/json': unknown } }
      responses: { 200: DemandLine }
    }
    delete: { parameters: { path: { lineId: string } }; responses: { 200: DemandRequest } }
  }
  '/v1/demand/lines/suggest': {
    post: {
      requestBody: { content: { 'application/json': DemandLineSuggestInput } }
      responses: {
        200: { suggestedQty: string | null; suggestion?: { [key: string]: unknown } | null }
      }
    }
  }
}
