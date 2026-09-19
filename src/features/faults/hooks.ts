import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { messageFor } from '@/api/errors'
import * as api from './api'
import type { FaultListParams } from './types'

export const faultKeys = {
  all: ['faults'] as const,
  list: (params: FaultListParams) => ['faults', 'list', params] as const,
  detail: (id: string) => ['faults', 'detail', id] as const,
  suggestions: (params: object) => ['faults', 'suggestions', params] as const,
}

export function useFaults(params: FaultListParams) {
  return useQuery({
    queryKey: faultKeys.list(params),
    queryFn: () => api.listFaults(params),
    placeholderData: (previous) => previous,
  })
}

export function useFault(id: string) {
  return useQuery({
    queryKey: faultKeys.detail(id),
    queryFn: () => api.getFault(id),
    enabled: !!id,
  })
}

export function useInvalidateFaults() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: faultKeys.all })
}

export function usePublishFault() {
  const invalidate = useInvalidateFaults()
  return useMutation({
    mutationFn: api.publishFault,
    onSuccess: () => {
      toast.success('Đã ban hành lỗi')
      void invalidate()
    },
    onError: (error) => toast.error(messageFor(error)),
  })
}

export function useArchiveFault() {
  const invalidate = useInvalidateFaults()
  return useMutation({
    mutationFn: api.archiveFault,
    onSuccess: () => {
      toast.success('Đã lưu trữ lỗi')
      void invalidate()
    },
    onError: (error) => toast.error(messageFor(error)),
  })
}
