import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { messageFor } from '@/api/errors'
import * as api from './api'
import type { EquipmentListParams } from './types'

export const equipmentKeys = {
  all: ['equipment'] as const,
  list: (params: EquipmentListParams) => ['equipment', 'list', params] as const,
  detail: (id: string) => ['equipment', 'detail', id] as const,
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

export function useInvalidateEquipment() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: equipmentKeys.all })
}

export function useDeleteEquipment() {
  const invalidate = useInvalidateEquipment()
  return useMutation({
    mutationFn: api.deleteEquipment,
    onSuccess: () => {
      toast.success('Đã xoá máy')
      void invalidate()
    },
    onError: (error) => toast.error(messageFor(error)),
  })
}
