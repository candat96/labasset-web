import { api, apiBody, unwrap, unwrapAs } from '@/api/client'
import { downloadFile } from '@/api/download'
import { apiQuery } from '@/api/paths'
import type { paths } from '@/api/schema'
import type { CatalogPageResult, CatalogRow, CatalogSlug, ImportResult } from './types'

type CatalogBody = Record<string, string | number | boolean | null>
type CatalogPath = `/v1/catalogs/${CatalogSlug}`
type CatalogQuery = NonNullable<paths[CatalogPath]['get']['parameters']['query']>
type CatalogCreateBody = NonNullable<
  paths[CatalogPath]['post']['requestBody']
>['content']['application/json']
type CatalogUpdateBody = NonNullable<
  paths[`${CatalogPath}/{id}`]['patch']['requestBody']
>['content']['application/json']
const collection = (slug: CatalogSlug) => `/v1/catalogs/${slug}` as const
const detail = (slug: CatalogSlug) => `/v1/catalogs/${slug}/{id}` as const

// OpenAPI exposes eleven separate routes with the same contract; the casts keep the shared client centralized.
export function listCatalog(
  slug: CatalogSlug,
  params: {
    page?: number
    limit?: number
    q?: string
    isActive?: boolean
    all?: boolean
    departmentId?: string
  },
) {
  return unwrapAs<CatalogPageResult | CatalogRow[]>(
    api.GET(collection(slug), { params: { query: apiQuery<CatalogQuery>(params) } }),
  )
}
export function getCatalog(slug: CatalogSlug, id: string) {
  return unwrapAs<CatalogRow>(api.GET(detail(slug), { params: { path: { id } } }))
}
export function createCatalog(slug: CatalogSlug, body: CatalogBody) {
  return unwrapAs<CatalogRow>(
    api.POST(collection(slug), { body: apiBody<CatalogCreateBody>(body) }),
  )
}
export function updateCatalog(slug: CatalogSlug, id: string, body: CatalogBody) {
  return unwrapAs<CatalogRow>(
    api.PATCH(detail(slug), { params: { path: { id } }, body: apiBody<CatalogUpdateBody>(body) }),
  )
}
/** 204 = xoá hẳn; 200 `{ deactivated: true }` = còn tham chiếu nên ngừng hoạt động. */
export async function deleteCatalog(
  slug: CatalogSlug,
  id: string,
): Promise<{ deactivated: boolean }> {
  const { data, response, error } = await api.DELETE(detail(slug), { params: { path: { id } } })
  if (error !== undefined || !response.ok) {
    await unwrap(Promise.resolve({ response, error }))
  }
  if (response.status === 204) return { deactivated: false }
  const body = data as { deactivated?: boolean } | undefined
  return { deactivated: !!body?.deactivated }
}
export function importCatalog(slug: CatalogSlug, file: File) {
  const data = new FormData()
  data.append('file', file)
  return unwrapAs<ImportResult>(
    api.POST(`/v1/catalogs/${slug}/import`, {
      body: data as unknown as { file: string },
      bodySerializer: (body) => body as unknown as BodyInit,
    }),
  )
}
export function exportCatalog(
  slug: CatalogSlug,
  params: { q?: string; isActive?: boolean; departmentId?: string },
) {
  return downloadFile(`/v1/catalogs/${slug}/export`, params, `${slug}.xlsx`)
}
export function downloadCatalogTemplate(slug: CatalogSlug) {
  return downloadFile(`/v1/catalogs/${slug}/template`, {}, `${slug}-mau.xlsx`)
}
