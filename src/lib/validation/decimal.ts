import Big from 'big.js'
import { z } from 'zod'

/** Chuỗi số thập phân: money scale 0, qty scale 3. Không Number(). */
export function decimalString(opts: { maxScale: number; min?: string } = { maxScale: 0 }) {
  const scale = opts.maxScale
  const pattern = scale === 0 ? /^-?\d+$/ : new RegExp(`^-?\\d+(?:\\.\\d{1,${scale}})?$`)
  return z
    .string()
    .trim()
    .refine((value) => value === '' || pattern.test(value), 'Số không hợp lệ')
    .refine((value) => {
      if (value === '' || opts.min == null) return true
      try {
        return !new Big(value).lt(opts.min)
      } catch {
        return false
      }
    }, 'Nhỏ hơn giá trị tối thiểu')
}
