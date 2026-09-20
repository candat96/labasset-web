import { api, unwrap, unwrapAs } from '@/api/client'
import { pageQuery } from '@/api/paths'
import type { components } from '@/api/schema'
import type { CreateFault, FaultListParams, UpdateFault } from './types'

export function listFaults(params: FaultListParams) {
  return unwrap(
    api.GET('/v1/faults', {
      params: { query: pageQuery(params) },
    }),
  )
}

export function getFault(id: string) {
  return unwrap(api.GET('/v1/faults/{id}', { params: { path: { id } } }))
}

export function createFault(body: CreateFault) {
  return unwrap(api.POST('/v1/faults', { body }))
}

export function updateFault(id: string, body: UpdateFault) {
  return unwrap(api.PATCH('/v1/faults/{id}', { params: { path: { id } }, body }))
}

export function publishFault(id: string) {
  return unwrap(api.POST('/v1/faults/{id}/publish', { params: { path: { id } } }))
}

export function archiveFault(id: string) {
  return unwrap(api.POST('/v1/faults/{id}/archive', { params: { path: { id } } }))
}

export function sendFaultFeedback(id: string, body: components['schemas']['FaultFeedbackDto']) {
  return unwrap(api.POST('/v1/faults/{id}/feedback', { params: { path: { id } }, body }))
}

export function listFaultVersions(id: string) {
  return unwrap(api.GET('/v1/faults/{id}/versions', { params: { path: { id } } }))
}

export function getFaultVersion(id: string, v: number) {
  return unwrap(api.GET('/v1/faults/{id}/versions/{v}', { params: { path: { id, v } } }))
}

export function listFaultHistory(id: string, equipmentId?: string) {
  return unwrap(
    api.GET('/v1/faults/{id}/history', { params: { path: { id }, query: { equipmentId } } }),
  )
}

export function listFaultSuggestions(params: {
  page?: number
  limit?: number
  status?: 'pending' | 'accepted' | 'rejected'
}) {
  return unwrap(api.GET('/v1/faults/suggestions', { params: { query: pageQuery(params) } }))
}

export function getFaultSuggestion(id: string) {
  return unwrap(api.GET('/v1/faults/suggestions/{id}', { params: { path: { id } } }))
}

export function acceptFaultSuggestion(id: string, mergeIntoFaultId?: string) {
  return unwrap(
    api.POST('/v1/faults/suggestions/{id}/accept', {
      params: { path: { id } },
      body: mergeIntoFaultId ? { mergeIntoFaultId } : {},
    }),
  )
}

export function rejectFaultSuggestion(id: string, note: string) {
  return unwrap(
    api.POST('/v1/faults/suggestions/{id}/reject', {
      params: { path: { id } },
      body: { note },
    }),
  )
}

// TODO(api): chưa có endpoint tra cứu phiếu theo lô; gọi tuần tự từng phiếu để hiện mã.
export function getRepairCode(id: string) {
  return unwrapAs<{ id: string; code: string }>(
    api.GET('/v1/repairs/{id}', { params: { path: { id } } }),
  )
}

export function emptyToNull<T extends Record<string, unknown>>(body: T): T {
  const out = { ...body }
  for (const key of Object.keys(out) as (keyof T)[])
    if (out[key] === '') (out[key] as unknown) = null
  return out
}

export function diffUpdate(before: UpdateFault, after: UpdateFault): UpdateFault {
  const body: UpdateFault = {}
  for (const key of Object.keys(after) as (keyof UpdateFault)[]) {
    if (JSON.stringify(after[key]) !== JSON.stringify(before[key]))
      (body as Record<string, unknown>)[key] = after[key]
  }
  return body
}
