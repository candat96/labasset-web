import createClient from 'openapi-fetch'
import { authMiddleware, baseUrl, unwrapAs } from '@/api/client'
import { downloadFile } from '@/api/download'
import type {
  CreateAcceptLineDto,
  CreateDemandLineDto,
  DemandConsolidation,
  DemandLine,
  DemandLineImportResult,
  DemandLineSuggestInput,
  DemandPeriod,
  DemandPeriodPage,
  DemandRequest,
  DemandRequestPage,
  DemandRequestSummaryPage,
  DemandPaths,
  DemandSummary,
  UpdateConsolidationDto,
  UpdateDemandLineDto,
  UpdateDemandPeriodDto,
  UpdateDemandRequestDto,
} from './paths'

/**
 * Client riêng cho `/v1/demand`. Types sinh từ OpenAPI backend thật
 * (`npm run api:gen` → `src/api/schema.d.ts`; T1–T5 @ fdfc1a4, 27 path
 * `/v1/demand/*`). Chỗ swagger khai mất schema chuẩn hoá ở `paths.d.ts`.
 */
export const demandApi = createClient<DemandPaths>({
  baseUrl,
  fetch: (req) => globalThis.fetch(req),
})
demandApi.use(authMiddleware)

/** GET /my — trang phiếu của khoa mình trong các kỳ đang mở. */
export function getMyDemand(status?: string[], page = 1) {
  return unwrapAs<DemandRequestPage>(
    demandApi.GET('/v1/demand/my', {
      params: { query: { status: status?.join(','), page, limit: 100 } },
    }),
  )
}

export function listPeriods(params: {
  year?: number
  status?: string
  page?: number
  limit?: number
}) {
  return unwrapAs<DemandPeriodPage>(
    demandApi.GET('/v1/demand/periods', { params: { query: params } }),
  )
}

export function createPeriod(body: {
  name: string
  kind: 'annual' | 'quarterly' | 'adhoc'
  year: number
  quarter?: number
  submitDeadline?: string
  notes?: string
}) {
  return unwrapAs<DemandPeriod>(demandApi.POST('/v1/demand/periods', { body }))
}

export function getPeriod(id: string) {
  return unwrapAs<DemandPeriod>(
    demandApi.GET('/v1/demand/periods/{id}', { params: { path: { id } } }),
  )
}

export function updatePeriod(id: string, body: UpdateDemandPeriodDto) {
  return unwrapAs<DemandPeriod>(
    demandApi.PATCH('/v1/demand/periods/{id}', { params: { path: { id } }, body }),
  )
}

/** POST /periods/{id}/clone — body giống create. */
export function getPeriodSummary(periodId: string) {
  return unwrapAs<DemandSummary>(
    demandApi.GET('/v1/demand/periods/{id}/summary', { params: { path: { id: periodId } } }),
  )
}

export function openPeriod(id: string) {
  return unwrapAs<DemandPeriod>(
    demandApi.POST('/v1/demand/periods/{id}/open', { params: { path: { id } } }),
  )
}

export function closePeriod(id: string) {
  return unwrapAs<{ createdRequests: number }>(
    demandApi.POST('/v1/demand/periods/{id}/close', { params: { path: { id } } }),
  )
}

/** `skipUnsubmitted=true` là **query** — không gửi body. */
export function consolidatePeriod(id: string, skipUnsubmitted?: boolean) {
  return unwrapAs<DemandConsolidation>(
    demandApi.POST('/v1/demand/periods/{id}/consolidate', {
      params: {
        path: { id },
        query: skipUnsubmitted == null ? undefined : { skipUnsubmitted: String(skipUnsubmitted) },
      },
    }),
  )
}

export function cancelPeriod(id: string, reason: string) {
  return unwrapAs<DemandPeriod>(
    demandApi.POST('/v1/demand/periods/{id}/cancel', {
      params: { path: { id } },
      body: { reason },
    }),
  )
}

export function approvePeriod(id: string) {
  return unwrapAs<DemandPeriod>(
    demandApi.POST('/v1/demand/periods/{id}/approve', { params: { path: { id } } }),
  )
}

export function listPeriodRequests(periodId: string) {
  return unwrapAs<DemandRequestSummaryPage>(
    demandApi.GET('/v1/demand/periods/{id}/requests', { params: { path: { id: periodId } } }),
  )
}

/** KPI tổng quan (GET /periods/{id}/summary). */
export function listConsolidation(periodId: string, filters: Record<string, unknown> = {}) {
  return unwrapAs<{ items: DemandConsolidation[] }>(
    demandApi.GET('/v1/demand/periods/{id}/consolidation', {
      params: { path: { id: periodId }, query: filters },
    }),
  )
}

