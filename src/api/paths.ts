/**
 * OpenAPI của API hiện khai `page`/`limit` là `Object` (lỗi swagger phía backend —
 * xem README mục "API còn thiếu"). Helper này cast để openapi-fetch chấp nhận số.
 */
export type PageQuery = { page?: number; limit?: number }

export function pageQuery<T extends PageQuery>(params: T) {
  return params as unknown as Omit<T, 'page' | 'limit'> & {
    page?: Record<string, never>
    limit?: Record<string, never>
  }
}
