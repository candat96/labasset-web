import { parseSse } from './stream'

it('parses complete events', () => {
  const { events, rest } = parseSse(
    'event: notification\ndata: {"id":1}\n\nevent: heartbeat\ndata: \n\n',
    '',
  )
  expect(events).toEqual([
    { event: 'notification', data: '{"id":1}' },
    { event: 'heartbeat', data: '' },
  ])
  expect(rest).toBe('')
})

it('keeps partial chunk in buffer', () => {
  const a = parseSse('event: notif', '')
  expect(a.events).toEqual([])
  const b = parseSse('ication\ndata: x\n\n', a.rest)
  expect(b.events).toEqual([{ event: 'notification', data: 'x' }])
})

it('handles CRLF and comments', () => {
  const { events } = parseSse(': ping\r\n\r\ndata: a\r\ndata: b\r\n\r\n', '')
  expect(events).toEqual([{ event: 'message', data: 'a\nb' }])
})
