import { api, unwrapAs } from './client'
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
