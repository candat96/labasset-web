/** Rút gọn UUID khi chưa resolve được tên (API `/v1/users` chỉ ADM đọc được). */
export function shortId(id: string | null | undefined) {
  if (!id) return undefined
  return id.length > 8 ? `${id.slice(0, 8)}…` : id
}
