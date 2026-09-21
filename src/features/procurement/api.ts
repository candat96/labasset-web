import createClient from 'openapi-fetch'
import { authMiddleware, baseUrl, apiBody, unwrapAs } from '@/api/client'
import { downloadFile } from '@/api/download'
import type {
  CreateAcceptLineDto,
  CreateDemandLineDto,
  DemandConsolidation,
  DemandLine,
  DemandLineImportResult,
  DemandLineSuggestInput,
  DemandPeriod,
  DemandPeriodSummary,
  DemandRequest,
  DemandRequestPage,
  DemandRequestSummaryPage,
  DemandPaths,
  UpdateDemandConsolidationDto,
  UpdateDemandLineDto,
  UpdateDemandPeriodDto,
} from './paths'

/**
 * Client riêng cho `/v1/demand`. Backend T2 (14f42ca) đã có kỳ + phiếu + dòng +
 * gợi ý + import + my — type trong `paths.d.ts` tự khai lại khớp shape thật của
 * `src/api/schema.d.ts` (một số field swagger còn khai mất schema → chuẩn hoá về
 * string). Các endpoint T3–T5 (summary, consolidation, approve/close/cancel/clone,
 * export, propose) vẫn là type tay theo spec §6; xoá dần khi backend commit T3+
 * và chạy lại `npm run api:gen`.
 */
export const demandApi = createClient<DemandPaths>({
  baseUrl,
  fetch: (req) => globalThis.fetch(req),
})
demandApi.use(authMiddleware)

/** GET /my trả trang phiếu của khoa mình trong các kỳ đang mở (T2 thật). */
export function getMyDemand(status?: string[], page = 1) {
  return unwrapAs<DemandRequestPage>(
    demandApi.GET('/v1/demand/my', {
      params: { query: { status: status?.join(','), page, limit: 100 } },
    }),
  )
}

/** GET /periods item thiếu progress/totals; chuẩn hoá về DemandPeriod để UI dùng chung. */
export function listPeriods(params: {
  year?: number
  status?: string
  page?: number
  limit?: number
}) {
  return unwrapAs<{ items: DemandPeriod[]; total: number; page: number; limit: number }>(
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

export function openPeriod(id: string) {
  return unwrapAs<DemandPeriod>(
    demandApi.POST('/v1/demand/periods/{id}/open', { params: { path: { id } } }),
  )
}

export function closePeriod(id: string) {
  return unwrapAs<{ period: DemandPeriod; createdRequests: number }>(
    demandApi.POST('/v1/demand/periods/{id}/close', { params: { path: { id } } }),
  )
}

// ===== T3+ chưa có (endpoint thật của kế hoạch) — caller vẫn gọi bình thường; =====
// toggle các hàm dưới đây khi endpoint xuất hiện (api:gen), logic trang đổi mượt.
export function consolidatePeriod(id: string, skipUnsubmitted?: boolean) {
  return unwrapAs<DemandPeriod>(
    demandApi.POST('/v1/demand/periods/{id}/consolidate', {
      params: { path: { id } },
      body: apiBody({ skipUnsubmitted }),
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

/** T3+ — bỏ khi có summary thật */
export function getPeriodSummary(periodId: string) {
  return unwrapAs<DemandPeriodSummary>(
    demandApi.GET('/v1/demand/periods/{id}/summary', { params: { path: { id: periodId } } }),
  )
}

export function listConsolidation(periodId: string, filters: Record<string, unknown> = {}) {
  return unwrapAs<DemandConsolidation[]>(
    demandApi.GET('/v1/demand/periods/{id}/consolidation', {
      params: { path: { id: periodId }, query: filters },
    }),
  )
}

export function rebuildConsolidation(periodId: string) {
  return unwrapAs<DemandConsolidation[]>(
    demandApi.POST('/v1/demand/periods/{id}/consolidation/rebuild', {
      params: { path: { id: periodId } },
    }),
  )
}

export function updateConsolidation(id: string, body: UpdateDemandConsolidationDto) {
  return unwrapAs<DemandConsolidation>(
    demandApi.PATCH('/v1/demand/consolidation/{id}', { params: { path: { id } }, body }),
  )
}

export function getDemandRequest(id: string) {
  return unwrapAs<DemandRequest>(
    demandApi.GET('/v1/demand/requests/{id}', { params: { path: { id } } }),
  )
}

export function updateDemandRequest(id: string, notes: string) {
  return unwrapAs<DemandRequest>(
    demandApi.PATCH('/v1/demand/requests/{id}', {
      params: { path: { id } },
      body: notes ? { notes } : {},
    }),
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

export function acceptDemandRequest(id: string, lines?: CreateAcceptLineDto[]) {
  return unwrapAs<DemandRequest>(
    demandApi.POST('/v1/demand/requests/{id}/accept', {
      params: { path: { id } },
      body: apiBody({ lines }),
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
      body: apiBody(body),
    }),
  )
}

export function updateDemandLine(lineId: string, body: UpdateDemandLineDto) {
  return unwrapAs<DemandLine>(
    demandApi.PATCH('/v1/demand/lines/{lineId}', {
      params: { path: { lineId } },
      body: apiBody(body),
    }),
  )
}

export function deleteDemandLine(lineId: string) {
  return unwrapAs<DemandRequest>(
    demandApi.DELETE('/v1/demand/lines/{lineId}', { params: { path: { lineId } } }),
  )
}

export interface DemandLineSuggestion {
  suggestedQty: string | null
  suggestion?: { [key: string]: unknown } | null
}

/**
 * POST /lines/suggest (T2 thật): `{departmentId, supplyId, periodKind}` — server KHÔNG
 * trả `qtyByBucket`; client tự phân bổ đều theo buckets khi áp gợi ý.
 */
export function suggestDemandLine(body: DemandLineSuggestInput) {
  return unwrapAs<DemandLineSuggestion>(
    demandApi.POST('/v1/demand/lines/suggest', { body: apiBody(body) }),
  )
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

// ===== T3+ chưa có (export/proposal) — dùng downloadFile trực tiếp cho tới khi có =====
export async function exportDemandSummary(periodId: string) {
  await downloadFile(`/v1/demand/periods/${periodId}/export.xlsx`, {}, 'tong-hop-du-tru.xlsx')
}
export async function downloadDemandProposal(periodId: string) {
  await downloadFile(`/v1/demand/periods/${periodId}/proposal.pdf`, {}, 'to-trinh-du-tru.pdf')
}
