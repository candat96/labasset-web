import { api, apiBody, unwrap } from '@/api/client'
import { pageQuery } from '@/api/paths'
import type { components } from '@/api/schema'

export function listRequests(params: Record<string, unknown>) {
  return unwrap(api.GET('/v1/requests', { params: { query: pageQuery(params) } }))
}
export function getRequest(id: string) {
  return unwrap(api.GET('/v1/requests/{id}', { params: { path: { id } } }))
}
export function createRequest(body: components['schemas']['CreateRequestDto']) {
  return unwrap(api.POST('/v1/requests', { body }))
}
export function updateRequest(id: string, body: components['schemas']['UpdateRequestDto']) {
  return unwrap(api.PATCH('/v1/requests/{id}', { params: { path: { id } }, body }))
}
export function submitRequest(id: string) {
  return unwrap(api.POST('/v1/requests/{id}/submit', { params: { path: { id } } }))
}
export function cancelRequest(id: string, reason?: string) {
  return unwrap(
    api.POST('/v1/requests/{id}/cancel', {
      params: { path: { id } },
      body: apiBody({ reason }),
    }),
  )
}
export function deptApprove(id: string) {
  return unwrap(api.POST('/v1/requests/{id}/dept-approve', { params: { path: { id } } }))
}
export function approveRequest(id: string, body: components['schemas']['ApproveRequestDto']) {
  return unwrap(api.POST('/v1/requests/{id}/approve', { params: { path: { id } }, body }))
}
export function rejectRequest(id: string, reason: string) {
  return unwrap(
    api.POST('/v1/requests/{id}/reject', { params: { path: { id } }, body: { reason } }),
  )
}
export function issueRequest(id: string, body: components['schemas']['IssueRequestDto']) {
  return unwrap(api.POST('/v1/requests/{id}/issue', { params: { path: { id } }, body }))
}
export function receiveRequest(id: string, note?: string) {
  return unwrap(
    api.POST('/v1/requests/{id}/receive', { params: { path: { id } }, body: apiBody({ note }) }),
  )
}
export function cloneRequest(id: string) {
  return unwrap(api.POST('/v1/requests/{id}/clone', { params: { path: { id } } }))
}
export function addComment(id: string, body: string) {
  return unwrap(
    api.POST('/v1/requests/{id}/comments', { params: { path: { id } }, body: { body } }),
  )
}
export function approveBulk(ids: string[]) {
  return unwrap(api.POST('/v1/requests/approve-bulk', { body: { ids } }))
}
export function listQuotas(params: Record<string, unknown>) {
  return unwrap(api.GET('/v1/requests/quotas', { params: { query: pageQuery(params) } }))
}
export function createQuota(body: components['schemas']['CreateQuotaDto']) {
  return unwrap(api.POST('/v1/requests/quotas', { body }))
}
export function updateQuota(id: string, body: components['schemas']['UpdateQuotaDto']) {
  return unwrap(api.PATCH('/v1/requests/quotas/{id}', { params: { path: { id } }, body }))
}
export function deleteQuota(id: string) {
  return unwrap(api.DELETE('/v1/requests/quotas/{id}', { params: { path: { id } } }))
}
export function listRecurring(params: Record<string, unknown>) {
  return unwrap(api.GET('/v1/requests/recurring', { params: { query: pageQuery(params) } }))
}
export function createRecurring(body: Record<string, unknown>) {
  return unwrap(api.POST('/v1/requests/recurring', { body: apiBody(body) }))
}
export function updateRecurring(id: string, body: Record<string, unknown>) {
  return unwrap(
    api.PATCH('/v1/requests/recurring/{id}', {
      params: { path: { id } },
      body: apiBody(body),
    }),
  )
}
export function deleteRecurring(id: string) {
  return unwrap(api.DELETE('/v1/requests/recurring/{id}', { params: { path: { id } } }))
}
