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
    <div className="bg-background flex min-h-svh">
      {/* Panel trái: wordmark + tagline trên nền primary đậm (≥ lg) */}
      <div className="bg-primary text-primary-foreground hidden lg:flex lg:w-[42%] xl:w-[46%] flex-col justify-between p-10">
        <div className="flex items-center gap-2.5">
          <div className="bg-white/15 flex size-9 items-center justify-center rounded-md">
            <FlaskConical className="size-5" aria-hidden />
          </div>
          <span className="text-base font-bold tracking-tight">{t('app.name')}</span>
        </div>
        <div className="space-y-3">
          <h1 className="text-[26px] leading-9 font-semibold tracking-[-0.01em]">
            {t('app.tagline')}
          </h1>
          <p className="text-primary-foreground/70 max-w-sm text-[13px]">
            LabAsset — phần mềm nội bộ quản lý máy xét nghiệm, vật tư và hoá chất cho phòng Vật tư –
            TBYT.
          </p>
        </div>
        <p className="text-primary-foreground/50 text-xs">
          © {new Date().getFullYear()} {t('app.name')}
        </p>
      </div>
      {/* Phải: form card bóng, căn giữa */}
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex items-center justify-center gap-2 lg:hidden">
            <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-md">
              <FlaskConical className="size-5" aria-hidden />
            </div>
            <div className="text-lg font-semibold">{t('app.name')}</div>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
