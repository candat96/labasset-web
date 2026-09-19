import { api, unwrap, unwrapAs } from '@/api/client'
import { pageQuery } from '@/api/paths'
import type { Settings } from './types'

export type { Settings }

export const getSettings = () => unwrapAs<Settings>(api.GET('/v1/settings'))
export const saveSettings = (body: Settings) => unwrap(api.PUT('/v1/settings', { body }))

// TODO(api): preview does not accept an unsaved template; it previews the persisted setting only.
export type NumberPreview = { template: string; example: string; nextValue: number }
export const previewNumber = (type: string) =>
  unwrapAs<NumberPreview | string>(
    api.GET('/v1/numbering/preview', { params: { query: { type } } }),
  )

export async function searchWarehouses(q: string) {
  const result = await unwrapAs<
    | { id: string; code: string; name: string }[]
    | { items: { id: string; code: string; name: string }[] }
  >(
    api.GET('/v1/catalogs/warehouses', {
      params: { query: pageQuery({ q, all: true, page: 1, limit: 50 }) },
    }),
  )
  return Array.isArray(result) ? result : result.items
}

export async function resolveWarehouse(id: string) {
  try {
    return await unwrapAs<{ id: string; code: string; name: string }>(
      api.GET('/v1/catalogs/warehouses/{id}', { params: { path: { id } } }),
    )
  } catch {
    const list = await searchWarehouses('')
    return list.find((row) => row.id === id) ?? null
  }
}
