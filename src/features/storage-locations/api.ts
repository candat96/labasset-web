import { unwrap, unwrapAs, untypedApi } from '@/api/client'
import type { StorageLocation, StorageLocationPage } from './types'

const base = '/v1/catalogs/storage-locations'

export function listStorageLocations(params: Record<string, unknown>) {
  return unwrapAs<StorageLocation[] | StorageLocationPage>(
    untypedApi.GET(base, { params: { query: params } }),
  )
}

export function createStorageLocation(body: Record<string, unknown>) {
  return unwrapAs<StorageLocation>(untypedApi.POST(base, { body }))
}

export function updateStorageLocation(id: string, body: Record<string, unknown>) {
  return unwrapAs<StorageLocation>(
    untypedApi.PATCH(`${base}/{id}`, { params: { path: { id } }, body }),
  )
}

export async function deleteStorageLocation(id: string): Promise<{ deactivated: boolean }> {
  const result = await untypedApi.DELETE(`${base}/{id}`, { params: { path: { id } } })
  if (result.response.status === 204) return { deactivated: false }
  await unwrap(Promise.resolve(result))
  return {
    deactivated: !!(result.data as { deactivated?: boolean } | undefined)?.deactivated,
  }
}
