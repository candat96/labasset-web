export type PageQuery = { page?: number; limit?: number }

/** Giữ tên cũ để call site khỏi đổi; API đã khai `page`/`limit` là number nên helper
 *  chỉ chuyển tiếp tham số. */
export function pageQuery<T extends PageQuery>(params: T) {
  return params
}

/**
 * Query param mà OpenAPI khai hẹp hơn thực tế (ví dụ `status` web gửi dạng "a,b").
 * Gom một chỗ để call site không phải rải `as never`; gỡ dần khi backend sửa swagger.
 */
export function apiQuery<T>(params: unknown): NonNullable<T> {
  return params as NonNullable<T>
}
