import { api, unwrap, unwrapAs } from '@/api/client'
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

import type { User, UserPage, UserParams, CreateUser, UpdateUser } from './types'
export const listUsers = (params: UserParams) =>
  unwrapAs<UserPage>(api.GET('/v1/users', { params: { query: pageQuery(params) } }))
export const getUser = (id: string) =>
  unwrapAs<User>(api.GET('/v1/users/{id}', { params: { path: { id } } }))
export const createUser = (body: CreateUser) =>
  unwrapAs<{ user: User; tempPassword: string }>(api.POST('/v1/users', { body }))
export const updateUser = (id: string, body: UpdateUser) =>
  unwrapAs<User>(api.PATCH('/v1/users/{id}', { params: { path: { id } }, body }))
export const deleteUser = (id: string) =>
  unwrap(api.DELETE('/v1/users/{id}', { params: { path: { id } } }))
export const userAction = (id: string, action: 'activate' | 'deactivate' | 'reset-password') =>
  unwrapAs<{ tempPassword?: string } | undefined>(
    api.POST(`/v1/users/{id}/${action}`, { params: { path: { id } } }),
  )