export function rebuildConsolidation(periodId: string) {
  return unwrapAs<{ items: DemandConsolidation[] }>(
    demandApi.POST('/v1/demand/periods/{id}/consolidation/rebuild', {
      params: { path: { id: periodId } },
    }),
  )
}

/** Sửa tổng (phân bổ tỷ lệ) / từng khoa / decision / note. */
export function updateConsolidation(id: string, body: UpdateConsolidationDto) {
  return unwrapAs<{ items: DemandConsolidation[] }>(
    demandApi.PATCH('/v1/demand/consolidation/{id}', { params: { path: { id } }, body }),
  )
}

export function getDemandRequest(id: string) {
  return unwrapAs<DemandRequest>(
    demandApi.GET('/v1/demand/requests/{id}', { params: { path: { id } } }),
  )
}

export function updateDemandRequest(id: string, notes: string) {
  const body: UpdateDemandRequestDto = notes ? { notes } : {}
  return unwrapAs<DemandRequest>(
    demandApi.PATCH('/v1/demand/requests/{id}', { params: { path: { id } }, body }),
  )
}

export function submitDemandRequest(id: string) {
  return unwrapAs<DemandRequest>(
    demandApi.POST('/v1/demand/requests/{id}/submit', { params: { path: { id } } }),
  )
}

export function deptApproveDemandRequest(id: string) {
  return unwrapAs<DemandRequest>(
    demandApi.POST('/v1/demand/requests/{id}/dept-approve', { params: { path: { id } } }),
  )
}

export function returnDemandRequest(id: string, reason: string) {
  return unwrapAs<DemandRequest>(
    demandApi.POST('/v1/demand/requests/{id}/return', {
      params: { path: { id } },
      body: { reason },
    }),
  )
}

/** Tiếp nhận (VT) — `lines` rỗng/undefined = duyệt toàn bộ theo qtyRequested. */
export function acceptDemandRequest(id: string, lines?: CreateAcceptLineDto[]) {
  return unwrapAs<DemandRequest>(
    demandApi.POST('/v1/demand/requests/{id}/accept', {
      params: { path: { id } },
      body: lines?.length ? { lines } : {},
    }),
  )
}

export function suggestAllLines(id: string) {
  return unwrapAs<DemandRequest>(
    demandApi.POST('/v1/demand/requests/{id}/suggest-all', { params: { path: { id } } }),
  )
}

export function addDemandLine(requestId: string, body: CreateDemandLineDto) {
  return unwrapAs<DemandLine>(
    demandApi.POST('/v1/demand/requests/{id}/lines', {
      params: { path: { id: requestId } },
      body,
    }),
  )
}

export function updateDemandLine(lineId: string, body: UpdateDemandLineDto) {
  return unwrapAs<DemandLine>(
    demandApi.PATCH('/v1/demand/lines/{lineId}', { params: { path: { lineId } }, body }),
  )
}

/** DELETE trả lại DemandRequestDetailDto (phiếu còn lại). */
export function deleteDemandLine(lineId: string) {
  return unwrapAs<DemandRequest>(
    demandApi.DELETE('/v1/demand/lines/{lineId}', { params: { path: { lineId } } }),
  )
}

export interface DemandLineSuggestion {
  suggestedQty: string | null
  suggestion?: DemandLine['suggestion'] | null
}

/**
 * POST /lines/suggest: `{departmentId, supplyId, periodKind}` (KHÔNG periodId).
 * Server không trả `qtyByBucket`; client tự phân bổ đều theo buckets khi áp gợi ý.
 */
export function suggestDemandLine(body: DemandLineSuggestInput) {
  return unwrapAs<DemandLineSuggestion>(demandApi.POST('/v1/demand/lines/suggest', { body }))
}

export function importDemandLines(requestId: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  return unwrapAs<DemandLineImportResult>(
    demandApi.POST('/v1/demand/requests/{id}/lines/import', {
      params: { path: { id: requestId } },
      body: form,
    }),
  )
}

export async function downloadDemandTemplate() {
  await downloadFile('/v1/demand/requests/template', {}, 'mau-nhap-du-tru.xlsx')
}

export async function exportDemandSummary(periodId: string) {
  await downloadFile(`/v1/demand/periods/${periodId}/export.xlsx`, {}, 'tong-hop-du-tru.xlsx')
}
export async function downloadDemandProposal(periodId: string) {
  await downloadFile(`/v1/demand/periods/${periodId}/proposal.pdf`, {}, 'to-trinh-du-tru.pdf')
}
