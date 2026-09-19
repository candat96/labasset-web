import { Navigate, Outlet, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { FlaskConical } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'

export function Component() {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.accessToken)
  const { pathname } = useLocation()
  // Đã đăng nhập thì không cần màn login/quên mật khẩu (trừ reset qua email).
  if (token && pathname !== '/reset-password') return <Navigate to="/" replace />
  return (
    <div className="bg-muted/40 flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-center gap-2">
          <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-md">
            <FlaskConical className="size-5" aria-hidden />
          </div>
          <div className="text-lg font-semibold">{t('app.name')}</div>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
