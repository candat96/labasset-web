/**
 * Sinh mã phòng phía web khi người dùng để trống — API (`BaseCatalogCreateDto`) vẫn bắt
 * buộc `code`, chưa tự sinh (gap, xem WEB-NOTES 14). Dạng `<MÃ KHOA|CHUNG>-<TÊN không dấu>`,
 * ≤ 32 ký tự, A–Z 0–9 _ -.
 */
export function suggestRoomCode(departmentCode: string | null | undefined, name: string): string {
  const prefix = (departmentCode || 'CHUNG').toUpperCase().replace(/[^A-Z0-9_-]/g, '')
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const body = slug || 'P'
  return `${prefix}-${body}`.slice(0, 32).replace(/-+$/, '')
}

/** Thêm hậu tố ngắn khi mã đã tồn tại. */
export function withCodeSuffix(code: string): string {
  const suffix = `-${Math.random().toString(36).slice(2, 5).toUpperCase()}`
  return `${code.slice(0, 32 - suffix.length)}${suffix}`
}
