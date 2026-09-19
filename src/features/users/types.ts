import type { UserView } from '@/stores/auth.store'
import type { components } from '@/api/schema'
// TODO(api): UserView của API thiếu isActive/lastLoginAt; không suy diễn trạng thái từ dữ liệu thiếu.
export type User = UserView & { isActive?: boolean; lastLoginAt?: string | null }
export interface UserPage {
  items: User[]
  total: number
  page: number
  limit: number
}
export type CreateUser = components['schemas']['CreateUserDto']
export type UpdateUser = components['schemas']['UpdateUserDto']
export interface UserParams {
  page?: number
  limit?: number
  q?: string
  role?: CreateUser['roles'][number]
  departmentId?: string
  isActive?: boolean
}
