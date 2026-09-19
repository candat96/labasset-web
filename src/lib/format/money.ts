/**
 * Định dạng tiền VND từ chuỗi số thập phân của API.
 * Không chuyển sang Number để tránh mất độ chính xác.
 */
export function formatVnd(
  amount: string | null | undefined,
  opts: { symbol?: boolean } = {},
): string {
  if (amount == null || amount === '') return ''
  const m = /^(-)?(\d+)(?:\.(\d+))?$/.exec(String(amount).trim())
  if (!m) return String(amount)
  const sign = m[1] ?? ''
  const int = m[2] ?? '0'
  const dec = m[3]
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  const body = dec ? `${grouped},${dec}` : grouped
  return `${sign}${body}${opts.symbol === false ? '' : ' ₫'}`
}
