import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, unwrapAs } from '@/api/client'
import { listEquipment, userOptions } from '../api'
import { equipmentKeys } from '../hooks'

export const shortId = (id?: string | null) => (id ? id.slice(0, 8) : '—')

interface Ref {
  id: string
  code: string
  name: string
}

/** TODO(api): `/v1/departments` chưa có response schema — chuẩn hoá cả mảng lẫn `{ items }`. */
async function loadDepartments(): Promise<Ref[]> {
  const result = await unwrapAs<Ref[] | { items?: Ref[] }>(
    api.GET('/v1/departments', { params: { query: { all: true } } }),
  )
  return Array.isArray(result) ? result : (result.items ?? [])
}

/** Bảng tra id → nhãn cho các DTO chỉ trả id (điều chuyển, timeline). */
export function useEquipmentNames() {
  const query = useQuery({
    queryKey: equipmentKeys.lookup(),
    queryFn: () => listEquipment({ page: 1, limit: 200 }),
    staleTime: 60_000,
  })
  return useMemo(
    () => new Map((query.data?.items ?? []).map((row) => [row.id, `${row.code} — ${row.name}`])),
    [query.data],
  )
}

export function useDepartmentNames() {
  const query = useQuery({
    queryKey: ['departments', 'lookup'] as const,
    queryFn: loadDepartments,
    staleTime: 300_000,
  })
  return useMemo(() => new Map((query.data ?? []).map((row) => [row.id, row.name])), [query.data])
}

/** `GET /v1/users` chỉ mở cho ADM → vai trò khác truyền `enabled=false` (hiện id rút gọn). */
export function useUserNames(enabled: boolean) {
  const query = useQuery({
    queryKey: ['users', 'lookup'] as const,
    queryFn: () => userOptions('', 200),
    enabled,
    staleTime: 300_000,
  })
  return useMemo(() => new Map((query.data ?? []).map((row) => [row.id, row.name])), [query.data])
}
