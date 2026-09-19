export function formatNumber(n: number | string | null | undefined, digits = 0): string {
  if (n == null || n === '') return ''
  const value = typeof n === 'string' ? Number(n) : n
  if (Number.isNaN(value)) return String(n)
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: digits }).format(value)
}
