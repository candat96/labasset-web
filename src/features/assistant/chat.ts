import type { AiMessage, AiToolResult } from './api'
import type { SseEvent } from '@/features/notifications/stream'

export type ChatAction =
  | { type: 'replace'; messages: AiMessage[] }
  | { type: 'user'; message: AiMessage }
  | { type: 'start'; id: string }
  | { type: 'event'; event: SseEvent }
  | { type: 'stop' }

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
  const at = state.findIndex((message) => message.streaming)
  if (at < 0) return state
  const current = state[at]!
  let next = current
  if (action.event.event === 'text') {
    const data = json<{ delta?: string }>(action.event.data)
    next = { ...current, content: current.content + (data.delta ?? '') }
  } else if (action.event.event === 'tool') {
    const tool = json<AiToolResult>(action.event.data)
    const tools = [...(current.tools ?? [])]
    const toolAt = tools.findIndex((row) => row.name === tool.name)
    if (toolAt >= 0) tools[toolAt] = { ...tools[toolAt], ...tool }
    else tools.push(tool)
    next = { ...current, tools }
  } else if (action.event.event === 'done') {
    const data = json<{ messageId?: string; sources?: AiMessage['sources'] }>(action.event.data)
    next = { ...current, id: data.messageId ?? current.id, sources: data.sources, streaming: false }
  } else if (action.event.event === 'error') {
    const data = json<{ code?: string }>(action.event.data)
    next = {
      ...current,
      content: `${current.content}\n${data.code ?? 'AI_PROVIDER_ERROR'}`,
      streaming: false,
    }
  }
  return state.map((message, index) => (index === at ? next : message))
}
