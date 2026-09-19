import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import * as nApi from './api'
import type { NotificationListParams } from './api'
import { openNotificationStream } from './stream'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { messageFor } from '@/api/errors'

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (p: NotificationListParams) => ['notifications', 'list', p] as const,
}

export function useNotifications(params: NotificationListParams) {
  const polling = useUiStore((s) => s.notificationsPolling)
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => nApi.listNotifications(params),
    refetchInterval: polling ? 60_000 : false,
  })
}

/** Số chưa đọc cho badge chuông (dùng chung cache với popover). */
export function useUnreadCount() {
  return useNotifications({ page: 1, limit: 8 }).data?.unreadCount ?? 0
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: nApi.markRead,
    onSuccess: () => void qc.invalidateQueries({ queryKey: notificationKeys.all }),
    onError: (e) => toast.error(messageFor(e)),
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  const { t } = useTranslation('notifications')
  return useMutation({
    mutationFn: nApi.markAllRead,
    onSuccess: () => {
      toast.success(t('allRead'))
      void qc.invalidateQueries({ queryKey: notificationKeys.all })
    },
    onError: (e) => toast.error(messageFor(e)),
  })
}

/** Mở SSE khi đã đăng nhập; event mới → làm mới cache + toast nhẹ. */
export function useNotificationStream() {
  const token = useAuthStore((s) => s.accessToken)
  const qc = useQueryClient()
  const setPolling = useUiStore((s) => s.setNotificationsPolling)
  useEffect(() => {
    if (!token) return
    const ctrl = new AbortController()
    void openNotificationStream({
      signal: ctrl.signal,
      onEvent: (e) => {
        if (e.event !== 'notification') return
        void qc.invalidateQueries({ queryKey: notificationKeys.all })
        try {
          const n = JSON.parse(e.data) as { title?: string; body?: string }
          if (n.title) toast(n.title, { description: n.body })
        } catch {
          /* bỏ qua payload lạ */
        }
      },
      onFallback: () => setPolling(true),
    })
    return () => ctrl.abort()
    // Chỉ mở lại khi đăng nhập/đăng xuất; token xoay vòng do middleware xử lý.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!token])
}
