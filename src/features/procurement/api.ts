import createClient from 'openapi-fetch'
import { authMiddleware, baseUrl, apiBody, unwrap, unwrapAs } from '@/api/client'
import { downloadFile } from '@/api/download'
import type {
  AcceptDemandLineDto,
  CreateDemandLineDto,
  CreateDemandPeriodDto,
  DemandLine,
  DemandLineImportResult,
  DemandLineSuggestInput,
  DemandPeriod,
  DemandRequest,
  DemandPaths,
  DemandSuggestion,
  UpdateDemandConsolidationDto,
  UpdateDemandLineDto,
  UpdateDemandPeriodDto,
} from './paths'

export interface DemandMyResponse {
  toSubmit: DemandRequest[]
  toApprove: DemandRequest[]
  toAccept: DemandRequest[]
}

export interface DemandLineSuggestion {
  suggestedQty: string
  qtyByBucket: string[]
  suggestion?: DemandSuggestion
}

/**
 * Client riêng cho `/v1/demand` — backend chưa có endpoint trong OpenAPI lúc làm
 * giao diện nên dùng hợp đồng tạm (`paths.d.ts`).
 * Khi labasset-api commit T2+ → `npm run api:gen` rồi đổi sang `api` thật của
 * `@/api/client` (schema `components['schemas']`), xoá type tay tương ứng.
 */
// TODO(api): chuyển sang `api` thật khi /v1/demand có trong OpenAPI (backend T2+)
export const demandApi = createClient<DemandPaths>({
  baseUrl,
  fetch: (req) => globalThis.fetch(req),
})
demandApi.use(authMiddleware)

export function listPeriods(params: Record<string, unknown>) {
  return unwrap(demandApi.GET('/v1/demand/periods', { params: { query: params } }))
}
export function createPeriod(body: CreateDemandPeriodDto) {
  return unwrap(demandApi.POST('/v1/demand/periods', { body }))
}
export function getPeriod(id: string) {
  return unwrap(demandApi.GET('/v1/demand/periods/{id}', { params: { path: { id } } }))
}
export function updatePeriod(id: string, body: UpdateDemandPeriodDto) {
  return unwrap(demandApi.PATCH('/v1/demand/periods/{id}', { params: { path: { id } }, body }))
}
export function openPeriod(id: string) {
  return unwrap(demandApi.POST('/v1/demand/periods/{id}/open', { params: { path: { id } } }))
}
export function consolidatePeriod(id: string, skipUnsubmitted?: boolean) {
  return unwrap(
    demandApi.POST('/v1/demand/periods/{id}/consolidate', {
      params: { path: { id } },
      body: apiBody({ skipUnsubmitted }),
    }),
  )
}
export function approvePeriod(id: string) {
  return unwrap(demandApi.POST('/v1/demand/periods/{id}/approve', { params: { path: { id } } }))
}
export function closePeriod(id: string) {
  return unwrapAs<{ period: DemandPeriod; createdRequests: number }>(
    demandApi.POST('/v1/demand/periods/{id}/close', { params: { path: { id } } }),
  )
}
export function cancelPeriod(id: string, reason: string) {
  return unwrap(
    demandApi.POST('/v1/demand/periods/{id}/cancel', {
      params: { path: { id } },
      body: { reason },
    }),
  )
}
export function clonePeriod(id: string) {
  return unwrap(demandApi.POST('/v1/demand/periods/{id}/clone', { params: { path: { id } } }))
}
export function listPeriodRequests(periodId: string) {
  return unwrap(
    demandApi.GET('/v1/demand/periods/{id}/requests', { params: { path: { id: periodId } } }),
  )
}
export function getPeriodSummary(periodId: string) {
  return unwrap(
    demandApi.GET('/v1/demand/periods/{id}/summary', { params: { path: { id: periodId } } }),
  )
}
export function listConsolidation(periodId: string, filters: Record<string, unknown> = {}) {
  return unwrap(
    demandApi.GET('/v1/demand/periods/{id}/consolidation', {
      params: { path: { id: periodId }, query: filters },
    }),
  )
}
export function rebuildConsolidation(periodId: string) {
  return unwrap(
    demandApi.POST('/v1/demand/periods/{id}/consolidation/rebuild', {
      params: { path: { id: periodId } },
    }),
  )
}
export function updateConsolidation(id: string, body: UpdateDemandConsolidationDto) {
  return unwrap(
    demandApi.PATCH('/v1/demand/consolidation/{id}', { params: { path: { id } }, body }),
  )
}
export function getMyDemand() {
  return unwrapAs<DemandMyResponse>(demandApi.GET('/v1/demand/my'))
}
export function getDemandRequest(id: string) {
  return unwrap(demandApi.GET('/v1/demand/requests/{id}', { params: { path: { id } } }))
}
export function updateDemandRequest(id: string, notes: string) {
  return unwrap(
    demandApi.PATCH('/v1/demand/requests/{id}', {
      params: { path: { id } },
      body: notes ? { notes } : {},
    }),
  )
}
export function submitDemandRequest(id: string) {
  return unwrap(demandApi.POST('/v1/demand/requests/{id}/submit', { params: { path: { id } } }))
}
export function deptApproveDemandRequest(id: string) {
  return unwrap(
    demandApi.POST('/v1/demand/requests/{id}/dept-approve', { params: { path: { id } } }),
  )
}
export function returnDemandRequest(id: string, reason: string) {
  return unwrap(
    demandApi.POST('/v1/demand/requests/{id}/return', {
      params: { path: { id } },
      body: { reason },
    }),
  )
}
export function acceptDemandRequest(id: string, lines?: AcceptDemandLineDto[]) {
  return unwrap(
    demandApi.POST('/v1/demand/requests/{id}/accept', {
      params: { path: { id } },
      body: apiBody({ lines }),
    }),
  )
}
export function suggestAllLines(id: string) {
  return unwrap(
    demandApi.POST('/v1/demand/requests/{id}/suggest-all', { params: { path: { id } } }),
  )
}
export function addDemandLine(requestId: string, body: CreateDemandLineDto) {
  return unwrap(
    demandApi.POST('/v1/demand/requests/{id}/lines', { params: { path: { id: requestId } }, body }),
  )
}
export function updateDemandLine(lineId: string, body: UpdateDemandLineDto) {
  return unwrap(
    demandApi.PATCH('/v1/demand/lines/{lineId}', { params: { path: { lineId } }, body }),
  )
}
export function deleteDemandLine(lineId: string) {
  return unwrap(demandApi.DELETE('/v1/demand/lines/{lineId}', { params: { path: { lineId } } }))
}
export function suggestDemandLine(
  body: DemandLineSuggestInput,
): Promise<{ suggestedQty: string; qtyByBucket: string[]; suggestion?: DemandSuggestion }> {
  return unwrap(demandApi.POST('/v1/demand/lines/suggest', { body }))
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
export type { DemandLine }
