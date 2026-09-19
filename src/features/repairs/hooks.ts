import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { messageFor } from '@/api/errors'
import * as api from './api'
import type { RepairListParams } from './types'

export const repairKeys = {
  all: ['repairs'] as const,
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

export function useInvalidateRepairs() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: repairKeys.all })
}

export function usePublicRepairSettings() {
  return useQuery({
    queryKey: ['settings', 'public', 'repair'],
    queryFn: api.publicRepairSettings,
    staleTime: 60_000,
  })
}

export function useRepairAction(success: string) {
  const invalidate = useInvalidateRepairs()
  return {
    invalidate,
    run: async (action: () => Promise<unknown>) => {
      try {
        await action()
        toast.success(success)
        void invalidate()
      } catch (error) {
        toast.error(messageFor(error))
        throw error
      }
    },
  }
}

export function useMutationToast<T, V>(fn: (v: V) => Promise<T>, success: string) {
  const invalidate = useInvalidateRepairs()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(success)
      void invalidate()
    },
    onError: (error) => toast.error(messageFor(error)),
  })
}
