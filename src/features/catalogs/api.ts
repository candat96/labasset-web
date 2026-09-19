import { api, unwrap, unwrapAs } from '@/api/client'
import { downloadFile } from '@/api/download'
import { pageQuery } from '@/api/paths'
import type { CatalogPageResult, CatalogRow, CatalogSlug, ImportResult } from './types'

type CatalogBody = Record<string, string | number | boolean | null>
const collection = (slug: CatalogSlug) => `/v1/catalogs/${slug}` as const
const detail = (slug: CatalogSlug) => `/v1/catalogs/${slug}/{id}` as const

// OpenAPI exposes eleven separate routes with the same contract; the casts keep the shared client centralized.
export function listCatalog(
  slug: CatalogSlug,
  params: { page?: number; limit?: number; q?: string; isActive?: boolean; all?: boolean },
) {
  return unwrapAs<CatalogPageResult | CatalogRow[]>(
    api.GET(collection(slug), { params: { query: pageQuery(params) } }),
  )
}
export function createCatalog(slug: CatalogSlug, body: CatalogBody) {
  return unwrapAs<CatalogRow>(api.POST(collection(slug), { body: body as never }))
}
export function updateCatalog(slug: CatalogSlug, id: string, body: CatalogBody) {
  return unwrapAs<CatalogRow>(
    api.PATCH(detail(slug), { params: { path: { id } }, body: body as never }),
  )
}
export function deleteCatalog(slug: CatalogSlug, id: string) {
  return unwrap(api.DELETE(detail(slug), { params: { path: { id } } }))
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
export function exportCatalog(slug: CatalogSlug, params: { q?: string; isActive?: boolean }) {
  return downloadFile(`/v1/catalogs/${slug}/export`, params, `${slug}.xlsx`)
}
export function downloadCatalogTemplate(slug: CatalogSlug) {
  return downloadFile(`/v1/catalogs/${slug}/template`, {}, `${slug}-mau.xlsx`)
}
