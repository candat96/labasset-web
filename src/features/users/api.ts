import { api, unwrapAs } from '@/api/client'
import { pageQuery } from '@/api/paths'
import type { UserView } from '@/stores/auth.store'

// TODO(api): GET /v1/users chưa có response schema và chưa hỗ trợ `all=true`.
export interface UsersPage {
  items: UserView[]
  total: number
  page: number
  limit: number
}

/** Tối đa 200 người dùng (giới hạn `limit` của API) — đủ cho select trưởng khoa. */
export function listActiveUsers() {
  return unwrapAs<UsersPage>(
    api.GET('/v1/users', { params: { query: pageQuery({ page: 1, limit: 200, isActive: true }) } }),
  )
}
