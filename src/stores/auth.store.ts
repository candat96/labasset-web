import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { components } from '@/api/schema'

export type UserView = components['schemas']['UserViewDto']
export type LoginResult = components['schemas']['LoginResultDto']
export type LogoutReason = 'expired' | 'manual' | 'password-changed' | 'tenant'

export interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  tenantId: string | null
  user: UserView | null
  lastLogoutReason: LogoutReason | null
  setSession: (r: LoginResult) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (u: UserView) => void
  logout: (reason?: LogoutReason) => void
}

/**
 * Token lưu localStorage để giữ đăng nhập qua reload (phần mềm nội bộ).
 * Rủi ro XSS được chấp nhận và ghi trong README.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      tenantId: null,
      user: null,
      lastLogoutReason: null,
      setSession: (r) =>
        set({
          accessToken: r.accessToken,
          refreshToken: r.refreshToken,
          tenantId: r.tenantId,
          user: r.user,
          lastLogoutReason: null,
        }),
      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),
      setUser: (user) => set({ user }),
      logout: (reason = 'manual') =>
        set({
          accessToken: null,
          refreshToken: null,
          tenantId: null,
          user: null,
          lastLogoutReason: reason,
        }),
    }),
    {
      name: 'labasset.auth',
      partialize: (s) => ({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        tenantId: s.tenantId,
        user: s.user,
      }),
    },
  ),
)

export const hasRole = (user: UserView | null, roles: readonly string[]) =>
  !!user && roles.some((r) => user.roles.includes(r))
