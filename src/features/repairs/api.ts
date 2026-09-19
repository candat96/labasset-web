import { api, unwrap, unwrapAs } from '@/api/client'
import { downloadFile } from '@/api/download'
import { pageQuery } from '@/api/paths'
import type { components } from '@/api/schema'
import type { CreateRepair, RepairListParams, UpdateRepair } from './types'

export function listRepairs(params: RepairListParams) {
  return unwrap(
    api.GET('/v1/repairs', {
      params: { query: pageQuery({ ...params }) as never },
    }),
  )
}

export function getRepair(id: string) {
  return unwrap(api.GET('/v1/repairs/{id}', { params: { path: { id } } }))
}

export function createRepair(body: CreateRepair) {
  return unwrap(api.POST('/v1/repairs', { body }))
}

export function updateRepair(id: string, body: UpdateRepair) {
  return unwrap(api.PATCH('/v1/repairs/{id}', { params: { path: { id } }, body }))
}

export function acceptRepair(id: string) {
  return unwrap(api.POST('/v1/repairs/{id}/accept', { params: { path: { id } } }))
}

export function assignRepair(id: string, body: components['schemas']['AssignRepairDto']) {
  return unwrap(api.POST('/v1/repairs/{id}/assign', { params: { path: { id } }, body }))
}

export function respondAssignment(
  id: string,
  body: components['schemas']['AssignmentResponseDto'],
) {
  return unwrap(
    api.POST('/v1/repairs/{id}/assignments/respond', { params: { path: { id } }, body }),
  )
}

export function patchDiagnosis(id: string, body: components['schemas']['DiagnosisDto']) {
  return unwrap(api.PATCH('/v1/repairs/{id}/diagnosis', { params: { path: { id } }, body }))
}

export function changeRepairStatus(id: string, body: components['schemas']['RepairStatusDto']) {
  return unwrap(api.POST('/v1/repairs/{id}/status', { params: { path: { id } }, body }))
}

export function completeRepair(id: string, body: components['schemas']['CompleteRepairDto']) {
  return unwrap(api.POST('/v1/repairs/{id}/complete', { params: { path: { id } }, body }))
}

export function acceptRepairResult(id: string, body: components['schemas']['AcceptanceDto']) {
  return unwrap(api.POST('/v1/repairs/{id}/acceptance', { params: { path: { id } }, body }))
}

export function closeRepair(id: string) {
  return unwrap(api.POST('/v1/repairs/{id}/close', { params: { path: { id } } }))
}

export function cancelRepair(id: string, reason: string) {
  return unwrap(api.POST('/v1/repairs/{id}/cancel', { params: { path: { id } }, body: { reason } }))
}

export function listRepairLogs(id: string, page = 1, limit = 50) {
  return unwrap(
    api.GET('/v1/repairs/{id}/logs', {
      params: { path: { id }, query: pageQuery({ page, limit }) },
    }),
  )
}

export function addRepairLogs(id: string, body: components['schemas']['RepairLogDto'][]) {
  return unwrap(api.POST('/v1/repairs/{id}/logs', { params: { path: { id } }, body }))
}

export function listRepairParts(id: string) {
  return unwrap(api.GET('/v1/repairs/{id}/parts', { params: { path: { id } } }))
}

export function addRepairPart(id: string, body: components['schemas']['RepairPartDto']) {
  return unwrap(api.POST('/v1/repairs/{id}/parts', { params: { path: { id } }, body }))
}

export function deleteRepairPart(id: string, pid: string) {
  return unwrap(api.DELETE('/v1/repairs/{id}/parts/{pid}', { params: { path: { id, pid } } }))
}

export function listRepairVendors(id: string) {
  return unwrap(api.GET('/v1/repairs/{id}/vendors', { params: { path: { id } } }))
}

export function addRepairVendor(id: string, body: components['schemas']['RepairVendorDto']) {
  return unwrap(api.POST('/v1/repairs/{id}/vendors', { params: { path: { id } }, body }))
}

export function updateRepairVendor(
  id: string,
  vid: string,
  body: components['schemas']['UpdateRepairVendorDto'],
) {
  return unwrap(
    api.PATCH('/v1/repairs/{id}/vendors/{vid}', { params: { path: { id, vid } }, body }),
  )
}

export function deleteRepairVendor(id: string, vid: string) {
  return unwrap(api.DELETE('/v1/repairs/{id}/vendors/{vid}', { params: { path: { id, vid } } }))
}

export function listRepairCosts(id: string) {
  return unwrap(api.GET('/v1/repairs/{id}/costs', { params: { path: { id } } }))
}

export function addRepairCost(id: string, body: components['schemas']['RepairCostDto']) {
  return unwrap(api.POST('/v1/repairs/{id}/costs', { params: { path: { id } }, body }))
}

export function updateRepairCost(
  id: string,
  cid: string,
  body: components['schemas']['UpdateRepairCostDto'],
) {
  return unwrap(api.PATCH('/v1/repairs/{id}/costs/{cid}', { params: { path: { id, cid } }, body }))
}

export function deleteRepairCost(id: string, cid: string) {
  return unwrap(api.DELETE('/v1/repairs/{id}/costs/{cid}', { params: { path: { id, cid } } }))
}

export function addRepairSignature(id: string, body: components['schemas']['RepairSignatureDto']) {
  return unwrap(api.POST('/v1/repairs/{id}/signatures', { params: { path: { id } }, body }))
}

export function downloadRepairReport(id: string, code: string) {
  return downloadFile(`/v1/repairs/${id}/report.pdf`, {}, `bien-ban-${code}.pdf`)
}

export function suggestAssignees(equipmentId: string) {
  return unwrap(api.GET('/v1/repairs/assign/suggest', { params: { query: { equipmentId } } }))
}

export function repairStats(params: {
  from?: string
  to?: string
  groupBy?: 'equipment' | 'department' | 'assignee' | 'month'
}) {
  return unwrap(api.GET('/v1/repairs/stats', { params: { query: params } }))
}

export function repairWorkload() {
  return unwrap(api.GET('/v1/repairs/workload'))
}

export function publicRepairSettings() {
  return unwrapAs<Record<string, unknown>>(api.GET('/v1/settings/public'))
}

// TODO(api): GET /v1/supplies/:id/stock schema is Record<string, never>
export interface StockLot {
  id: string
  lotNo?: string
  remainingQty?: string
  qtyOnHand?: string
}
export function supplyStock(id: string) {
  return unwrapAs<{ lots?: StockLot[]; balances?: StockLot[] }>(
    api.GET('/v1/supplies/{id}/stock', { params: { path: { id } } }),
  )
}

export function equipmentComponents(id: string) {
  return unwrap(api.GET('/v1/equipment/{id}/components', { params: { path: { id } } }))
}

export function emptyToNull<T extends Record<string, unknown>>(body: T): T {
  const out = { ...body }
  for (const key of Object.keys(out) as (keyof T)[])
    if (out[key] === '') (out[key] as unknown) = null
  return out
}
