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
})
