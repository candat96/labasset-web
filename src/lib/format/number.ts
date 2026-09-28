export function formatNumber(n: number | string | null | undefined, digits = 0): string {
  if (n == null || n === '') return ''
  const value = typeof n === 'string' ? Number(n) : n
  if (Number.isNaN(value)) return String(n)
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(value)
}

/** Chuỗi số lượng: giữ chính xác cả phần nguyên lớn, không qua Number. */
export function formatQty(value: string | null | undefined): string {
  if (!value) return ''
  if (!/^-?\d+(?:\.\d{1,4})?$/.test(value)) return value
  const [integer = '0', fraction = ''] = value.split('.')
  const tail = fraction.replace(/0+$/, '')
  return new Intl.NumberFormat('vi-VN').format(BigInt(integer)) + (tail ? `,${tail}` : '')
}

/**
 * Cắt đuôi số 0 của chuỗi numeric từ API: `"100.0000"` → `"100"`,
 * `"80.50"` → `"80.5"`. Giữ nguyên dấu chấm thập phân nên dùng được cho **ô
 * nhập**; chỗ chỉ hiển thị thì dùng `formatQty` để có dấu phân cách nghìn.
 *
 * Postgres trả `numeric(p,s)` kèm đủ chữ số thập phân đã khai, nên hệ số quy đổi
 * 100 về tới giao diện là `"100.0000"` — in thẳng ra là người dùng thấy số lạ.
 */
export function trimDecimal(value: string | number | null | undefined): string {
  if (value == null || value === '') return ''
  const text = String(value)
  if (!/^-?\d+(?:\.\d+)?$/.test(text)) return text
  return text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text
}
