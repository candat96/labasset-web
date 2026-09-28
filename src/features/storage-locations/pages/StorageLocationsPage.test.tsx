import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { Component } from './StorageLocationsPage'

const row = {
  id: 'l1',
  code: 'KE-A',
  name: 'Kệ A',
  description: null,
  isActive: true,
  sortOrder: 0,
  warehouseId: 'w1',
  zone: 'Khu 1',
  parentId: null,
}

it('hiện vị trí theo kho và gửi bộ lọc kho lấy từ URL', async () => {
  const urls: string[] = []
  server.use(
    http.get('/v1/catalogs/warehouses', () =>
      HttpResponse.json([{ id: 'w1', code: 'K1', name: 'Kho chính' }]),
    ),
    http.get('/v1/catalogs/warehouses/:id', () =>
      HttpResponse.json({ id: 'w1', code: 'K1', name: 'Kho chính' }),
    ),
    http.get('/v1/catalogs/storage-locations', ({ request }) => {
      urls.push(request.url)
      return HttpResponse.json({ items: [row], total: 1, page: 1, limit: 20 })
    }),
  )
  renderWithProviders(<Component />, {
    path: '/admin/storage-locations',
    route: '/admin/storage-locations?warehouseId=w1',
  })
  expect(await screen.findByText('Kệ A')).toBeVisible()
  expect((await screen.findAllByText('Kho chính')).length).toBeGreaterThan(0)
  await waitFor(() => expect(urls.some((url) => url.includes('warehouseId=w1'))).toBe(true))
})
