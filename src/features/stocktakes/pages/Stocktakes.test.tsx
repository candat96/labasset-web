import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './StocktakesPage'

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/stocktakes', () =>
      HttpResponse.json({
        items: [
          {
            id: 'k1',
            code: 'KK-1',
            name: 'Kiểm kho 9',
            type: 'supply',
            scopeType: 'all',
            status: 'draft',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      }),
    ),
  )
})

it('lists stocktakes', async () => {
  renderWithProviders(<Component />)
  expect(await screen.findByRole('link', { name: 'KK-1' })).toHaveAttribute(
    'href',
    '/stocktakes/k1',
  )
})
