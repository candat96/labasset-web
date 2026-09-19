import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SysUser {
  id: string
  username: string
  fullName: string
}

// TODO(api): POST /sys/auth/login chưa có response schema.
export interface SysLoginResult {
  accessToken: string
  user: SysUser
}

interface SysAuthState {
  accessToken: string | null
  user: SysUser | null
  setSession: (result: SysLoginResult) => void
  logout: () => void
}

export const useSysAuthStore = create<SysAuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setSession: (result) => set({ accessToken: result.accessToken, user: result.user }),
      logout: () => set({ accessToken: null, user: null }),
    }),
    {
      name: 'sys.auth',
      partialize: (state) => ({ accessToken: state.accessToken, user: state.user }),
    },
  ),
)
