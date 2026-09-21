import { describe, expect, it } from 'vitest'
import { parseSse } from '@/features/notifications/stream'
import { chatReducer } from './chat'

describe('AI SSE', () => {
  it('parses event/data across chunks', () => {
    const first = parseSse('event: text\ndata: {"delta":"xin', '')
    expect(first.events).toEqual([])
    const second = parseSse(' chào"}\n\n', first.rest)
    expect(second.events).toEqual([{ event: 'text', data: '{"delta":"xin chào"}' }])
  })

  it('reduces text, tool and done events into one assistant message', () => {
    let state = chatReducer([], { type: 'start', id: 'pending' })
    state = chatReducer(state, {
      type: 'event',
      event: { event: 'text', data: '{"delta":"Kết quả"}' },
    })
    state = chatReducer(state, {
      type: 'event',
      event: { event: 'tool', data: '{"name":"search","status":"done","rows":[]}' },
    })
    state = chatReducer(state, {
      type: 'event',
      event: { event: 'done', data: '{"messageId":"m1"}' },
    })
    expect(state[0]).toMatchObject({
      id: 'm1',
      content: 'Kết quả',
      streaming: false,
      tools: [{ name: 'search', status: 'done' }],
    })
  })

  it('maps backend tool status start → running and "lỗi:" summary → failed', () => {
    let state = chatReducer([], { type: 'start', id: 'pending' })
    state = chatReducer(state, {
      type: 'event',
      event: { event: 'tool', data: '{"name":"search_equipment","status":"start"}' },
    })
    expect(state[0]!.tools).toEqual([{ name: 'search_equipment', status: 'running' }])
    state = chatReducer(state, {
      type: 'event',
      event: {
        event: 'tool',
        data: '{"name":"search_equipment","status":"done","summary":"lỗi: VALIDATION_ERROR"}',
      },
    })
    expect(state[0]!.tools).toEqual([
      { name: 'search_equipment', status: 'failed', summary: 'lỗi: VALIDATION_ERROR' },
    ])
  })

  it('keeps SSE error apart from content and retry drops the pair', () => {
    let state = chatReducer([], {
      type: 'user',
      message: { id: 'u1', role: 'user', content: 'Hỏi' },
    })
    state = chatReducer(state, { type: 'start', id: 'pending' })
    state = chatReducer(state, {
      type: 'event',
      event: { event: 'error', data: '{"code":"AI_RATE_LIMITED","message":"Chậm lại"}' },
    })
    expect(state[1]).toMatchObject({
      content: '',
      streaming: false,
      error: { code: 'AI_RATE_LIMITED', message: 'Chậm lại' },
    })
    expect(chatReducer(state, { type: 'retry', id: 'pending' })).toEqual([])
  })
})
