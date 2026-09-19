import { Navigate, Outlet, useLocation } from 'react-router'
import { useSysAuthStore } from '@/stores/sys-auth.store'

export function RequireSysAuth() {
  const token = useSysAuthStore((s) => s.accessToken)
  const loc = useLocation()
  if (!token) {
    const returnTo = encodeURIComponent(loc.pathname + loc.search)
    return <Navigate to={`/sys/login?returnTo=${returnTo}`} replace />
  }
  return <Outlet />
}
