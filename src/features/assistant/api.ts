import { untypedApi, unwrapAs } from '@/api/client'

// TODO(api): D2 AI chưa có trong OpenAPI.

export interface AiStatus {
  enabled: boolean
  model?: string
  budget?: { remaining?: number; used?: number }
  rateLimit?: { remaining?: number }
}

export async function getStatus(): Promise<AiStatus> {
  try {
    return await unwrapAs<AiStatus>(untypedApi.GET('/v1/ai/status'))
  } catch {
    return { enabled: false }
  }
}

export interface AiDigest {
  content: string | null
  stats: Record<string, string | number>
}

export async function getWeeklyDigest(weekStart: string): Promise<AiDigest> {
  return unwrapAs<AiDigest>(
    untypedApi.GET('/v1/ai/digest/weekly', { params: { query: { weekStart } } }),
  )
}

export async function reindexDocuments() {
  return unwrapAs<{ queued?: boolean }>(untypedApi.POST('/v1/ai/admin/reindex', { body: {} }))
}
