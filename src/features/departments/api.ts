import { api, unwrap, unwrapAs } from '@/api/client'
import { downloadFile } from '@/api/download'
import { pageQuery } from '@/api/paths'
import type {
  CreateDepartmentDto,
  Department,
  DepartmentListParams,
  ImportResult,
  PageResult,
  UpdateDepartmentDto,
} from './types'

export function listDepartments(params: DepartmentListParams) {
  return unwrapAs<PageResult<Department>>(
    api.GET('/v1/departments', { params: { query: pageQuery(params) } }),
  )
}

export function getDepartment(id: string) {
  return unwrapAs<Department>(api.GET('/v1/departments/{id}', { params: { path: { id } } }))
}

export function createDepartment(body: CreateDepartmentDto) {
  return unwrapAs<Department>(api.POST('/v1/departments', { body }))
}

export function updateDepartment(id: string, body: UpdateDepartmentDto) {
  return unwrapAs<Department>(api.PATCH('/v1/departments/{id}', { params: { path: { id } }, body }))
}

/** 204 = xoá hẳn; 200 `{ deactivated: true }` = còn tham chiếu nên chuyển ngừng hoạt động. */
export async function deleteDepartment(id: string): Promise<{ deactivated: boolean }> {
  const { data, response, error } = await api.DELETE('/v1/departments/{id}', {
    params: { path: { id } },
  })
  if (error !== undefined || !response.ok) {
    await unwrap(Promise.resolve({ response, error }))
  }
  if (response.status === 204) return { deactivated: false }
  const body = data as { deactivated?: boolean } | undefined
  return { deactivated: !!body?.deactivated }
}

export function importDepartments(file: File) {
  const fd = new FormData()
  fd.append('file', file)
  return unwrapAs<ImportResult>(
    api.POST('/v1/departments/import', {
      body: fd as unknown as { file: string },
      bodySerializer: (b) => b as unknown as BodyInit,
    }),
  )
}

export function exportDepartments(params: Pick<DepartmentListParams, 'q' | 'isActive'>) {
  return downloadFile('/v1/departments/export', params, 'khoa-phong.xlsx')
}

export function downloadDepartmentTemplate() {
  return downloadFile('/v1/departments/template', {}, 'khoa-phong-mau.xlsx')
}
