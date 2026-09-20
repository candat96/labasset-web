import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './FaultFormPage'

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/catalogs/:name', () => HttpResponse.json([])),
    http.get('/v1/supplies', () => HttpResponse.json({ items: [] })),
  )
})

it('validates title and submits a new fault', async () => {
  const saved: unknown[] = []
  server.use(
    http.post('/v1/faults', async ({ request }) => {
      const body = (await request.json()) as { title?: string }
      if (!body.title?.trim())
        return HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'title bắt buộc', details: ['title Bắt buộc'] },
          { status: 400 },
        )
      saved.push(body)
      return HttpResponse.json({ id: 'f2', title: 'Lỗi mới', status: 'draft' }, { status: 201 })
    }),
  )
  renderWithProviders(<Component />, {
    path: '/faults/new',
    route: '/faults/new',
    routes: [{ path: '/faults/:id', element: <div>DETAIL</div> }],
  })
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  expect(await screen.findByText('Bắt buộc')).toBeVisible()
  await userEvent.type(screen.getByLabelText('Tiêu đề'), 'Không hút mẫu')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() =>
    expect(saved[0]).toMatchObject({ title: 'Không hút mẫu', scope: 'all', severity: 'medium' }),
  )
  expect(await screen.findByText('DETAIL')).toBeVisible()
})

it('hiện lỗi field do server trả về', async () => {
  server.use(
    http.post('/v1/faults', async ({ request }) => {
      const body = (await request.json()) as { title?: string }
      if (body.title === 'Trùng mã')
        return HttpResponse.json(
          {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            details: ['title Tiêu đề đã tồn tại'],
          },
          { status: 400 },
        )
      return HttpResponse.json({ id: 'f3', title: body.title, status: 'draft' }, { status: 201 })
    }),
  )
  renderWithProviders(<Component />, {
    path: '/faults/new',
    route: '/faults/new',
    routes: [{ path: '/faults/:id', element: <div>DETAIL</div> }],
  })
  await userEvent.type(screen.getByLabelText('Tiêu đề'), 'Trùng mã')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  expect(await screen.findByText('title Tiêu đề đã tồn tại')).toBeVisible()
})
