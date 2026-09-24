import { Navigate, Outlet, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ShieldCheck, ScanLine, BellRing } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'

const POINTS = [
  { icon: ShieldCheck, text: 'Hồ sơ máy, bảo dưỡng, kiểm định — một nơi, đúng hạn.' },
  { icon: ScanLine, text: 'Quét QR nhập/xuất kho, kiểm kê offline trên điện thoại.' },
  { icon: BellRing, text: 'Cảnh báo hoá chất sắp hết, máy hỏng, phiếu chờ duyệt.' },
]

export function Component() {
  const { t } = useTranslation()
  const token = useAuthStore((s) => s.accessToken)
  const { pathname } = useLocation()
  // Đã đăng nhập thì không cần màn login/quên mật khẩu (trừ reset qua email).
  if (token && pathname !== '/reset-password') return <Navigate to="/" replace />
  return (
    <div className="bg-background flex min-h-svh">
      {/* Panel trái: gradient thương hiệu + logo + điểm nhấn (≥ lg) */}
      <div className="bg-brand-gradient relative hidden flex-col justify-between overflow-hidden p-10 text-white lg:flex lg:w-[44%] xl:w-[46%]">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 -right-24 size-96 rounded-full bg-white/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-40 -left-20 size-96 rounded-full bg-[#0b1530]/25 blur-3xl"
        />
        <div className="relative flex items-center gap-3">
          <img
            src="/brand/medone-logo.png?v=2"
            alt="MedOne"
            className="h-28 w-40 rounded-xl bg-white object-contain"
          />
        </div>
        <div className="relative space-y-6">
          <div className="space-y-2">
            <h1 className="text-[32px] leading-10 font-bold tracking-[-0.02em]">
              {t('app.tagline')}
            </h1>
            <p className="max-w-md text-[14px] leading-6 text-white/80">
              Phần mềm nội bộ cho phòng Vật tư – Thiết bị y tế: trang thiết bị toàn viện, vật tư,
              hoá chất và mọi việc đi kèm.
            </p>
          </div>
          <ul className="space-y-3">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[13.5px] text-white/90">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <Icon className="size-4" aria-hidden />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-white/60">
          © {new Date().getFullYear()} {t('app.name')}
        </p>
      </div>
      {/* Phải: form card, căn giữa */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-[400px] space-y-6">
          <div className="flex items-center justify-center gap-2.5 lg:hidden">
            <img
              src="/brand/medone-logo.png?v=2"
              alt="MedOne"
              className="h-28 w-40 rounded-xl bg-white object-contain"
            />
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
