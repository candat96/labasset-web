import { differenceInCalendarDays, isValid, parseISO } from 'date-fns'

export interface ExpiryLevel {
  level: 'danger' | 'warning'
  days: number
}

/**
 * Mức cảnh báo hiệu lực dùng chung cho hồ sơ vật tư (màn chi tiết và danh sách):
 * đã qua ngày → `danger` (đỏ), còn ≤ 60 ngày → `warning` (vàng), còn lại `null`.
 *
 * Tách khỏi `SupplyDetailPage` để danh sách và chi tiết luôn cùng một quy ước.
 */
export function expiryLevel(value?: string | null): ExpiryLevel | null {
  if (!value) return null
  const date = parseISO(value)
  if (!isValid(date)) return null
  const days = differenceInCalendarDays(date, new Date())
  if (days < 0) return { level: 'danger', days }
  if (days <= 60) return { level: 'warning', days }
  return null
}
