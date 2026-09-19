import { api, unwrapAs } from '@/api/client'
import type { SysLoginResult } from '@/stores/sys-auth.store'

export function sysLogin(body: { username: string; password: string }) {
  return unwrapAs<SysLoginResult>(api.POST('/sys/auth/login', { body }))
}
