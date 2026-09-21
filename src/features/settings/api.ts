import { api, unwrap, unwrapAs, untypedApi } from '@/api/client'
import { pageQuery } from '@/api/paths'
import type { Settings } from './types'

export type { Settings }

export const getSettings = () => unwrapAs<Settings>(api.GET('/v1/settings'))
export const saveSettings = (body: Settings) => unwrap(api.PUT('/v1/settings', { body }))

// POST /v1/ai/settings/test nhận bản nháp trên form; apiKey trống = dùng key đã lưu.
export interface AiSettingsTestRequest {
  protocol?: 'openai_compatible' | 'anthropic'
  baseUrl?: string
  model?: string
  apiKey?: string
  headers?: Record<string, string>
}

export interface AiSettingsTestResult {
  ok: boolean
  latencyMs?: number
  model?: string
  error?: string
}

export const testAiSettings = (body?: AiSettingsTestRequest) =>
  unwrapAs<AiSettingsTestResult>(untypedApi.POST('/v1/ai/settings/test', { body: body ?? {} }))

/** `GET /v1/ai/status` cho thẻ trạng thái tab AI (mọi role; tab chỉ ADM thấy). */
export interface AiStatusView {
  enabled: boolean
  model?: string
  budget?: { monthlyTokenBudget?: number; used?: number; remaining?: number | null }
  rateLimit?: { perHour?: number }
  chat?: { protocol: string; baseUrlHost: string; model: string }
  embedding?: { protocol: string; model: string; enabled: boolean }
}
export const getAiStatus = () => unwrapAs<AiStatusView>(api.GET('/v1/ai/status'))

/** `POST /v1/ai/admin/reindex` (ADM) → `{ queued }` = số tài liệu đã xếp hàng lập chỉ mục. */
export const reindexAiDocuments = () =>
  unwrapAs<{ queued: number }>(api.POST('/v1/ai/admin/reindex', { body: {} }))

// TODO(api): preview does not accept an unsaved template; it previews the persisted setting only.
export type NumberPreview = { template: string; example: string; nextValue: number }
export const previewNumber = (type: string) =>
  unwrapAs<NumberPreview | string>(
    api.GET('/v1/numbering/preview', { params: { query: { type } } }),
  )

export async function searchWarehouses(q: string) {
  const result = await unwrapAs<
    | { id: string; code: string; name: string }[]
    | { items: { id: string; code: string; name: string }[] }
  >(
    api.GET('/v1/catalogs/warehouses', {
      params: { query: pageQuery({ q, all: true, page: 1, limit: 50 }) },
    }),
  )
  return Array.isArray(result) ? result : result.items
}

export async function resolveWarehouse(id: string) {
  try {
    return await unwrapAs<{ id: string; code: string; name: string }>(
      api.GET('/v1/catalogs/warehouses/{id}', { params: { path: { id } } }),
    )
  } catch {
    const list = await searchWarehouses('')
    return list.find((row) => row.id === id) ?? null
  }
}
