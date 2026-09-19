import { baseUrl } from './client'
import { useUiStore, type TenantMode } from '@/stores/ui.store'

/**
 * Chế độ tenant: `VITE_TENANT_MODE` nếu đặt, ngược lại đọc `GET /health` → `mode`.
 * Lỗi mạng → mặc định `multi` (màn đăng nhập vẫn hỏi mã bệnh viện).
 */
export async function resolveTenantMode(): Promise<TenantMode> {
  const cached = useUiStore.getState().tenantMode
  if (cached) return cached
  const env = import.meta.env.VITE_TENANT_MODE as string | undefined
  let mode: TenantMode = 'multi'
  if (env === 'multi' || env === 'single') mode = env
  else {
    try {
      const r = await fetch(`${baseUrl}/health`)
      const j = (await r.json()) as { mode?: string }
      if (j.mode === 'single') mode = 'single'
    } catch {
      /* giữ multi */
    }
  }
  useUiStore.getState().setTenantMode(mode)
  return mode
}
