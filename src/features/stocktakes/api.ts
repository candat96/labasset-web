import { api, apiBody, unwrap, unwrapAs } from '@/api/client'
import { downloadFile } from '@/api/download'
import { pageQuery } from '@/api/paths'
import type { components } from '@/api/schema'

export function listStocktakes(params: Record<string, unknown>) {
  return unwrap(api.GET('/v1/stocktakes', { params: { query: pageQuery(params) } }))
}
export function getStocktake(id: string) {
  return unwrap(api.GET('/v1/stocktakes/{id}', { params: { path: { id } } }))
}
export function createStocktake(body: components['schemas']['CreateStocktakeDto']) {
  return unwrap(api.POST('/v1/stocktakes', { body }))
}
export function updateStocktake(id: string, body: components['schemas']['UpdateStocktakeDto']) {
  return unwrap(api.PATCH('/v1/stocktakes/{id}', { params: { path: { id } }, body }))
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
  return unwrapAs<unknown>(api.POST('/v1/stocktakes/{id}/review', { params: { path: { id } } }))
}
export function closeStocktake(id: string) {
  return unwrapAs<unknown>(api.POST('/v1/stocktakes/{id}/close', { params: { path: { id } } }))
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
      params: { path: { id }, query: pageQuery(params) },
    }),
  )
}
export function patchStocktakeItem(id: string, itemId: string, body: Record<string, unknown>) {
  return unwrap(
    api.PATCH('/v1/stocktakes/{id}/items/{itemId}', {
      params: { path: { id, itemId } },
      body: body,
    }),
  )
}

export type StocktakePackageItem = {
  id: string
  lotId?: string
  code: string
  name: string
  supplyCode?: string
  manufacturerCode?: string
  qrToken?: string
  lotNo?: string
  bookQty?: string
  location?: string
}

type PackageRaw = {
  items?: Array<{
    id?: string
    itemId?: string
    lotId?: string | null
    code?: string
    name?: string
    supplyCode?: string | null
    manufacturerCode?: string | null
    qrToken?: string | null
    lotNo?: string | null
    bookQty?: string | null
    location?: string | null
  }>
}

export function stocktakePackage(id: string) {
  return unwrapAs<PackageRaw>(
    api.GET('/v1/stocktakes/{id}/package', { params: { path: { id } } }),
  ).then((data) => ({
    items: (data.items ?? []).map((item) => ({
      id: item.id ?? item.itemId ?? '',
      lotId: item.lotId ?? undefined,
      code: item.code ?? '',
      name: item.name ?? '',
      supplyCode: item.supplyCode ?? undefined,
      manufacturerCode: item.manufacturerCode ?? undefined,
      qrToken: item.qrToken ?? undefined,
      lotNo: item.lotNo ?? undefined,
      bookQty: item.bookQty ?? undefined,
      location: item.location ?? undefined,
    })),
  }))
}

export type StocktakeCountsResult = {
  accepted: number
  duplicated: number
  conflicts: { clientId: string; itemId: string; keptCountedAt?: string | null }[]
  extras: string[]
}

export function postCounts(id: string, counts: Record<string, unknown>[]) {
  return unwrapAs<StocktakeCountsResult>(
    api.POST('/v1/stocktakes/{id}/counts', {
      params: { path: { id } },
      body: apiBody({ counts }),
    }),
  )
}

export type StocktakeCompareItem = {
  key: string
  code: string
  name: string
  prevDiff: string | null
  currDiff: string | null
}

export type StocktakeCompare = {
  items: StocktakeCompareItem[]
  summary: { prevDiffCount: number; currDiffCount: number; repeated: number }
}

export function compareStocktakes(id: string, withSessionId: string) {
  return unwrapAs<StocktakeCompare>(
    api.GET('/v1/stocktakes/{id}/compare', {
      params: { path: { id }, query: { withSessionId } },
    }),
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
      body: body,
    }),
  )
}
export function downloadStocktakeReport(id: string) {
  return downloadFile(`/v1/stocktakes/${id}/report.pdf`, {}, 'bien-ban-kk.pdf')
}
