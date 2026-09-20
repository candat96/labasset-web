import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { messageFor } from '@/api/errors'
import * as api from './api'
import type { EquipmentListParams } from './types'

/**
 * Query key của feature. Mọi tab con của chi tiết nằm DƯỚI `detail(id)` nên
 * `invalidateQueries(detail(id))` làm mới chi tiết + toàn bộ tab mà không quét cả `['equipment']`.
 */
export const equipmentKeys = {
  all: ['equipment'] as const,
  lists: () => ['equipment', 'list'] as const,
  list: (params: EquipmentListParams) => ['equipment', 'list', params] as const,
  lookup: () => ['equipment', 'lookup'] as const,
  detail: (id: string) => ['equipment', 'detail', id] as const,
  accessories: (id: string) => ['equipment', 'detail', id, 'accessories'] as const,
  software: (id: string) => ['equipment', 'detail', id, 'software'] as const,
  softwareHistory: (id: string, sid: string) =>
    ['equipment', 'detail', id, 'software', sid, 'history'] as const,
  components: (id: string) => ['equipment', 'detail', id, 'components'] as const,
  replacements: (id: string, cid: string) =>
    ['equipment', 'detail', id, 'components', cid, 'replacements'] as const,
  supplies: (id: string) => ['equipment', 'detail', id, 'supplies'] as const,
  runway: (id: string) => ['equipment', 'detail', id, 'runway'] as const,
  counters: (id: string) => ['equipment', 'detail', id, 'counters'] as const,
  events: (id: string) => ['equipment', 'detail', id, 'events'] as const,
  statusHistory: (id: string) => ['equipment', 'detail', id, 'status-history'] as const,
  repairs: (id: string) => ['equipment', 'detail', id, 'repairs'] as const,
  maintenance: (id: string) => ['equipment', 'detail', id, 'maintenance'] as const,
  calibrations: (id: string) => ['equipment', 'detail', id, 'calibrations'] as const,
  transfers: (id: string) => ['equipment', 'detail', id, 'transfers'] as const,
  compare: (a: string, b: string) => ['equipment', 'compare', a, b] as const,
  byQr: (token: string) => ['equipment', 'by-qr', token] as const,
}

export const transferKeys = {
  all: ['equipment-transfers'] as const,
  list: (params: { page?: number; limit?: number; status?: string; departmentId?: string }) =>
    ['equipment-transfers', params] as const,
}

export function useEquipmentList(params: EquipmentListParams) {
  return useQuery({
    queryKey: equipmentKeys.list(params),
    queryFn: () => api.listEquipment(params),
    placeholderData: (previous) => previous,
  })
}

export function useEquipment(id: string) {
  return useQuery({
    queryKey: equipmentKeys.detail(id),
    queryFn: () => api.getEquipment(id),
    enabled: !!id,
  })
}

/**
 * Invalidate danh sách + (nếu có `id`) chi tiết của một máy. Mọi tab của chi tiết
 * là key con của `detail(id)` nên được làm mới theo, không quét toàn bộ `['equipment']`.
 */
export function useInvalidateEquipment(id?: string) {
  const qc = useQueryClient()
  return useCallback(() => {
    void qc.invalidateQueries({ queryKey: equipmentKeys.lists() })
    if (id) void qc.invalidateQueries({ queryKey: equipmentKeys.detail(id) })
  }, [qc, id])
}

export function useDeleteEquipment() {
  const { t } = useTranslation('equipment')
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteEquipment,
    onSuccess: (_data, id) => {
      toast.success(t('toasts.deleted'))
      void qc.invalidateQueries({ queryKey: equipmentKeys.lists() })
      void qc.invalidateQueries({ queryKey: equipmentKeys.detail(id) })
    },
    onError: (error) => toast.error(messageFor(error)),
  })
}
