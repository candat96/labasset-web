import { api, apiBody, unwrap, unwrapAs } from '@/api/client'
import { downloadFile } from '@/api/download'
import { apiQuery, pageQuery } from '@/api/paths'
import type { components, paths } from '@/api/schema'
import type { Supply } from './types'

type SuppliesQuery = NonNullable<paths['/v1/supplies']['get']['parameters']['query']>

export function listSupplies(params: Record<string, unknown>) {
  return unwrapAs<{ items?: Supply[]; total?: number; page?: number; limit?: number } | Supply[]>(
    api.GET('/v1/supplies', { params: { query: apiQuery<SuppliesQuery>(params) } }),
  )
}
export function getSupply(id: string) {
  return unwrapAs<Supply>(api.GET('/v1/supplies/{id}', { params: { path: { id } } }))
}
export function getSupplyStock(id: string) {
  return unwrapAs<{
    balances?: Record<string, unknown>[]
    lots?: Array<{
      id: string
      lotNo?: string
      warehouseId?: string
      status?: string
      available?: string
      qtyOnHand?: string
      qtyReserved?: string
    }>
  }>(api.GET('/v1/supplies/{id}/stock', { params: { path: { id } } }))
}
export function createSupply(body: Record<string, unknown>) {
  return unwrapAs<Supply>(api.POST('/v1/supplies', { body: apiBody(body) }))
}
export function updateSupply(id: string, body: Record<string, unknown>) {
  return unwrapAs<Supply>(
    api.PATCH('/v1/supplies/{id}', { params: { path: { id } }, body: apiBody(body) }),
  )
}
export function exportSupplies() {
  return downloadFile('/v1/supplies/export', {}, 'vat-tu.xlsx')
}

export function listBalances(params: Record<string, unknown>) {
  return unwrap(api.GET('/v1/stock/balances', { params: { query: pageQuery(params) } }))
}
export function stockValue(warehouseId?: string) {
  return unwrap(api.GET('/v1/stock/value', { params: { query: { warehouseId } } }))
}
export function listLots(params: Record<string, unknown>) {
  return unwrap(api.GET('/v1/stock/lots', { params: { query: pageQuery(params) } }))
}
export function openLot(id: string) {
  return unwrap(api.POST('/v1/stock/lots/{id}/open', { params: { path: { id } } }))
}
export function adjustStock(body: Record<string, unknown>) {
  return unwrap(api.POST('/v1/stock/adjust', { body: apiBody(body) }))
}

export function listReceipts(params: Record<string, unknown>) {
  return unwrap(api.GET('/v1/stock/receipts', { params: { query: pageQuery(params) } }))
}
export function getReceipt(id: string) {
  return unwrap(api.GET('/v1/stock/receipts/{id}', { params: { path: { id } } }))
}
export function createReceipt(body: Record<string, unknown>) {
  return unwrap(api.POST('/v1/stock/receipts', { body: apiBody(body) }))
}
export function updateReceipt(id: string, body: Record<string, unknown>) {
  return unwrap(
    api.PATCH('/v1/stock/receipts/{id}', { params: { path: { id } }, body: apiBody(body) }),
  )
}
export function deleteReceipt(id: string) {
  return unwrap(api.DELETE('/v1/stock/receipts/{id}', { params: { path: { id } } }))
}
export function postReceipt(id: string) {
  return unwrap(api.POST('/v1/stock/receipts/{id}/post', { params: { path: { id } } }))
}
export function cancelReceipt(id: string) {
  return unwrap(api.POST('/v1/stock/receipts/{id}/cancel', { params: { path: { id } } }))
}
export function qcReceipt(id: string, body: { status: 'passed' | 'failed'; note?: string }) {
  return unwrap(
    api.POST('/v1/stock/receipts/{id}/qc', { params: { path: { id } }, body: apiBody(body) }),
  )
}

export function listIssues(params: Record<string, unknown>) {
  return unwrap(api.GET('/v1/stock/issues', { params: { query: pageQuery(params) } }))
}
export function getIssue(id: string) {
  return unwrap(api.GET('/v1/stock/issues/{id}', { params: { path: { id } } }))
}
export function createIssue(body: Record<string, unknown>) {
  return unwrap(api.POST('/v1/stock/issues', { body: apiBody(body) }))
}
export function updateIssue(id: string, body: Record<string, unknown>) {
  return unwrap(
    api.PATCH('/v1/stock/issues/{id}', { params: { path: { id } }, body: apiBody(body) }),
  )
}
export function deleteIssue(id: string) {
  return unwrap(api.DELETE('/v1/stock/issues/{id}', { params: { path: { id } } }))
}
export function postIssue(id: string) {
  return unwrap(api.POST('/v1/stock/issues/{id}/post', { params: { path: { id } } }))
}
export function cancelIssue(id: string) {
  return unwrap(api.POST('/v1/stock/issues/{id}/cancel', { params: { path: { id } } }))
}
export function quickIssue(body: components['schemas']['CreateIssueDto']) {
  return unwrap(api.POST('/v1/stock/issues/quick', { body }))
}
export function suggestLots(query: { supplyId: string; warehouseId: string; quantity: string }) {
  return unwrap(api.GET('/v1/stock/issues/suggest-lots', { params: { query } }))
}

export function createTransfer(body: Record<string, unknown>) {
  return unwrapAs<{ id?: string; transferId?: string }>(
    api.POST('/v1/stock/transfers', { body: apiBody(body) }),
  )
}
export function cancelTransfer(transferId: string) {
  return unwrap(
    api.POST('/v1/stock/transfers/{transferId}/cancel', { params: { path: { transferId } } }),
  )
}

export function listAlerts(params: Record<string, unknown>) {
  return unwrap(api.GET('/v1/stock/alerts', { params: { query: pageQuery(params) } }))
}
export function resolveAlert(id: string) {
  return unwrap(api.POST('/v1/stock/alerts/{id}/resolve', { params: { path: { id } } }))
}

export function asSupplyPage(data: Awaited<ReturnType<typeof listSupplies>>) {
  if (Array.isArray(data)) return { items: data, total: data.length, page: 1, limit: data.length }
  return {
    items: data.items ?? [],
    total: data.total ?? data.items?.length ?? 0,
    page: data.page ?? 1,
    limit: data.limit ?? 20,
  }
}
