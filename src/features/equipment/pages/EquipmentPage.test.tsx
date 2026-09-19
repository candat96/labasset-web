import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './EquipmentPage'

const row = {
  id: 'e1',
  code: 'TB-2026-00001',
  name: 'Máy huyết học',
  model: 'XN-1000',
  serial: 'SN1',
  departmentId: 'd1',
  departmentName: 'Huyết học',
  groupId: null,
  groupName: null,
  manufacturerName: 'Sysmex',
  location: 'P.101',
  staffInChargeUserId: null,
  status: 'active',
  nextMaintenanceAt: null,
  nextCalibrationAt: '2026-09-01T00:00:00Z',
  calibrationOverdue: true,
  updatedAt: '2026-09-19T00:00:00Z',
}

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/equipment', () =>
      HttpResponse.json({ items: [row], total: 1, page: 1, limit: 20 }),
    ),
    http.get('/v1/departments', () => HttpResponse.json({ items: [] })),
    http.get('/v1/catalogs/equipment-groups', () => HttpResponse.json([])),
    http.get('/v1/catalogs/manufacturers', () => HttpResponse.json([])),
    http.get('/v1/users', () => HttpResponse.json({ items: [], total: 0, page: 1, limit: 50 })),
  )
})

it('lists equipment and keeps filters on the URL', async () => {
  const urls: string[] = []
  server.use(
    http.get('/v1/equipment', ({ request }) => {
      urls.push(request.url)
      return HttpResponse.json({ items: [row], total: 1, page: 1, limit: 20 })
    }),
  )
  const { router } = renderWithProviders(<Component />)
  expect(await screen.findByRole('link', { name: 'TB-2026-00001' })).toHaveAttribute(
    'href',
    '/equipment/e1',
  )
  expect(screen.getByText('Máy huyết học')).toBeVisible()
  await userEvent.type(screen.getByLabelText('Tìm máy'), 'huyet')
  await waitFor(() => expect(urls.some((u) => u.includes('q=huyet'))).toBe(true))
  expect(router.state.location.search).toContain('q=huyet')
})
