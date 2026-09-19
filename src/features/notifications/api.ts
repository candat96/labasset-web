import { api, unwrap } from '@/api/client'
import { pageQuery } from '@/api/paths'
import type { components } from '@/api/schema'

export type Notification = components['schemas']['NotificationViewDto']
export type NotificationsPage = components['schemas']['NotificationsPageDto']

export interface NotificationListParams {
  unread?: boolean
  page?: number
  limit?: number
}

export function listNotifications(params: NotificationListParams = {}) {
  return unwrap(
    api.GET('/v1/notifications', { params: { query: pageQuery(params) } }),
  ) as Promise<NotificationsPage>
}

export function markRead(id: string) {
  return unwrap(api.POST('/v1/notifications/{id}/read', { params: { path: { id } } }))
}

export function markAllRead() {
  return unwrap(api.POST('/v1/notifications/read-all'))
}
