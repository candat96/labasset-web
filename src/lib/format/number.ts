export function formatNumber(n: number | string | null | undefined, digits = 0): string {
  if (n == null || n === '') return ''
  const value = typeof n === 'string' ? Number(n) : n
  if (Number.isNaN(value)) return String(n)
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(value)
}

/** Chuỗi số lượng: giữ chính xác cả phần nguyên lớn, không qua Number. */
export function formatQty(value: string | null | undefined): string {
  if (!value) return ''
  if (!/^-?\d+(?:\.\d{1,3})?$/.test(value)) return value
  const [integer = '0', fraction = ''] = value.split('.')
  const tail = fraction.replace(/0+$/, '')
  return new Intl.NumberFormat('vi-VN').format(BigInt(integer)) + (tail ? `,${tail}` : '')
}
