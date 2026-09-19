import type { ReactNode } from 'react'
import type { Role } from '@/routes/roles'
import { useCan } from './useCan'
import { ForbiddenPage } from '@/app/pages/ForbiddenPage'

/** Render 403 tại chỗ (giữ URL) khi thiếu vai trò. */
export function RequireRole({ roles, children }: { roles?: readonly Role[]; children: ReactNode }) {
  const ok = useCan(roles)
  return ok ? <>{children}</> : <ForbiddenPage />
}
