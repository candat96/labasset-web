import { authHeaders, baseUrl, untypedApi, unwrapAs } from '@/api/client'
import { isApiError } from '@/api/errors'
import { parseSse, type SseEvent } from '@/features/notifications/stream'

/** `GET /v1/ai/status` (AiStatusDto) — `budget.remaining = null` khi không giới hạn. */
export interface AiStatus {
  enabled: boolean
  model?: string
  budget?: { monthlyTokenBudget?: number; remaining?: number | null; used?: number }
  rateLimit?: { perHour?: number }
  chat?: { protocol: string; baseUrlHost: string; model: string }
  embedding?: { protocol: string; model: string; enabled: boolean }
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

interface AiConversationPage {
  items: AiConversation[]
  total: number
  page: number
  limit: number
}

/** Tin nhắn thô từ API: `role: 'tool'` là kết quả tool, UI gắn vào tin assistant kế tiếp. */
interface AiMessageDto {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolCalls?: { name?: string }[] | null
  toolResults?: { rows?: unknown[]; link?: string; note?: string; error?: string } | null
}

interface AiConversationDetail extends AiConversation {
  messages: AiMessageDto[]
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
  /** Sự kiện SSE `error` — hiện trong bong bóng kèm nút Thử lại. */
  error?: { code: string; message?: string }
  /** Ảnh đính kèm (file id) của tin người dùng. */
  attachmentFileIds?: string[]
}

/** `GET /v1/ai/conversations` trả `{ items, total, page, limit }` (PageQueryDto). */
export async function listConversations(limit = 50): Promise<AiConversation[]> {
  const data = await unwrapAs<AiConversationPage | AiConversation[]>(
    untypedApi.GET('/v1/ai/conversations', { params: { query: { limit } } }),
  )
  return Array.isArray(data) ? data : (data.items ?? [])
}

export async function createConversation(body: { title?: string; equipmentId?: string }) {
  return unwrapAs<AiConversation>(untypedApi.POST('/v1/ai/conversations', { body }))
}

export async function deleteConversation(id: string) {
  return unwrapAs<void>(untypedApi.DELETE(`/v1/ai/conversations/${encodeURIComponent(id)}`))
}

function toToolResult(row: AiMessageDto): AiToolResult {
  const result = row.toolResults ?? {}
  const rows = Array.isArray(result.rows) ? (result.rows as Record<string, unknown>[]) : undefined
  const failed = typeof result.error === 'string' && result.error.length > 0
  return {
    name: row.toolCalls?.[0]?.name ?? 'tool',
    status: failed ? 'failed' : 'done',
    rows,
    link: result.link,
    summary: failed ? result.error : (result.note ?? (rows ? `${rows.length} dòng` : undefined)),
  }
}

/** Lịch sử nằm trong `GET /v1/ai/conversations/{id}` (không có endpoint `/messages`). */
export async function listMessages(id: string): Promise<AiMessage[]> {
  const detail = await unwrapAs<AiConversationDetail>(
    untypedApi.GET(`/v1/ai/conversations/${encodeURIComponent(id)}`),
  )
  const messages: AiMessage[] = []
  let tools: AiToolResult[] = []
  for (const row of detail.messages ?? []) {
    if (row.role === 'tool') {
      tools.push(toToolResult(row))
      continue
    }
    if (row.role === 'assistant' && tools.length) {
      messages.push({ id: row.id, role: 'assistant', content: row.content, tools })
      tools = []
      continue
    }
    messages.push({ id: row.id, role: row.role, content: row.content })
  }
  return messages
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

/** `POST /v1/ai/admin/reindex` → `{ queued: số tài liệu đã xếp hàng }`. */
export async function reindexDocuments() {
  return unwrapAs<{ queued: number }>(untypedApi.POST('/v1/ai/admin/reindex', { body: {} }))
}
