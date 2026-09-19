import { api, unwrap, unwrapAs } from '@/api/client'
import { downloadFile } from '@/api/download'
import { pageQuery } from '@/api/paths'
import type { components } from '@/api/schema'

export function listStocktakes(params: Record<string, unknown>) {
  return unwrap(
    api.GET('/v1/stocktakes', { params: { query: pageQuery(params as never) as never } }),
  )
}
export function getStocktake(id: string) {
  return unwrap(api.GET('/v1/stocktakes/{id}', { params: { path: { id } } }))
}
export function createStocktake(body: components['schemas']['CreateStocktakeDto']) {
  return unwrap(api.POST('/v1/stocktakes', { body }))
}
export function assignStocktake(id: string, body: components['schemas']['AssignStocktakeDto']) {
  return unwrap(api.POST('/v1/stocktakes/{id}/assign', { params: { path: { id } }, body }))
}
export function openStocktake(id: string) {
  return unwrap(api.POST('/v1/stocktakes/{id}/open', { params: { path: { id } } }))
}
export function startCounting(id: string) {
  return unwrap(api.POST('/v1/stocktakes/{id}/start-counting', { params: { path: { id } } }))
}
export function reviewStocktake(id: string) {
  const post = api.POST as (path: string, init?: object) => ReturnType<typeof api.POST>
  return unwrapAs<unknown>(post('/v1/stocktakes/{id}/review', { params: { path: { id } } }))
}
export function closeStocktake(id: string) {
  const post = api.POST as (path: string, init?: object) => ReturnType<typeof api.POST>
  return unwrapAs<unknown>(post('/v1/stocktakes/{id}/close', { params: { path: { id } } }))
}
export function cancelStocktake(id: string) {
  return unwrap(api.POST('/v1/stocktakes/{id}/cancel', { params: { path: { id } } }))
}
export function stocktakeProgress(id: string) {
  return unwrap(api.GET('/v1/stocktakes/{id}/progress', { params: { path: { id } } }))
}
export function stocktakeItems(id: string, params: Record<string, unknown>) {
  return unwrap(
    api.GET('/v1/stocktakes/{id}/items', {
      params: { path: { id }, query: pageQuery(params as never) as never },
    }),
  )
}
export function patchStocktakeItem(id: string, itemId: string, body: Record<string, unknown>) {
  return unwrap(
    api.PATCH('/v1/stocktakes/{id}/items/{itemId}', {
      params: { path: { id, itemId } },
      body: body as never,
    }),
  )
}
export function postCounts(id: string, counts: Record<string, unknown>[]) {
  return unwrap(
    api.POST('/v1/stocktakes/{id}/counts', { params: { path: { id } }, body: { counts } as never }),
  )
}
export function stocktakeExtras(id: string) {
  return unwrap(api.GET('/v1/stocktakes/{id}/extras', { params: { path: { id } } }))
}
export function resolveExtra(
  id: string,
  extraId: string,
  body: { itemId?: string; ignore?: boolean },
) {
  return unwrap(
    api.POST('/v1/stocktakes/{id}/extras/{extraId}/resolve', {
      params: { path: { id, extraId } },
      body: body as never,
    }),
  )
}
export function downloadStocktakeReport(id: string) {
  return downloadFile(`/v1/stocktakes/${id}/report.pdf`, {}, 'bien-ban-kk.pdf')
}
