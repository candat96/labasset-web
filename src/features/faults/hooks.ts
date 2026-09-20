import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import { api as http, unwrapAs } from '@/api/client'
import { pageQuery } from '@/api/paths'
import { messageFor } from '@/api/errors'
import { useCan } from '@/app/guards/useCan'
import { useAuthStore } from '@/stores/auth.store'
import { ADM } from '@/routes/roles'
import { shortId } from '@/lib/format/id'
import * as api from './api'
import type { FaultListParams } from './types'

export const faultKeys = {
  all: ['faults'] as const,
  /** Mọi query danh sách (dùng để invalidate không quét toàn bộ module). */
  lists: () => ['faults', 'list'] as const,
  list: (params: FaultListParams) => ['faults', 'list', params] as const,
  detail: (id: string) => ['faults', 'detail', id] as const,
  versions: (id: string) => ['faults', 'versions', id] as const,
  version: (id: string, version: string | number) =>
    ['faults', 'versions', id, String(version)] as const,
  history: (id: string) => ['faults', 'history', id] as const,
  suggestions: ['faults', 'suggestions'] as const,
  suggestion: (id: string) => ['faults', 'suggestions', id] as const,
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

/** Invalidate đúng chi tiết + phiên bản/lịch sử của nó + danh sách liên quan. */
export function useInvalidateFault() {
  const qc = useQueryClient()
  return (id?: string) => {
    if (id) {
      void qc.invalidateQueries({ queryKey: faultKeys.detail(id) })
      void qc.invalidateQueries({ queryKey: faultKeys.versions(id) })
      void qc.invalidateQueries({ queryKey: faultKeys.history(id) })
    }
    void qc.invalidateQueries({ queryKey: faultKeys.lists() })
  }
}

export function useInvalidateSuggestions() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: faultKeys.suggestions })
    void qc.invalidateQueries({ queryKey: faultKeys.lists() })
  }
}

export function usePublishFault() {
  const { t } = useTranslation('faults')
  const invalidate = useInvalidateFault()
  return useMutation({
    mutationFn: api.publishFault,
    onSuccess: (_row, id) => {
      toast.success(t('detail.published'))
      invalidate(id)
    },
    onError: (error) => toast.error(messageFor(error)),
  })
}

export function useArchiveFault() {
  const { t } = useTranslation('faults')
  const invalidate = useInvalidateFault()
  return useMutation({
    mutationFn: api.archiveFault,
    onSuccess: (_row, id) => {
      toast.success(t('detail.archived'))
      invalidate(id)
    },
    onError: (error) => toast.error(messageFor(error)),
  })
}

/**
 * Tên người dùng: `GET /v1/users` chỉ HOSPITAL_ADMIN đọc được → role khác không gọi.
 * Người hiện tại lấy từ store; id còn lại (khi không phải ADM) hiển thị UUID rút gọn.
 */
export function useUserNames() {
  const canListUsers = useCan(ADM)
  const me = useAuthStore((state) => state.user)
  const users = useQuery({
    queryKey: ['faults', 'user-names'],
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
