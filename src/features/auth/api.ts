import { api, unwrap } from '@/api/client'
import type { components } from '@/api/schema'
import type { LoginResult } from '@/stores/auth.store'

export type LoginDto = components['schemas']['LoginDto']
export type OtpChallenge = components['schemas']['OtpChallengeDto']
export type SessionView = components['schemas']['SessionViewDto']

export const isOtpChallenge = (r: LoginResult | OtpChallenge): r is OtpChallenge =>
  'otpRequired' in r && r.otpRequired === true

export function login(body: LoginDto) {
  return unwrap(api.POST('/v1/auth/login', { body })) as Promise<LoginResult | OtpChallenge>
}

export function verifyOtp(otpToken: string, code: string) {
  return unwrap(api.POST('/v1/auth/otp/verify', { body: { otpToken, code } }))
}

export function forgotPassword(body: components['schemas']['ForgotPasswordDto']) {
  return unwrap(api.POST('/v1/auth/forgot-password', { body }))
}

export function resetPassword(token: string, next: string) {
  return unwrap(api.POST('/v1/auth/reset-password', { body: { token, next } }))
}

export function changePassword(current: string, next: string) {
  return unwrap(api.POST('/v1/auth/change-password', { body: { current, next } }))
}

export function me() {
  return unwrap(api.GET('/v1/auth/me'))
}

export function listSessions() {
  return unwrap(api.GET('/v1/auth/sessions'))
}

export function revokeSession(id: string) {
  return unwrap(api.DELETE('/v1/auth/sessions/{id}', { params: { path: { id } } }))
}

/** Thu hồi refresh token hiện tại (all=false) hoặc mọi phiên (all=true). */
export function logoutRemote(all: boolean, refreshToken?: string | null) {
  return unwrap(
    api.POST('/v1/auth/logout', {
      params: { query: { all: String(all) } },
      body: refreshToken ? { refreshToken } : {},
    }),
  )
}
