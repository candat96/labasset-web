import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component as TemplatesPage } from './TemplatesPage'
import { Component as TemplateFormPage } from './TemplateFormPage'
import { Component as TasksPage } from './TasksPage'

const template = {
  id: 't1',
  name: 'BD huyết học',
  groupId: null,
  model: 'XN-1000',
  isActive: true,
  version: 1,
  items: [{ key: 'power', label: 'Nguồn', type: 'check' }],
  createdAt: '2026-09-19T00:00:00Z',
  updatedAt: '2026-09-19T00:00:00Z',
}

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/maintenance/templates', () => HttpResponse.json([template])),
    http.get('/v1/maintenance/templates/t1', () => HttpResponse.json(template)),
    http.get('/v1/maintenance/tasks', () =>
      HttpResponse.json({
        items: [
          {
            id: 'k1',
            code: 'BD-1',
            type: 'periodic',
            status: 'scheduled',
            scheduledAt: '2026-09-20T00:00:00Z',
            dueAt: '2026-09-21T00:00:00Z',
            overallPass: null,
            equipmentId: 'e1',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      }),
    ),
    http.get('/v1/catalogs/:name', () => HttpResponse.json([])),
    http.get('/v1/equipment', () => HttpResponse.json({ items: [] })),
    http.get('/v1/users', () => HttpResponse.json({ items: [] })),
  )
})

it('lists templates', async () => {
  renderWithProviders(<TemplatesPage />)
  expect(await screen.findByText('BD huyết học')).toBeVisible()
})

it('validates template name', async () => {
  renderWithProviders(<TemplateFormPage />, {
    path: '/maintenance/templates/new',
    route: '/maintenance/templates/new',
  })
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  expect(await screen.findAllByText('Bắt buộc')).not.toHaveLength(0)
})

it('lists maintenance tasks', async () => {
  renderWithProviders(<TasksPage />)
  expect(await screen.findByRole('link', { name: 'BD-1' })).toHaveAttribute(
    'href',
    '/maintenance/tasks/k1',
  )
})

it('creates a template', async () => {
  const saved: unknown[] = []
  server.use(
    http.post('/v1/maintenance/templates', async ({ request }) => {
      saved.push(await request.json())
      return HttpResponse.json({ ...template, id: 't2' }, { status: 201 })
    }),
  )
  renderWithProviders(<TemplateFormPage />, {
    path: '/maintenance/templates/new',
    route: '/maintenance/templates/new',
    routes: [{ path: '/maintenance/templates/:id/edit', element: <div>EDIT</div> }],
  })
  await userEvent.type(screen.getByLabelText('Tên'), 'Mẫu mới')
  await userEvent.type(screen.getByLabelText('Nhãn'), 'Nguồn điện')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(saved[0]).toMatchObject({ name: 'Mẫu mới' }))
})
