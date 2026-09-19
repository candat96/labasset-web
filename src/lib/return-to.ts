/** Chỉ nhận path nội bộ, chặn open redirect. */
export function safeReturnTo(raw: string | null | undefined, fallback = '/') {
  if (!raw) return fallback
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : fallback
}
