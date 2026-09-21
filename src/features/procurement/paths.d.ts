/**
 * Types module Dự trù (E1a) — sinh từ OpenAPI thật của `labasset-api`
 * (`npm run api:gen` → `src/api/schema.d.ts`, backend T1–T5 @ fdfc1a4, 27 path
 * `/v1/demand/*`). Không còn type tay theo spec — mọi type gốc:
 *   - `paths`  → `api['paths'][...]` dùng cho `createClient` trong `api.ts`;
 *   - DTO      → `components['schemas']`.
 * Chỉ còn `Omit` chuẩn hoá chỗ swagger khai mất schema (`Record<string, never>`
 * vì field vẫn `@ApPropertyValue` không tag) — LIFECYCLE dùng chuỗi thật.
 */

import type { components } from '@/api/schema'

type S = components['schemas']

/**
 * Khai báo path riêng cho module demand (27 path `/v1/demand/*` thực tế của
 * backend, dùng `components['schemas']` từ `@/api/schema`). Note swagger lệch
 * thật — đã chuẩn hoá (chi tiết ở từng mục + WEB-NOTES mục 15):
 *  - DTO fields swagger mất `@ApiProperty` (`Record<string, never>`) → chuỗi;
 *  - `consolidate` nhận `skipUnsubmitted` ở **query**;
 *  - PATCH `/requests/{id}` body là A chỉ `{notes}` (swagger trỏ nhầm
 *    `UpdateRequestDto` của module C2 vì trùng tên);
 *  - `close` trả `{createdRequests}` (swagger dính tên `CloseResultDto` của
 *    module kiểm kế vì trùng tên);
 *  - `UpdateLineDto` là partial (swagger còn bắt buộc priority/unitPriceEst);
 *  - import multipart nhận `FormData` thật.
 */
