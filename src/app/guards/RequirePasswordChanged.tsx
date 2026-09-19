import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuthStore } from '@/stores/auth.store'

/** API không chặn khi `mustChangePassword`; web ép người dùng đổi mật khẩu trước. */
export function RequirePasswordChanged() {
  const must = useAuthStore((s) => s.user?.mustChangePassword)
  const loc = useLocation()
  if (must && loc.pathname !== '/change-password') return <Navigate to="/change-password" replace />
  return <Outlet />
}
