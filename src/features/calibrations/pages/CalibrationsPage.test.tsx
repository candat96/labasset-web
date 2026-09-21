import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './CalibrationsPage'

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/calibrations', () =>
      HttpResponse.json({
        items: [
          {
            id: 'c1',
            code: 'KD-1',
            type: 'inspection',
            status: 'scheduled',
            scheduledAt: '2026-09-20T00:00:00Z',
            result: null,
            nextDueAt: '2026-10-01T00:00:00Z',
            cost: '0',
            equipmentId: 'e1',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      }),
    ),
    http.get('/v1/equipment', () => HttpResponse.json({ items: [] })),
    http.get('/v1/catalogs/:name', () => HttpResponse.json([])),
  )
})

it('lists calibrations', async () => {
  renderWithProviders(<Component />)
  expect(await screen.findByRole('link', { name: 'KD-1' })).toHaveAttribute(
    'href',
    '/calibrations/c1',
  )
})

it('creates a calibration with a body validated like the API', async () => {
  const saved: unknown[] = []
  server.use(
    http.get('/v1/equipment', () =>
      HttpResponse.json({
        items: [{ id: 'e1', code: 'TB-1', name: 'Máy XN' }],
        total: 1,
        page: 1,
        limit: 20,
      }),
    ),
    http.post('/v1/calibrations', async ({ request }) => {
      const body = (await request.json()) as { equipmentId?: string; type?: string }
      if (!body.equipmentId || !body.type) {
        return HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Thiếu máy/loại' },
          { status: 400 },
        )
      }
      saved.push(body)
      return HttpResponse.json({ id: 'c2', code: 'KD-2' }, { status: 201 })
    }),
  )
  renderWithProviders(<Component />, {
    path: '/calibrations',
    route: '/calibrations',
    routes: [{ path: '/calibrations/:id', element: <div>DETAIL</div> }],
  })
  await userEvent.click(await screen.findByRole('button', { name: 'Lên lịch / Ghi kết quả' }))
  await userEvent.type(await screen.findByLabelText('Máy (chọn được nhiều)'), 'TB-1')
  await userEvent.click(await screen.findByRole('option', { name: /Máy XN/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(saved[0]).toMatchObject({ equipmentId: 'e1', type: 'inspection' }))
})
