import { api, unwrap } from '@/api/client'
import { pageQuery } from '@/api/paths'
import type { components } from '@/api/schema'

export type Notification = components['schemas']['NotificationViewDto']
export type NotificationsPage = components['schemas']['NotificationsPageDto']

export interface NotificationListParams {
  type?: string
  unread?: boolean
  page?: number
  limit?: number
}

export async function listNotifications(
  params: NotificationListParams = {},
): Promise<NotificationsPage> {
  const { type, ...rest } = params
  const load = (query: Omit<NotificationListParams, 'type'>) =>
    unwrap(api.GET('/v1/notifications', { params: { query: pageQuery(query) } }))
  if (!type) return load(rest)
  // TODO(api): API chưa lọc type; trần 5 trang rồi lọc/phân trang phía client.
  const pageSize = 200
  const first = await load({ ...rest, page: 1, limit: pageSize })
  const all = [...first.items]
  for (let page = 2; page <= 5 && all.length < first.total; page++) {
    const next = await load({ ...rest, page, limit: pageSize })
    if (!next.items.length) break
    all.push(...next.items)
  }
  const filtered = all.filter((n) => n.type === type)
  const page = rest.page ?? 1,
    limit = rest.limit ?? 20
  return {
    ...first,
    items: filtered.slice((page - 1) * limit, page * limit),
    total: filtered.length,
    page,
    limit,
  }
}
export const getPreferences = () => unwrap(api.GET('/v1/notifications/preferences'))
export const savePreferences = (preferences: components['schemas']['PreferenceDto'][]) =>
  unwrap(api.PUT('/v1/notifications/preferences', { body: { preferences } }))

export function markRead(id: string) {
  return unwrap(api.POST('/v1/notifications/{id}/read', { params: { path: { id } } }))
}

export function markAllRead() {
  return unwrap(api.POST('/v1/notifications/read-all'))
}
