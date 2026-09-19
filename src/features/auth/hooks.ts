import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import * as authApi from './api'
import { isOtpChallenge } from './api'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'
import { resolveTenantMode } from '@/api/tenant-mode'
import { messageFor } from '@/api/errors'
import { safeReturnTo } from '@/lib/return-to'

export const authKeys = {
  me: ['auth', 'me'] as const,
  sessions: ['auth', 'sessions'] as const,
  tenantMode: ['tenant-mode'] as const,
}

export function useTenantMode() {
  return useQuery({
    queryKey: authKeys.tenantMode,
    queryFn: resolveTenantMode,
    staleTime: Infinity,
  })
}

/** Đường về sau đăng nhập, chỉ chấp nhận path nội bộ. */
export function useReturnTo() {
  const [sp] = useSearchParams()
  return safeReturnTo(sp.get('returnTo'))
}

export function useLogin() {
  const navigate = useNavigate()
  const returnTo = useReturnTo()
  const setSession = useAuthStore((s) => s.setSession)
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (r) => {
      if (isOtpChallenge(r)) {
        navigate('/login/otp', { state: { otpToken: r.otpToken, returnTo } })
        return
      }
      setSession(r)
      navigate(returnTo, { replace: true })
    },
  })
}

export function useVerifyOtp(returnTo: string) {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  return useMutation({
    mutationFn: ({ otpToken, code }: { otpToken: string; code: string }) =>
      authApi.verifyOtp(otpToken, code),
    onSuccess: (r) => {
      setSession(r)
      navigate(returnTo, { replace: true })
    },
  })
}

export function useForgotPassword() {
  return useMutation({ mutationFn: authApi.forgotPassword })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, next }: { token: string; next: string }) =>
      authApi.resetPassword(token, next),
  })
}

export function useChangePassword() {
  const { t } = useTranslation('auth')
  const logout = useAuthStore((s) => s.logout)
  return useMutation({
    mutationFn: ({ current, next }: { current: string; next: string }) =>
      authApi.changePassword(current, next),
    onSuccess: () => {
      toast.success(t('change.success'))
      // API thu hồi toàn bộ phiên sau khi đổi mật khẩu → đăng nhập lại.
      logout('password-changed')
    },
  })
}

/** Khi có token: làm mới thông tin người dùng (vai trò có thể đã đổi). */
export function useBootstrapSession() {
  const token = useAuthStore((s) => s.accessToken)
  const setUser = useAuthStore((s) => s.setUser)
  const q = useQuery({ queryKey: authKeys.me, queryFn: authApi.me, enabled: !!token })
  useEffect(() => {
    if (q.data) setUser(q.data)
  }, [q.data, setUser])
  return q
}

export function useSessions() {
  return useQuery({ queryKey: authKeys.sessions, queryFn: authApi.listSessions })
}

export function useRevokeSession() {
  const qc = useQueryClient()
  const { t } = useTranslation('auth')
  return useMutation({
    mutationFn: authApi.revokeSession,
    onSuccess: () => {
      toast.success(t('sessions.revoked'))
      void qc.invalidateQueries({ queryKey: authKeys.sessions })
    },
    onError: (e) => toast.error(messageFor(e)),
  })
}

export function useLogoutAll() {
  const logout = useAuthStore((s) => s.logout)
  return useMutation({
    mutationFn: () => authApi.logoutRemote(true, useAuthStore.getState().refreshToken),
    onSettled: () => logout('manual'),
  })
}

/** Đăng xuất phiên hiện tại: báo API (best-effort) rồi xoá local. */
export function useLogout() {
  const logout = useAuthStore((s) => s.logout)
  return useMutation({
    mutationFn: () => authApi.logoutRemote(false, useAuthStore.getState().refreshToken),
    onSettled: () => logout('manual'),
  })
}

/** Tên bệnh viện cho sidebar (best-effort; lỗi thì bỏ qua). */
export function usePublicSettings() {
  const token = useAuthStore((s) => s.accessToken)
  const setHospitalName = useUiStore((s) => s.setHospitalName)
  const q = useQuery({
    queryKey: ['settings', 'public'],
    queryFn: authApi.publicSettings,
    enabled: !!token,
    staleTime: 10 * 60_000,
    retry: false,
  })
  useEffect(() => {
    if (!q.data) return
    const name = q.data.hospitalName ?? q.data.name
    setHospitalName(typeof name === 'string' && name ? name : null)
  }, [q.data, setHospitalName])
}
