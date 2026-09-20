import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { api as http, unwrapAs } from '@/api/client'
import { pageQuery } from '@/api/paths'
import { messageFor } from '@/api/errors'
import { resolveCatalogItem } from '@/api/references'
import { useCan } from '@/app/guards/useCan'
import { useAuthStore } from '@/stores/auth.store'
import { ADM } from '@/routes/roles'
import { shortId } from '@/lib/format/id'
import * as api from './api'
import type { RepairListParams } from './types'

export const repairKeys = {
  all: ['repairs'] as const,
  lists: () => ['repairs', 'list'] as const,
  list: (params: RepairListParams) => ['repairs', 'list', params] as const,
  detail: (id: string) => ['repairs', 'detail', id] as const,
}

export function useRepairs(params: RepairListParams) {
  return useQuery({
    queryKey: repairKeys.list(params),
    queryFn: () => api.listRepairs(params),
    placeholderData: (previous) => previous,
  })
}

export function useRepair(id: string) {
  return useQuery({
    queryKey: repairKeys.detail(id),
    queryFn: () => api.getRepair(id),
    enabled: !!id,
  })
}

/** Invalidate đúng chi tiết + danh sách (không quét toàn bộ `['repairs']`). */
export function useInvalidateRepair() {
  const qc = useQueryClient()
  return (id?: string) => {
    if (id) void qc.invalidateQueries({ queryKey: repairKeys.detail(id) })
    void qc.invalidateQueries({ queryKey: repairKeys.lists() })
  }
}

export function usePublicRepairSettings() {
  return useQuery({
    queryKey: ['settings', 'public', 'repair'],
    queryFn: api.publicRepairSettings,
    staleTime: 60_000,
  })
}

/**
 * Tên người dùng: `GET /v1/users` chỉ HOSPITAL_ADMIN đọc được → role khác không gọi.
 * Người hiện tại lấy từ store; id còn lại hiển thị UUID rút gọn (API thiếu danh bạ).
 */
export function useUserNames() {
  const canListUsers = useCan(ADM)
  const me = useAuthStore((state) => state.user)
  const users = useQuery({
    queryKey: ['repairs', 'user-names'],
    queryFn: async () => {
      const result = await unwrapAs<{
        items: { id: string; username: string; fullName: string }[]
      }>(http.GET('/v1/users', { params: { query: pageQuery({ page: 1, limit: 200 }) } }))
      return result.items
    },
    enabled: canListUsers,
    staleTime: 60_000,
  })
  const names = new Map((users.data ?? []).map((user) => [user.id, user.fullName || user.username]))
  return (id: string | null | undefined) => {
    if (!id) return '—'
    if (me?.id === id) return me.fullName || me.username
    return names.get(id) ?? shortId(id) ?? '—'
  }
}

/** Khoa đọc được với mọi role (`GET /v1/departments`). */
export function useDepartmentNames() {
  const departments = useQuery({
    queryKey: ['repairs', 'department-names'],
    queryFn: async () => {
      const data = await unwrapAs<
        | { id: string; code: string; name: string }[]
        | { items: { id: string; code: string; name: string }[] }
      >(http.GET('/v1/departments', { params: { query: { all: true } } }))
      return Array.isArray(data) ? data : data.items
    },
    staleTime: 300_000,
  })
  const names = new Map(
    (departments.data ?? []).map((row) => [row.id, `${row.code} — ${row.name}`]),
  )
  return (id: string | null | undefined) => {
    if (!id) return '—'
    return names.get(id) ?? shortId(id) ?? '—'
  }
}

/** Mã lô kho từ `GET /v1/supplies/:id/stock` (schema OpenAPI còn thiếu field). */
export function useStockLotNames(parts: { supplyId: string | null; stockLotId: string | null }[]) {
  const supplyIds = [
    ...new Set(parts.map((row) => row.supplyId).filter((id): id is string => !!id)),
  ].sort()
  const lots = useQuery({
    queryKey: ['repairs', 'stock-lots', supplyIds.join(',')],
    queryFn: async () => {
      const map: Record<string, string> = {}
      for (const supplyId of supplyIds) {
        try {
          const data = await api.supplyStock(supplyId)
          for (const lot of [...(data.lots ?? []), ...(data.balances ?? [])])
            map[lot.id] = lot.lotNo ?? lot.id
        } catch {
          // Không có quyền/không tìm thấy: hiển thị UUID rút gọn.
        }
      }
      return map
    },
    enabled: supplyIds.length > 0,
    staleTime: 60_000,
  })
  return (lotId: string | null | undefined) => {
    if (!lotId) return '—'
    return lots.data?.[lotId] ?? shortId(lotId) ?? '—'
  }
}

/** Tên nhà cung cấp từ catalog (mọi role đọc được). */
export function useSupplierNames(ids: (string | null)[]) {
  const unique = [...new Set(ids.filter((id): id is string => !!id))].sort()
  const suppliers = useQuery({
    queryKey: ['repairs', 'supplier-names', unique.join(',')],
    queryFn: async () => {
      const map: Record<string, string> = {}
      for (const id of unique) {
        const ref = await resolveCatalogItem('suppliers', id)
        if (ref) map[id] = `${ref.code} — ${ref.name}`
      }
      return map
    },
    enabled: unique.length > 0,
    staleTime: 300_000,
  })
  return (id: string | null | undefined) => {
    if (!id) return '—'
    return suppliers.data?.[id] ?? shortId(id) ?? '—'
  }
}

/** Chạy một hành động đổi trạng thái kèm confirm/toast; invalidate chi tiết + danh sách. */
export function useRepairAction(successKey: string) {
  const { t } = useTranslation('repairs')
  const invalidate = useInvalidateRepair()
  return {
    invalidate,
    run: async (action: () => Promise<unknown>) => {
      try {
        await action()
        toast.success(t(successKey))
        invalidate()
      } catch (error) {
        toast.error(messageFor(error))
        throw error
      }
    },
  }
}
