import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './AssistantPage'

beforeEach(() => useAuthStore.getState().setSession(fakeSession()))

const STATUS = {
  enabled: true,
  model: 'gpt-4o-mini',
  budget: { monthlyTokenBudget: 1000, used: 100, remaining: 900 },
  rateLimit: { perHour: 30 },
  chat: { protocol: 'openai_compatible', baseUrlHost: 'api.openai.com', model: 'gpt-4o-mini' },
  embedding: { protocol: 'openai_compatible', model: 'text-embedding-3-small', enabled: true },
}

/** Handler SSE giả: `events` là chuỗi `event:/data:` thô trả về nguyên khối. */
function sse(events: string) {
  return http.post('/v1/ai/conversations/:id/messages', () => {
    const encoder = new TextEncoder()
    return new HttpResponse(
      new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(events))
          controller.close()
        },
      }),
      { headers: { 'Content-Type': 'text/event-stream' } },
    )
  })
}

function baseHandlers() {
  return [
    http.get('/v1/ai/status', () => HttpResponse.json(STATUS)),
    http.get('/v1/ai/conversations', () =>
      HttpResponse.json({ items: [], total: 0, page: 1, limit: 50 }),
    ),
    http.get('/v1/ai/conversations/:id', () =>
      HttpResponse.json({
        id: 'c1',
        title: 'Xin chào',
        updatedAt: '2026-09-20T00:00:00Z',
        messages: [],
      }),
    ),
    http.post('/v1/ai/conversations', () =>
      HttpResponse.json(
        { id: 'c1', title: 'Xin chào', updatedAt: '2026-09-20T00:00:00Z' },
        { status: 201 },
      ),
    ),
  ]
}

it('shows disabled state only for the contracted 404', async () => {
  server.use(
    http.get('/v1/ai/status', () => HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 })),
  )
  renderWithProviders(<Component />)
  expect(await screen.findByText('Trợ lý AI chưa bật')).toBeVisible()
  expect(screen.getByText(/Cấu hình → tab AI/)).toBeVisible()
  expect(screen.getByRole('link', { name: 'Mở Cấu hình → AI' })).toHaveAttribute(
    'href',
    '/admin/settings?tab=ai',
  )
})

