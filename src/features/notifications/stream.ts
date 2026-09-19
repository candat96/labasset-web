import { authHeaders, baseUrl, refreshTokens } from '@/api/client'

export interface SseEvent {
  event: string
  data: string
}

/** Tách các event SSE hoàn chỉnh khỏi chunk; phần dở dang trả lại trong `rest`. */
export function parseSse(chunk: string, buffer: string): { events: SseEvent[]; rest: string } {
  const text = (buffer + chunk).replace(/\r\n/g, '\n')
  const parts = text.split('\n\n')
  const rest = parts.pop() ?? ''
  const events: SseEvent[] = []
  for (const block of parts) {
    let event = 'message'
    const data: string[] = []
    let hasField = false
    for (const line of block.split('\n')) {
      if (line.startsWith(':')) continue
      if (line.startsWith('event:')) {
        event = line.slice(6).trim()
        hasField = true
      } else if (line.startsWith('data:')) {
        data.push(line.slice(5).trim())
        hasField = true
      }
    }
    if (hasField) events.push({ event, data: data.join('\n') })
  }
  return { events, rest }
}

export interface StreamOptions {
  onEvent: (e: SseEvent) => void
  /** Gọi khi thất bại liên tiếp → caller chuyển sang polling. */
  onFallback: () => void
  signal: AbortSignal
  maxFailures?: number
}

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(t)
      resolve()
    })
  })

/**
 * Kết nối `GET /v1/notifications/stream` bằng fetch streaming (EventSource không gửi được
 * header Authorization / X-Tenant-Id). 401 → refresh rồi nối lại; lỗi liên tiếp → fallback.
 */
export async function openNotificationStream(opts: StreamOptions): Promise<void> {
  const { onEvent, onFallback, signal, maxFailures = 3 } = opts
  let failures = 0
  while (!signal.aborted) {
    try {
      const res = await fetch(`${baseUrl}/v1/notifications/stream`, {
        headers: { ...authHeaders(), Accept: 'text/event-stream' },
        signal,
      })
      if (res.status === 401) {
        const ok = await refreshTokens()
        if (!ok) return
        continue
      }
      if (!res.ok || !res.body) throw new Error(`stream ${res.status}`)
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        const parsed = parseSse(decoder.decode(value, { stream: true }), buffer)
        buffer = parsed.rest
        for (const e of parsed.events) {
          if (e.event === 'connected') failures = 0
          onEvent(e)
        }
      }
      // Server đóng (JWT hết hạn) → nối lại ngay sau khi refresh nếu cần.
      failures++
    } catch {
      if (signal.aborted) return
      failures++
    }
    if (failures >= maxFailures) {
      onFallback()
      return
    }
    await sleep(Math.min(5000 * 2 ** (failures - 1), 60_000), signal)
  }
}
