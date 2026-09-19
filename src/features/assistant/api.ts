import { api, unwrapAs } from '@/api/client'

// TODO(api): D2 AI chưa có trong OpenAPI.

export interface AiStatus {
  enabled: boolean
  model?: string
  budget?: { remaining?: number; used?: number }
  rateLimit?: { remaining?: number }
}

export async function getStatus(): Promise<AiStatus> {
  try {
    const get = api.GET as (path: string, init?: object) => ReturnType<typeof api.GET>
    return await unwrapAs<AiStatus>(get('/v1/ai/status'))
  } catch {
    return { enabled: false }
  }
}

export interface AiDigest {
  content: string | null
  stats: Record<string, string | number>
}

export async function getWeeklyDigest(weekStart: string): Promise<AiDigest> {
  const get = api.GET as (path: string, init?: object) => ReturnType<typeof api.GET>
  return unwrapAs<AiDigest>(get('/v1/ai/digest/weekly', { params: { query: { weekStart } } }))
}

export async function reindexDocuments() {
  const post = api.POST as (path: string, init?: object) => ReturnType<typeof api.POST>
  return unwrapAs<{ queued?: boolean }>(post('/v1/ai/admin/reindex', { body: {} }))
}
