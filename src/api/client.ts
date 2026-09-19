import createClient, { type Middleware } from 'openapi-fetch'
import type { paths } from './schema'
import { useAuthStore } from '@/stores/auth.store'
import { toApiError } from './errors'

/** Các path không gắn Authorization và không kích hoạt refresh khi 401. */
export const PUBLIC_PATHS = [
  '/health',
  '/v1/auth/login',
  '/v1/auth/refresh',
  '/v1/auth/otp/verify',
  '/v1/auth/forgot-password',
  '/v1/auth/reset-password',
]

export const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))

export const baseUrl: string =
  import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : '')

export function authHeaders(): Record<string, string> {
  const { accessToken, tenantId } = useAuthStore.getState()
  const h: Record<string, string> = {}
  if (accessToken) h.Authorization = `Bearer ${accessToken}`
  if (tenantId) h['X-Tenant-Id'] = tenantId
  return h
}

let refreshing: Promise<boolean> | null = null

/**
 * Refresh token xoay vòng, single-flight: nhiều request 401 cùng lúc chỉ gọi refresh một lần.
 * Thất bại (token gia đình bị thu hồi, lỗi mạng) → logout('expired').
 */
export function refreshTokens(): Promise<boolean> {
  if (refreshing) return refreshing
  refreshing = (async () => {
    const { refreshToken, setTokens, logout } = useAuthStore.getState()
    if (!refreshToken) {
      logout('expired')
      return false
    }
    try {
      const res = await fetch(`${baseUrl}/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) {
        logout('expired')
        return false
      }
      const data = (await res.json()) as { accessToken: string; refreshToken: string }
      setTokens(data.accessToken, data.refreshToken)
      return true
    } catch {
      logout('expired')
      return false
    } finally {
      refreshing = null
    }
  })()
  return refreshing
}

// Bản sao request (body chưa đọc) để gửi lại sau khi refresh.
const clones = new WeakMap<Request, Request>()

const authMiddleware: Middleware = {
  onRequest({ request }) {
    if (isPublicPath(new URL(request.url).pathname)) return request
    for (const [k, v] of Object.entries(authHeaders())) request.headers.set(k, v)
    clones.set(request, request.clone())
    return request
  },
  async onResponse({ request, response }) {
    if (response.status !== 401) return response
    const clone = clones.get(request)
    if (!clone || isPublicPath(new URL(request.url).pathname)) return response
    clones.delete(request)
    const ok = await refreshTokens()
    if (!ok) return response
    const retry = new Request(clone)
    for (const [k, v] of Object.entries(authHeaders())) retry.headers.set(k, v)
    return fetch(retry)
  },
}

// `fetch` gọi lazy để môi trường test (msw) hoặc polyfill có thể thay thế global sau khi module nạp.
export const api = createClient<paths>({ baseUrl, fetch: (req) => globalThis.fetch(req) })
api.use(authMiddleware)

type FetchResult<T> = { data?: T; error?: unknown; response: Response }

/** Trả `data` hoặc ném `ApiError`. Lỗi tenant → logout. */
export async function unwrap<T>(p: Promise<FetchResult<T>>): Promise<T> {
  const { data, error, response } = await p
  if (error !== undefined || !response.ok) {
    const err = toApiError(response, error)
    if (err.code === 'TENANT_SUSPENDED' || err.code === 'TENANT_MISMATCH') {
      useAuthStore.getState().logout('tenant')
    }
    throw err
  }
  return data as T
}

/**
 * Dùng cho endpoint OpenAPI CHƯA khai response schema (data sinh ra là `undefined`).
 * Caller tự khai type trong `types.ts` của feature kèm `// TODO(api)`.
 */
export async function unwrapAs<T>(p: Promise<FetchResult<unknown>>): Promise<T> {
  return (await unwrap(p)) as T
}
