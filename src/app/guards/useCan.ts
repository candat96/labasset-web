import { hasRole, useAuthStore } from '@/stores/auth.store'
import type { Role } from '@/routes/roles'

/** true nếu người dùng hiện tại có một trong các vai trò; không truyền roles = chỉ cần đăng nhập. */
export function useCan(roles?: readonly Role[]): boolean {
  const user = useAuthStore((s) => s.user)
  if (!roles || roles.length === 0) return !!user
  return hasRole(user, roles)
}
