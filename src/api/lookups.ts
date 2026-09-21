import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, unwrapAs } from './client'
import { pageQuery } from './paths'
import { allDepartments, catalogOptions, roomOptions, userOptions } from './references'
import type { components } from './schema'

/**
 * Bảng tra id → nhãn dùng chung cho các list DTO chỉ trả id (kho, khoa, người,
 * máy). Cache theo react-query; dùng để hiển thị, không lọc phía web.
 * TODO(api): chưa có `GET /v1/equipment?ids=` — tạm tải trang đầu 200 máy.
 */
type EquipmentItem = components['schemas']['EquipmentListItemDto']

export interface EquipmentRef {
  id: string
  code: string
  name: string
  departmentName: string | null
  location: string | null
}

export function useWarehouseNames() {
  const query = useQuery({
    queryKey: ['catalog-options', 'warehouses'],
    queryFn: () => catalogOptions('warehouses', ''),
    staleTime: 300_000,
  })
  return useMemo(() => new Map((query.data ?? []).map((row) => [row.id, row.name])), [query.data])
}

export function useSupplierNames() {
  const query = useQuery({
    queryKey: ['catalog-options', 'suppliers'],
    queryFn: () => catalogOptions('suppliers', ''),
    staleTime: 300_000,
  })
  return useMemo(() => new Map((query.data ?? []).map((row) => [row.id, row.name])), [query.data])
}

export function useDepartmentLookup(enabled = true) {
  const query = useQuery({
    queryKey: ['references', 'departments'],
    queryFn: allDepartments,
    enabled,
    staleTime: 300_000,
  })
  return useMemo(() => new Map((query.data ?? []).map((row) => [row.id, row.name])), [query.data])
}

/** id phòng → `{ name, code }` (mọi phòng đang hoạt động, ≤ 100 — dùng cho cột Phòng đích điều chuyển). */
export function useRoomLookup(enabled = true) {
  const query = useQuery({
    queryKey: ['reference', 'rooms', 'lookup'],
    queryFn: () => roomOptions('', undefined, true),
    enabled,
    staleTime: 300_000,
  })
  return useMemo(
    () => new Map((query.data ?? []).map((row) => [row.id, { name: row.name, code: row.code }])),
    [query.data],
  )
}

/** `GET /v1/users` chỉ mở cho ADM → vai trò khác truyền `enabled=false`. */
export function useUserLookup(enabled = true) {
  const query = useQuery({
    queryKey: ['users', 'lookup'] as const,
    queryFn: () => userOptions(''),
    enabled,
    staleTime: 300_000,
  })
  return useMemo(() => new Map((query.data ?? []).map((row) => [row.id, row.name])), [query.data])
}

export function useEquipmentLookup() {
  const query = useQuery({
    queryKey: ['equipment', 'lookup-full'] as const,
    queryFn: () =>
      unwrapAs<{ items: EquipmentItem[] }>(
        api.GET('/v1/equipment', { params: { query: pageQuery({ page: 1, limit: 200 }) } }),
      ),
    staleTime: 60_000,
  })
  return useMemo(
    () =>
      new Map<string, EquipmentRef>(
        (query.data?.items ?? []).map((row) => [
          row.id,
          {
            id: row.id,
            code: row.code,
            name: row.name,
            departmentName: row.departmentName,
            location: row.location,
          },
        ]),
      ),
    [query.data],
  )
}

/** Rút gọn UUID khi không tra được tên. */
export const shortId = (id?: string | null) => (id ? id.slice(0, 8) : '—')
