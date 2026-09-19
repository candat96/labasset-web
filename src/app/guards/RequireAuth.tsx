import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuthStore } from '@/stores/auth.store'

export function RequireAuth() {
  const token = useAuthStore((s) => s.accessToken)
  const loc = useLocation()
  if (!token) {
    const returnTo = encodeURIComponent(loc.pathname + loc.search)
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />
  }
  return <Outlet />
}
