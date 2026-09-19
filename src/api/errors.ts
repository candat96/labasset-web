import i18n from '@/lib/i18n'
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form'

/** Lỗi chuẩn của API: `{ code, message, details? }` (xem kiến trúc mục 5.4). */
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError

export function toApiError(res: Response, body: unknown): ApiError {
  if (body && typeof body === 'object' && 'code' in body) {
    const b = body as { code: string; message?: string; details?: unknown }
    return new ApiError(res.status, b.code, b.message ?? b.code, b.details)
  }
  const text = typeof body === 'string' && body ? body : res.statusText || `HTTP ${res.status}`
  return new ApiError(res.status, `HTTP_${res.status}`, text)
}

/** Thông điệp hiển thị cho người dùng, ưu tiên i18n theo `code`. */
export function messageFor(e: unknown): string {
  if (isApiError(e)) {
    if (i18n.exists(`errors:${e.code}`)) return i18n.t(`errors:${e.code}`)
    return e.message || i18n.t('errors:UNKNOWN')
  }
  if (e instanceof TypeError) return i18n.t('errors:NETWORK_ERROR')
  return e instanceof Error && e.message ? e.message : i18n.t('errors:UNKNOWN')
}

type FormLike<T extends FieldValues> = Pick<UseFormReturn<T>, 'setError' | 'getValues'>

/**
 * Gắn lỗi VALIDATION_ERROR của API vào form.
 * `details` hiện là `string[]` kiểu class-validator ("code must match ...") → lấy từ đầu
 * tới khoảng trắng đầu tiên làm tên field. Cũng nhận `{field,message}[]` và `{field: msg}`.
 * Trả `true` nếu đã xử lý (không cần toast).
 */
export function applyServerErrors<T extends FieldValues>(form: FormLike<T>, e: unknown): boolean {
  if (!isApiError(e) || e.code !== 'VALIDATION_ERROR') return false
  const fields = new Set(Object.keys(form.getValues()))
  const put = (field: string, message: string) => {
    if (fields.has(field)) form.setError(field as Path<T>, { type: 'server', message })
    else form.setError('root.server', { type: 'server', message })
  }
  const d = e.details
  if (Array.isArray(d)) {
    for (const item of d) {
      if (typeof item === 'string') put(item.split(/\s+/)[0] ?? '', item)
      else if (item && typeof item === 'object' && 'field' in item) {
        const o = item as { field: string; message?: string }
        put(o.field, o.message ?? '')
      }
    }
  } else if (d && typeof d === 'object') {
    for (const [k, v] of Object.entries(d as Record<string, unknown>)) put(k, String(v))
  } else {
    form.setError('root.server', { type: 'server', message: messageFor(e) })
  }
  return true
}
