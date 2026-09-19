import { api, unwrap } from './client'

/** Gợi ý lỗi dùng chung (B3 báo hỏng/chẩn đoán). Không import từ feature faults. */
export function suggestFaults(query: { equipmentId: string; errorCode?: string; q?: string }) {
  return unwrap(api.GET('/v1/faults/suggest', { params: { query } }))
}
