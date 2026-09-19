import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { messageFor } from '@/api/errors'
import * as api from './api'
import type { HospitalListParams } from './api'

export const hospitalKeys = {
  all: ['sys-hospitals'] as const,
  list: (params: HospitalListParams) => ['sys-hospitals', 'list', params] as const,
  detail: (id: string) => ['sys-hospitals', 'detail', id] as const,
}

export function useHospitals(params: HospitalListParams) {
  return useQuery({
    queryKey: hospitalKeys.list(params),
    queryFn: () => api.listHospitals(params),
    placeholderData: (previous) => previous,
  })
}

export function useHospital(id: string) {
  return useQuery({
    queryKey: hospitalKeys.detail(id),
    queryFn: () => api.getHospital(id),
    enabled: !!id,
  })
}

export function useHospitalMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: hospitalKeys.all })
  return {
    invalidate,
    create: useMutation({ mutationFn: api.createHospital, onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: Parameters<typeof api.updateHospital>[1] }) =>
        api.updateHospital(id, body),
      onSuccess: invalidate,
    }),
    action: useMutation({
      mutationFn: ({
        id,
        action,
      }: {
        id: string
        action: Parameters<typeof api.hospitalAction>[1]
      }) => api.hospitalAction(id, action),
      onSuccess: invalidate,
      onError: (error) => toast.error(messageFor(error)),
    }),
    resetAdmin: useMutation({
      mutationFn: api.resetHospitalAdmin,
      onSuccess: invalidate,
      onError: (error) => toast.error(messageFor(error)),
    }),
  }
}
