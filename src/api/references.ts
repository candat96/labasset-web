import { api, unwrapAs } from './client'
import { pageQuery } from './paths'
// TODO(api): Các API danh mục còn thiếu response schema.
export interface Reference {
  id: string
  code: string
  name: string
}
export async function departmentOptions(q: string): Promise<Reference[]> {
  const data = await unwrapAs<{ items: Reference[] }>(
    api.GET('/v1/departments', { params: { query: { q } } }),
  )
  return data.items
}
export async function allDepartments(): Promise<Reference[]> {
  return unwrapAs<Reference[]>(api.GET('/v1/departments', { params: { query: { all: true } } }))
}

function asOptions(result: Reference[] | { items: Reference[] } | undefined): Reference[] {
  if (!result) return []
  return Array.isArray(result) ? result : result.items
}

export async function catalogOptions(
  slug:
    | 'manufacturers'
    | 'equipment-groups'
    | 'fault-groups'
    | 'component-types'
    | 'suppliers'
    | 'warehouses'
    | 'units'
    | 'supply-groups'
    | 'calibration-agencies',
  q: string,
): Promise<Reference[]> {
  const query = { params: { query: pageQuery({ q, all: true, page: 1, limit: 50 }) } }
  const loaders = {
    manufacturers: () => api.GET('/v1/catalogs/manufacturers', query),
    'equipment-groups': () => api.GET('/v1/catalogs/equipment-groups', query),
    'fault-groups': () => api.GET('/v1/catalogs/fault-groups', query),
    'component-types': () => api.GET('/v1/catalogs/component-types', query),
    suppliers: () => api.GET('/v1/catalogs/suppliers', query),
    warehouses: () => api.GET('/v1/catalogs/warehouses', query),
    units: () => api.GET('/v1/catalogs/units', query),
    'supply-groups': () => api.GET('/v1/catalogs/supply-groups', query),
    'calibration-agencies': () => api.GET('/v1/catalogs/calibration-agencies', query),
  }
  return asOptions(await unwrapAs<Reference[] | { items: Reference[] }>(loaders[slug]()))
}

export async function userOptions(
  q: string,
  role?: 'HOSPITAL_ADMIN' | 'EQUIPMENT_STAFF' | 'DEPT_HEAD' | 'DEPT_USER',
): Promise<Reference[]> {
  const result = await unwrapAs<{ items: { id: string; username: string; fullName: string }[] }>(
    api.GET('/v1/users', {
      params: { query: pageQuery({ q, page: 1, limit: 50, role }) },
    }),
  )
  return result.items.map((user) => ({
    id: user.id,
    code: user.username,
    name: user.fullName,
  }))
}

export async function staffUserOptions(q: string): Promise<Reference[]> {
  const [staff, admins] = await Promise.all([
    userOptions(q, 'EQUIPMENT_STAFF'),
    userOptions(q, 'HOSPITAL_ADMIN'),
  ])
  const seen = new Set<string>()
  return [...staff, ...admins].filter((row) => {
    if (seen.has(row.id)) return false
    seen.add(row.id)
    return true
  })
}

export async function supplyOptions(q: string): Promise<Reference[]> {
  const result = await unwrapAs<Reference[] | { items: Reference[] }>(
    api.GET('/v1/supplies', { params: { query: pageQuery({ q, page: 1, limit: 50 }) } }),
  )
  return asOptions(result)
}

export async function equipmentOptions(q: string): Promise<Reference[]> {
  const result = await unwrapAs<{ items: { id: string; code: string; name: string }[] }>(
    api.GET('/v1/equipment', { params: { query: pageQuery({ q, page: 1, limit: 50 }) } }),
  )
  return result.items
}
