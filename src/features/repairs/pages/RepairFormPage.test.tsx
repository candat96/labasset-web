import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './RepairFormPage'

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/equipment', () =>
      HttpResponse.json({
        items: [{ id: 'e1', code: 'TB-1', name: 'Máy huyết học' }],
        total: 1,
        page: 1,
        limit: 50,
      }),
    ),
    http.get('/v1/departments', () => HttpResponse.json({ items: [] })),
    http.get('/v1/settings/public', () =>
      HttpResponse.json({ 'repair.sla': { low: 48, medium: 24, high: 8, critical: 4 } }),
    ),
    http.get('/v1/faults/suggest', () => HttpResponse.json([])),
  )
})

it('validates description and creates a ticket', async () => {
  const saved: unknown[] = []
  server.use(
    http.post('/v1/repairs', async ({ request }) => {
      const body = await request.json()
      saved.push(body)
      return HttpResponse.json({ id: 'r2', code: 'SC-2' }, { status: 201 })
    }),
  )
  renderWithProviders(<Component />, {
    path: '/repairs/new',
    route: '/repairs/new',
    routes: [{ path: '/repairs/:id', element: <div>DETAIL</div> }],
  })
  await userEvent.click(screen.getByRole('button', { name: 'Tạo phiếu' }))
  expect((await screen.findAllByText('Bắt buộc')).length).toBeGreaterThan(0)
  await userEvent.type(screen.getByLabelText('Máy'), 'TB')
  await userEvent.click(await screen.findByRole('option', { name: /TB-1/ }))
  await userEvent.type(screen.getByLabelText('Mô tả'), 'Máy kẹt kim')
  expect(screen.getByText('SLA: 24 giờ')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Tạo phiếu' }))
  await waitFor(() =>
    expect(saved[0]).toMatchObject({
      equipmentId: 'e1',
      description: 'Máy kẹt kim',
      severity: 'medium',
    }),
  )
  expect(await screen.findByText('DETAIL')).toBeVisible()
})