it('creates a conversation, consumes SSE (text + tool + done) and sends feedback', async () => {
  let createdBody: unknown
  let feedbackBody: unknown
  server.use(
    // Handler riêng đặt trước `baseHandlers()` vì msw lấy handler khớp đầu tiên.
    http.get('/v1/equipment/:id', () =>
      HttpResponse.json({ id: 'e1', code: 'TB-001', name: 'Máy ly tâm', status: 'active' }),
    ),
    http.post('/v1/ai/conversations', async ({ request }) => {
      createdBody = await request.json()
      return HttpResponse.json(
        { id: 'c1', title: 'Xin chào', updatedAt: '2026-09-20T00:00:00Z' },
        { status: 201 },
      )
    }),
    ...baseHandlers(),
    sse(
      [
        'event: tool\ndata: {"name":"search_equipment","status":"start"}\n\n',
        'event: tool\ndata: {"name":"search_equipment","status":"done","summary":"3 dòng","rows":[{"code":"TB-1","name":"Máy A","departmentId":"d1"}]}\n\n',
        'event: text\ndata: {"delta":"Chào "}\n\n',
        'event: text\ndata: {"delta":"**bạn**"}\n\n',
        'event: done\ndata: {"messageId":"m1","tokensIn":10,"tokensOut":5}\n\n',
      ].join(''),
    ),
    http.post('/v1/ai/messages/:id/feedback', async ({ request }) => {
      feedbackBody = await request.json()
      return new HttpResponse(null, { status: 204 })
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<Component />, { route: '/assistant?equipmentId=e1' })
  expect(await screen.findByText('TB-001 — Máy ly tâm')).toBeVisible()
  await user.type(await screen.findByRole('textbox', { name: 'Câu hỏi' }), 'Xin chào')
  await user.click(screen.getByRole('button', { name: 'Gửi' }))
  expect(await screen.findByText('bạn')).toBeVisible()
  expect(screen.getByText('bạn').tagName).toBe('STRONG')
  // Tool chip gọn: nhãn Việt + summary, mở ra bảng ẩn cột *Id.
  const chip = screen.getByRole('button', { name: 'Đã tra cứu dữ liệu: Tra cứu thiết bị' })
  expect(chip).toHaveTextContent('Tra cứu thiết bị· 3 dòng')
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  await user.click(chip)
  const table = await screen.findByRole('table')
  expect(within(table).getByText('Máy A')).toBeVisible()
  expect(within(table).queryByText('d1')).not.toBeInTheDocument()
  await user.click(await screen.findByRole('button', { name: 'Hữu ích' }))
  await waitFor(() => expect(feedbackBody).toEqual({ feedback: 'up' }))
  expect(createdBody).toEqual({ title: 'Xin chào', equipmentId: 'e1' })
})

it('renders GFM tables in the answer inside a horizontally scrollable wrapper', async () => {
  server.use(
    ...baseHandlers(),
    sse(
      'event: text\ndata: {"delta":"| Mã | Tên |\\n|---|---|\\n| TB-1 | Máy ly tâm |\\n"}\n\nevent: done\ndata: {"messageId":"m1"}\n\n',
    ),
  )
  const user = userEvent.setup()
  renderWithProviders(<Component />)
  await user.type(await screen.findByRole('textbox', { name: 'Câu hỏi' }), 'Liệt kê máy')
  await user.click(screen.getByRole('button', { name: 'Gửi' }))
  const table = await screen.findByRole('table')
  expect(within(table).getByRole('columnheader', { name: 'Mã' })).toBeVisible()
  expect(within(table).getByText('Máy ly tâm')).toBeVisible()
  expect(screen.getByTestId('md-table')).toHaveClass('overflow-x-auto')
})

it('shows SSE error in the assistant bubble and retries the same question', async () => {
  let calls = 0
  server.use(
    ...baseHandlers(),
    http.post('/v1/ai/conversations/:id/messages', () => {
      calls += 1
      const encoder = new TextEncoder()
      const body =
        calls === 1
          ? 'event: error\ndata: {"code":"AI_PROVIDER_ERROR","message":"Nhà cung cấp trả 502"}\n\n'
          : 'event: text\ndata: {"delta":"Lần hai OK"}\n\nevent: done\ndata: {"messageId":"m2"}\n\n'
      return new HttpResponse(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(body))
            controller.close()
          },
        }),
        { headers: { 'Content-Type': 'text/event-stream' } },
      )
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<Component />)
  await user.type(await screen.findByRole('textbox', { name: 'Câu hỏi' }), 'Máy nào hỏng?')
  await user.click(screen.getByRole('button', { name: 'Gửi' }))
  const alert = await screen.findByRole('alert')
  expect(alert).toHaveTextContent('Nhà cung cấp trả 502')
  expect(alert).toHaveClass('bg-destructive-bg')
  await user.click(within(alert).getByRole('button', { name: 'Thử lại' }))
  expect(await screen.findByText('Lần hai OK')).toBeVisible()
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(document.querySelectorAll('[data-role="user"]')).toHaveLength(1)
  expect(calls).toBe(2)
})

