import { authHeaders, baseUrl, untypedApi, unwrapAs } from '@/api/client'
import { isApiError } from '@/api/errors'
import { parseSse, type SseEvent } from '@/features/notifications/stream'

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
  } catch (error) {
    if (isApiError(error) && (error.status === 404 || error.code === 'AI_DISABLED')) {
      return { enabled: false }
    }
    throw error
  }
}

export interface AiConversation {
  id: string
  title: string
  equipmentId?: string | null
  updatedAt: string
}

export interface AiToolResult {
  name: string
  status: 'running' | 'done' | 'failed'
  summary?: string
  rows?: Record<string, unknown>[]
  link?: string
}

export interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  tools?: AiToolResult[]
  sources?: { title: string; link?: string }[]
  streaming?: boolean
}

export async function listConversations() {
  return unwrapAs<AiConversation[]>(untypedApi.GET('/v1/ai/conversations'))
}

export async function createConversation(body: { title?: string; equipmentId?: string }) {
  return unwrapAs<AiConversation>(untypedApi.POST('/v1/ai/conversations', { body }))
}

export async function deleteConversation(id: string) {
  return unwrapAs<void>(untypedApi.DELETE(`/v1/ai/conversations/${encodeURIComponent(id)}`))
}

export async function listMessages(id: string) {
  return unwrapAs<AiMessage[]>(
    untypedApi.GET(`/v1/ai/conversations/${encodeURIComponent(id)}/messages`),
  )
}

export async function sendFeedback(id: string, feedback: 'up' | 'down', note?: string) {
  return unwrapAs<void>(
    untypedApi.POST(`/v1/ai/messages/${encodeURIComponent(id)}/feedback`, {
      body: { feedback, note },
    }),
  )
}

export interface AiStreamPayload {
  content: string
  attachmentFileIds?: string[]
}

export async function streamMessage(
  conversationId: string,
  body: AiStreamPayload,
  onEvent: (event: SseEvent) => void,
  signal: AbortSignal,
) {
  const response = await fetch(
    `${baseUrl}/v1/ai/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(),
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    },
  )
  if (!response.ok || !response.body) throw new Error(`AI stream ${response.status}`)
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    const parsed = parseSse(decoder.decode(value, { stream: true }), buffer)
    buffer = parsed.rest
    parsed.events.forEach(onEvent)
  }
  if (buffer.trim()) {
    const parsed = parseSse(`${buffer}\n\n`, '')
    parsed.events.forEach(onEvent)
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
