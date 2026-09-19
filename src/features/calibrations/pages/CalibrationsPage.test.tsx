import { screen } from '@testing-library/react'
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
