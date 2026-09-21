import type { AiMessage, AiToolResult } from './api'
import type { SseEvent } from '@/features/notifications/stream'

export type ChatAction =
  | { type: 'replace'; messages: AiMessage[] }
  | { type: 'user'; message: AiMessage }
  | { type: 'start'; id: string }
  | { type: 'event'; event: SseEvent }
  | { type: 'stop' }
  /** Bỏ tin assistant lỗi + tin người dùng ngay trước để gửi lại. */
  | { type: 'retry'; id: string }

function json<T>(text: string): T {
  return JSON.parse(text) as T
}

export function chatReducer(state: AiMessage[], action: ChatAction): AiMessage[] {
  if (action.type === 'replace') return action.messages
  if (action.type === 'user') return [...state, action.message]
  if (action.type === 'start')
    return [...state, { id: action.id, role: 'assistant', content: '', streaming: true }]
  if (action.type === 'stop')
    return state.map((message) => (message.streaming ? { ...message, streaming: false } : message))
  if (action.type === 'retry') {
    const at = state.findIndex((message) => message.id === action.id)
    if (at < 0) return state
    const from = at > 0 && state[at - 1]!.role === 'user' ? at - 1 : at
    return state.slice(0, from)
  }
  const at = state.findIndex((message) => message.streaming)
  if (at < 0) return state
  const current = state[at]!
  let next = current
  if (action.event.event === 'text') {
    const data = json<{ delta?: string }>(action.event.data)
    next = { ...current, content: current.content + (data.delta ?? '') }
  } else if (action.event.event === 'tool') {
    const raw = json<Omit<AiToolResult, 'status'> & { status?: string }>(action.event.data)
    // Backend phát `status: 'start'` khi bắt đầu gọi tool; `summary` bắt đầu bằng "lỗi:" là thất bại.
    const status: AiToolResult['status'] =
      raw.status === 'start' || raw.status === 'running'
        ? 'running'
        : raw.status === 'failed' || /^lỗi/i.test(raw.summary ?? '')
          ? 'failed'
          : 'done'
    const tool: AiToolResult = { ...raw, status }
    const tools = [...(current.tools ?? [])]
    // Cùng tên có thể được gọi nhiều lần liên tiếp (vd get_equipment ×3):
    // `start` luôn thêm chip mới, `done` cập nhật chip đang chạy cuối cùng cùng tên.
    let toolAt = -1
    if (status !== 'running')
      for (let index = tools.length - 1; index >= 0; index -= 1) {
        const row = tools[index]!
        if (row.name === tool.name && row.status === 'running') {
          toolAt = index
          break
        }
      }
    if (toolAt >= 0) tools[toolAt] = { ...tools[toolAt], ...tool }
    else tools.push(tool)
    next = { ...current, tools }
  } else if (action.event.event === 'done') {
    const data = json<{ messageId?: string; sources?: AiMessage['sources'] }>(action.event.data)
    next = { ...current, id: data.messageId ?? current.id, sources: data.sources, streaming: false }
  } else if (action.event.event === 'error') {
    const data = json<{ code?: string; message?: string }>(action.event.data)
    next = {
      ...current,
      error: { code: data.code ?? 'AI_PROVIDER_ERROR', message: data.message },
      streaming: false,
    }
  }
  return state.map((message, index) => (index === at ? next : message))
}