export type DemandPaths = {
  '/v1/demand/periods': {
    get: {
      parameters: {
        query?: { year?: number; status?: string; page?: number; limit?: number }
      }
      responses: {
        200: {
          headers: { [name: string]: unknown }
          content: { 'application/json': DemandPeriodPage }
        }
      }
    }
    post: {
      requestBody: { content: { 'application/json': CreateDemandPeriodDto } }
      responses: {
        201: {
          headers: { [name: string]: unknown }
          content: { 'application/json': DemandPeriod }
        }
      }
    }
  }
  '/v1/demand/periods/{id}': {
    get: {
      parameters: { path: { id: string } }
      responses: {
        200: { headers: { [name: string]: unknown }; content: { 'application/json': DemandPeriod } }
      }
    }
    patch: {
      parameters: { path: { id: string } }
      requestBody: { content: { 'application/json': UpdateDemandPeriodDto } }
      responses: {
        200: { headers: { [name: string]: unknown }; content: { 'application/json': DemandPeriod } }
      }
    }
  }
  '/v1/demand/periods/{id}/open': {
    post: {
      parameters: { path: { id: string } }
      responses: {
        200: { headers: { [name: string]: unknown }; content: { 'application/json': DemandPeriod } }
      }
    }
  }
  // T4 thật: `skipUnsubmitted` truyền qua **query**, trả toàn bộ danh sách tổng hợp.
  '/v1/demand/periods/{id}/consolidate': {
    post: {
      parameters: { path: { id: string }; query?: { skipUnsubmitted?: string } }
      responses: {
        200: {
          headers: { [name: string]: unknown }
          content: { 'application/json': DemandConsolidationList }
        }
      }
    }
  }
  '/v1/demand/periods/{id}/approve': {
    post: {
      parameters: { path: { id: string } }
      responses: {
        200: { headers: { [name: string]: unknown }; content: { 'application/json': DemandPeriod } }
      }
    }
  }
  '/v1/demand/periods/{id}/cancel': {
    post: {
      parameters: { path: { id: string } }
      requestBody: { content: { 'application/json': { reason: string } } }
      responses: {
        200: { headers: { [name: string]: unknown }; content: { 'application/json': DemandPeriod } }
      }
    }
  }
  '/v1/demand/periods/{id}/close': {
    /** `{ createdRequests }` — không phải `CloseResultDto` trùng tên của kiểm kế. */
    post: {
      parameters: { path: { id: string } }
      responses: {
        200: {
          headers: { [name: string]: unknown }
          content: { 'application/json': { createdRequests: number } }
        }
      }
    }
  }
  '/v1/demand/periods/{id}/clone': {
    post: {
      parameters: { path: { id: string } }
      requestBody: { content: { 'application/json': CreateDemandPeriodDto } }
      responses: {
        201: {
          headers: { [name: string]: unknown }
          content: { 'application/json': DemandPeriod }
        }
      }
    }
  }
  '/v1/demand/periods/{id}/requests': {
    get: {
      parameters: {
        path: { id: string }
        query?: { status?: string; year?: number; page?: number; limit?: number }
      }
      responses: {
        200: {
          headers: { [name: string]: unknown }
          content: { 'application/json': DemandRequestSummaryPage }
        }
      }
    }
  }
  '/v1/demand/periods/{id}/summary': {
    get: {
      parameters: { path: { id: string } }
      responses: {
        200: {
          headers: { [name: string]: unknown }
          content: { 'application/json': DemandSummary }
        }
      }
    }
  }
  '/v1/demand/periods/{id}/consolidation': {
    get: {
      parameters: {
        path: { id: string }
        query?: { itemType?: string; departmentId?: string; q?: string }
      }
      responses: {
        200: {
          headers: { [name: string]: unknown }
          content: { 'application/json': DemandConsolidationList }
        }
      }
    }
  }
  '/v1/demand/periods/{id}/consolidation/rebuild': {
    post: {
      parameters: { path: { id: string } }
      responses: {
        200: {
          headers: { [name: string]: unknown }
          content: { 'application/json': DemandConsolidationList }
        }
      }
    }
  }
  '/v1/demand/periods/{id}/export.xlsx': {
    get: {
      parameters: { path: { id: string } }
      responses: {
        200: {
          headers: { [name: string]: unknown }
          content: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': Blob }
        }
      }
    }
  }
  '/v1/demand/periods/{id}/proposal.pdf': {
    get: {
      parameters: { path: { id: string } }
      responses: {
        200: { headers: { [name: string]: unknown }; content: { 'application/pdf': Blob } }
      }
    }
  }
  '/v1/demand/consolidation/{id}': {
    patch: {
      parameters: { path: { id: string } }
      requestBody: { content: { 'application/json': UpdateConsolidationDto } }
      responses: {
        200: {
          headers: { [name: string]: unknown }
          content: { 'application/json': DemandConsolidationList }
        }
      }
    }
  }
  '/v1/demand/my': {
    get: {
      parameters: {
        query?: { status?: string; page?: number; limit?: number }
      }
      responses: {
        200: {
          headers: { [name: string]: unknown }
          content: { 'application/json': DemandRequestPage }
        }
      }
    }
  }
  '/v1/demand/requests/{id}': {
    get: {
      parameters: { path: { id: string } }
      responses: {
        200: {
          headers: { [name: string]: unknown }
          content: { 'application/json': DemandRequest }
        }
      }
    }
    patch: {
      parameters: { path: { id: string } }
      requestBody: { content: { 'application/json': UpdateDemandRequestDto } }
      responses: {
        200: {
          headers: { [name: string]: unknown }
          content: { 'application/json': DemandRequest }
        }
      }
    }
  }
  '/v1/demand/requests/{id}/submit': {
    post: {
      parameters: { path: { id: string } }
      responses: {
        200: {
          headers: { [name: string]: unknown }
          content: { 'application/json': DemandRequest }
        }
      }
    }
  }
  '/v1/demand/requests/{id}/dept-approve': {
    post: {
      parameters: { path: { id: string } }
      responses: {
        200: {
          headers: { [name: string]: unknown }
          content: { 'application/json': DemandRequest }
        }
      }
    }
  }
  '/v1/demand/requests/{id}/return': {
    post: {
      parameters: { path: { id: string } }
      requestBody: { content: { 'application/json': { reason: string } } }
      responses: {
        200: {
          headers: { [name: string]: unknown }
          content: { 'application/json': DemandRequest }
        }
      }
    }
  }
  '/v1/demand/requests/{id}/accept': {
    post: {
      parameters: { path: { id: string } }
      requestBody: { content: { 'application/json': AcceptRequestDto } }
      responses: {
        200: {
          headers: { [name: string]: unknown }
          content: { 'application/json': DemandRequest }
        }
      }
    }
  }
  '/v1/demand/requests/{id}/suggest-all': {
    post: {
      parameters: { path: { id: string } }
      responses: {
        200: {
          headers: { [name: string]: unknown }
          content: { 'application/json': DemandRequest }
        }
      }
    }
  }
  '/v1/demand/requests/{id}/lines': {
    post: {
      parameters: { path: { id: string } }
      requestBody: { content: { 'application/json': CreateDemandLineDto } }
      responses: {
        201: { headers: { [name: string]: unknown }; content: { 'application/json': DemandLine } }
      }
    }
  }
  '/v1/demand/requests/{id}/lines/import': {
    post: {
      parameters: { path: { id: string } }
      requestBody: { content: { 'multipart/form-data': FormData } }
      responses: {
        200: {
          headers: { [name: string]: unknown }
          content: { 'application/json': DemandLineImportResult }
        }
      }
    }
  }
  '/v1/demand/requests/template': {
    get: {
      responses: {
        200: {
          headers: { [name: string]: unknown }
          content: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': Blob }
        }
      }
    }
  }
  '/v1/demand/lines/{lineId}': {
    patch: {
      parameters: { path: { lineId: string } }
      requestBody: { content: { 'application/json': UpdateDemandLineDto } }
      responses: {
        200: { headers: { [name: string]: unknown }; content: { 'application/json': DemandLine } }
      }
    }
    delete: {
      parameters: { path: { lineId: string } }
      responses: {
        200: {
          headers: { [name: string]: unknown }
          content: { 'application/json': DemandRequest }
        }
      }
    }
  }
  '/v1/demand/lines/suggest': {
    post: {
      requestBody: { content: { 'application/json': DemandLineSuggestInput } }
      responses: {
        200: {
          headers: { [name: string]: unknown }
          content: {
            'application/json': {
              suggestedQty: string | null
              suggestion?: DemandLineSuggestion | null
            }
          }
        }
      }
    }
  }
}

