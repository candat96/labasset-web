import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './AssistantPage'

beforeEach(() => useAuthStore.getState().setSession(fakeSession()))

it('shows disabled state only for the contracted 404', async () => {
  server.use(
    http.get('/v1/ai/status', () => HttpResponse.json({ code: 'NOT_FOUND' }, { status: 404 })),
  )
  renderWithProviders(<Component />)
  expect(await screen.findByText(/Chưa bật/)).toBeVisible()
  expect(screen.getByRole('link', { name: /Cấu hình AI/ })).toHaveAttribute(
    'href',
    '/admin/settings?tab=ai',
  )
})

it('creates a conversation, consumes SSE and sends feedback', async () => {
  let createdBody: unknown
  let feedbackBody: unknown
  server.use(
    http.get('/v1/ai/status', () =>
      HttpResponse.json({ enabled: true, budget: { remaining: 900 } }),
    ),
    http.get('/v1/ai/conversations', () => HttpResponse.json([])),
    http.get('/v1/ai/conversations/:id/messages', () => HttpResponse.json([])),
    http.post('/v1/ai/conversations', async ({ request }) => {
      createdBody = await request.json()
      return HttpResponse.json(
        { id: 'c1', title: 'Xin chào', updatedAt: '2026-09-20T00:00:00Z' },
        { status: 201 },
      )
    }),
    http.post('/v1/ai/conversations/:id/messages', async ({ request }) => {
      const body = (await request.json()) as { content?: string }
      if (body.content !== 'Xin chào')
        return HttpResponse.json({ code: 'VALIDATION_ERROR' }, { status: 400 })
      const encoder = new TextEncoder()
      return new HttpResponse(
        new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                'event: text\ndata: {"delta":"Chào **bạn**"}\n\nevent: tool\ndata: {"name":"search_equipment","status":"done","summary":"1 dòng","rows":[{"code":"TB-1"}],"link":"/equipment"}\n\nevent: done\ndata: {"messageId":"m1","sources":[{"title":"HDSD","link":"/files/f1"}]}\n\n',
              ),
            )
            controller.close()
          },
        }),
        { headers: { 'Content-Type': 'text/event-stream' } },
      )
    }),
    http.post('/v1/ai/messages/:id/feedback', async ({ request }) => {
      feedbackBody = await request.json()
      return new HttpResponse(null, { status: 204 })
    }),
  )
  const user = userEvent.setup()
  renderWithProviders(<Component />, { route: '/assistant?equipmentId=e1' })
  await user.type(await screen.findByRole('textbox', { name: 'Câu hỏi' }), 'Xin chào')
  await user.click(screen.getByRole('button', { name: 'Gửi' }))
  expect(await screen.findByText('bạn')).toBeVisible()
  expect(screen.getByText(/search_equipment/)).toBeVisible()
  expect(screen.getByText('Nguồn: HDSD')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Hữu ích' }))
  expect(createdBody).toEqual({ title: 'Xin chào', equipmentId: 'e1' })
  expect(feedbackBody).toEqual({ feedback: 'up' })
})