it('toggles the conversation panel, remembers it and filters the paged list', async () => {
  server.use(
    http.get('/v1/ai/conversations', () =>
      HttpResponse.json({
        items: [
          { id: 'c1', title: 'Kiểm định tháng 9', updatedAt: '2026-09-20T00:00:00Z' },
          { id: 'c2', title: 'Hoá chất máy X', updatedAt: '2026-09-19T00:00:00Z' },
        ],
        total: 2,
        page: 1,
        limit: 50,
      }),
    ),
    http.get('/v1/ai/conversations/:id', () =>
      HttpResponse.json({
        id: 'c1',
        title: 'Kiểm định tháng 9',
        updatedAt: '2026-09-20T00:00:00Z',
        messages: [
          { id: 'm1', role: 'user', content: 'Máy nào quá hạn kiểm định?' },
          {
            id: 'm2',
            role: 'tool',
            content: '{"rows":[{"code":"TB-1"}]}',
            toolCalls: [{ id: 't1', name: 'calibration_due' }],
            toolResults: { rows: [{ code: 'TB-1' }], truncated: false },
          },
          { id: 'm3', role: 'assistant', content: 'Có **1** máy quá hạn.' },
        ],
      }),
    ),
    ...baseHandlers(),
  )
  const user = userEvent.setup()
  renderWithProviders(<Component />)
  // Mặc định ẩn (jsdom matchMedia = false ⇒ < xl).
  await screen.findByRole('textbox', { name: 'Câu hỏi' })
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Hiện danh sách hội thoại' }))
  expect(localStorage.getItem('labasset.assistant.panel')).toBe('open')
  const panel = await screen.findByRole('complementary', { name: 'Hội thoại' })
  expect(await within(panel).findByRole('button', { name: 'Kiểm định tháng 9' })).toBeVisible()
  await user.type(screen.getByPlaceholderText('Tìm hội thoại'), 'Hoá')
  expect(within(panel).getByRole('button', { name: 'Hoá chất máy X' })).toBeVisible()
  expect(within(panel).queryByRole('button', { name: 'Kiểm định tháng 9' })).not.toBeInTheDocument()
  await user.clear(screen.getByPlaceholderText('Tìm hội thoại'))
  await user.click(within(panel).getByRole('button', { name: 'Kiểm định tháng 9' }))
  expect(await screen.findByText('Máy nào quá hạn kiểm định?')).toBeVisible()
  expect(screen.getByRole('button', { name: /Kiểm định đến hạn/ })).toBeVisible()
  expect(screen.getByText('1').tagName).toBe('STRONG')
  await user.click(within(panel).getByRole('button', { name: 'Ẩn danh sách hội thoại' }))
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  expect(localStorage.getItem('labasset.assistant.panel')).toBe('closed')
})

it('sends a suggestion chip when the thread is empty and shows the stop button while streaming', async () => {
  let sentBody: unknown
  let release: (() => void) | undefined
  server.use(
    ...baseHandlers(),
    http.post('/v1/ai/conversations/:id/messages', async ({ request }) => {
      sentBody = await request.json()
      const encoder = new TextEncoder()
      return new HttpResponse(
        new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode('event: text\ndata: {"delta":"Đang…"}\n\n'))
            release = () => {
              controller.enqueue(encoder.encode('event: done\ndata: {"messageId":"m1"}\n\n'))
              controller.close()
            }
          },
        }),
        { headers: { 'Content-Type': 'text/event-stream' } },
      )
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<Component />)
  await user.click(await screen.findByRole('button', { name: 'Máy nào đang hỏng?' }))
  expect(await screen.findByText('Đang…')).toBeVisible()
  expect(screen.getByTestId('stream-cursor')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Dừng' })).toBeVisible()
  expect(sentBody).toEqual({ content: 'Máy nào đang hỏng?' })
  release?.()
  expect(await screen.findByRole('button', { name: 'Gửi' })).toBeInTheDocument()
  expect(screen.queryByTestId('stream-cursor')).not.toBeInTheDocument()
})

it('bám đáy khi gửi tin, nhưng tôn trọng vị trí khi người dùng cuộn lên', async () => {
  server.use(
    ...baseHandlers(),
    sse('event: text\ndata: {"delta":"Chào bạn"}\n\nevent: done\ndata: {"messageId":"m1"}\n\n'),
  )
  const user = userEvent.setup()
  const { container } = renderWithProviders(<Component />)
  const textbox = await screen.findByRole('textbox', { name: 'Câu hỏi' })
  const thread = container.querySelector<HTMLElement>('div[aria-live="polite"].overflow-y-auto')!
  Object.defineProperty(thread, 'scrollHeight', { value: 1200, configurable: true })
  Object.defineProperty(thread, 'clientHeight', { value: 400, configurable: true })
  await user.type(textbox, 'Xin chào')
  await user.click(screen.getByRole('button', { name: 'Gửi' }))
  expect(await screen.findByText('Chào bạn')).toBeVisible()
  await waitFor(() => expect(thread.scrollTop).toBe(1200))

  // Người dùng cuộn lên: hiện nút xuống cuối thay vì tự kéo xuống.
  thread.scrollTop = 100
  fireEvent.scroll(thread)
  const jump = await screen.findByRole('button', { name: 'Xuống tin nhắn mới nhất' })
  expect(jump).toBeVisible()
  expect(thread.scrollTop).toBe(100)
  await user.click(jump)
  expect(thread.scrollTop).toBe(1200)
})
