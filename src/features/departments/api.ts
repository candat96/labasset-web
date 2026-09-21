import { api, unwrap, unwrapAs, untypedApi } from '@/api/client'
import type { components } from '@/api/schema'
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

// TODO(api): endpoint users chưa có response schema.
export interface DepartmentUser {
  id: string
  username: string
  fullName: string
  email: string | null
  roles: string[]
  isActive: boolean
}
export const getDepartmentUsers = (id: string, page = 1, limit = 20) =>
  unwrapAs<PageResult<DepartmentUser>>(
    api.GET('/v1/departments/{id}/users', {
      params: { path: { id }, query: pageQuery({ page, limit }) },
    }),
  )

export type DepartmentRoom = components['schemas']['RoomResponseDto']

/** Phòng của đơn vị — API hiện trả kèm cả phòng dùng chung (departmentId null). */
export function getDepartmentRooms(id: string) {
  return unwrapAs<DepartmentRoom[]>(
    api.GET('/v1/departments/{id}/rooms', { params: { path: { id } } }),
  )
}

/**
 * Số máy theo phòng của đơn vị — lấy từ báo cáo `equipment.byRoom` (API chưa trả
 * `equipmentCount` trong RoomResponseDto; xem WEB-NOTES 14). Khớp theo `roomCode`.
 */
export async function getDepartmentRoomCounts(id: string): Promise<Map<string, number>> {
  const result = await unwrapAs<{ rows: { roomCode?: string | null; total?: number }[] }>(
    untypedApi.GET('/v1/reports/equipment.byRoom', {
      params: { query: { departmentId: id, format: 'json', page: 1, limit: 200 } },
    }),
  )
  return new Map(
    result.rows
      .filter((row) => typeof row.roomCode === 'string')
      .map((row) => [row.roomCode as string, Number(row.total ?? 0)]),
  )
}