// ==== Enums (lấy từ schema, không khai tay) ====
export type DemandPeriodKind = S['DemandPeriodDetailDto']['kind']
export type DemandPeriodStatus = S['DemandPeriodDetailDto']['status']
export type DemandRequestStatus = S['DemandRequestDetailDto']['status']
export type DemandItemType = S['DemandLineResponseDto']['itemType']
export type DemandPriority = S['DemandLineResponseDto']['priority']
export type DemandDecision = 'buy' | 'from_stock' | 'reject'
export type DemandSuggestionBasis = 'consumption' | 'min_stock'

/** `suggestion` backend trả jsonb tự do (`{[key]: unknown}`) — chuẩn hoá về shape thật. */
export interface DemandLineSuggestion {
  consumption12m?: string
  avgMonthly?: string
  onHand?: string
  runwayDays?: number
  minStock?: string
  maxStock?: string
  lastUnitPrice?: string
  basis?: DemandSuggestionBasis
}

// ==== Kỳ ====
export type DemandPeriod = S['DemandPeriodDetailDto']
export type DemandPeriodListItem = S['DemandPeriodResponseDto']
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

/** UpdatePeriodDto: notes/submitDeadline swagger mất schema (`Record<string, never>`). */
export type UpdateDemandPeriodDto = Omit<S['UpdatePeriodDto'], 'notes' | 'submitDeadline'> & {
  notes?: string
  submitDeadline?: string
}

/** ClonePeriodDto: notes/submitDeadline swagger mất schema. */
export type CloneDemandPeriodDto = Omit<S['ClonePeriodDto'], 'notes' | 'submitDeadline'> & {
  notes?: string
  submitDeadline?: string
}

// ==== Phiếu & dòng ====
export type DemandRequestSummary = S['DemandDepartmentSummaryDto']
export type DemandRequestSummaryPage = S['DemandRequestSummaryPageDto']
export type DemandRequest = S['DemandRequestDetailDto']
export type DemandRequestPage = S['DemandRequestPageDto']

/** AcceptLineDto: approverNote swagger mất schema. */
export type CreateAcceptLineDto = Omit<S['AcceptLineDto'], 'approverNote'> & {
  approverNote?: string
}
export type AcceptRequestDto = { lines?: CreateAcceptLineDto[] }

/** CreateLineDto/UpdateLineDto: supplyId… swagger mất schema (`Record<string, never>`). */
type BaseDemandLineBody = Omit<
  S['CreateLineDto'],
  'supplyId' | 'equipmentId' | 'itemName' | 'spec' | 'unit' | 'reason'
> & {
  supplyId?: string
  equipmentId?: string
  itemName?: string
  spec?: string
  unit?: string
  reason?: string
}

export interface DemandLine extends Omit<S['DemandLineResponseDto'], 'suggestion'> {
  suggestion?: DemandLineSuggestion | null
}

export type CreateDemandLineDto = BaseDemandLineBody
/** PATCH /lines/{lineId} là partial — swagger UpdateLineDto còn bắt buộc priority/unitPriceEst (lệch LIFECYCLE). */
export type UpdateDemandLineDto = Partial<BaseDemandLineBody>

export type DemandLineImportResult = S['ImportLinesResultDto']
export type DemandLineSuggestInput = S['SuggestLineDto']

/** PATCH /v1/demand/requests/{id} (notes) — swagger trỏ nhầm `UpdateRequestDto` của module C2. */
export interface UpdateDemandRequestDto {
  notes?: string
}

// ==== Tổng hợp (T4) ====
export type DemandConsolidationBreakdown = S['DemandBreakdownEntryDto']
export type DemandConsolidation = S['DemandConsolidationRowDto']
export type DemandConsolidationList = S['DemandConsolidationListDto']
export type CloseResult = S['CloseResultDto']

/** UpdateConsolidationDto: note swagger mất schema. */
export type UpdateConsolidationDto = Omit<S['UpdateConsolidationDto'], 'note'> & {
  note?: string
}

// ==== Tổng quan (GET /periods/{id}/summary) ====
export type DemandSummary = S['DemandSummaryDto']
export type DemandSummaryByItemType = S['DemandSummaryByItemTypeDto']
