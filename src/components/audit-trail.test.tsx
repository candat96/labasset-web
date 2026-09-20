import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { AuditTrail } from './audit-trail'

const trailPage = {
  items: [
    {
      id: 'a1',
      action: 'update',
      entityType: 'equipment',
      entityId: 'e1',
      userId: '12345678-aaaa-bbbb-cccc-000000000000',
      ip: null,
      before: null,
      after: null,
      createdAt: '2026-09-19T08:00:00.000Z',
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
}

beforeEach(() => {
  server.use(http.get('/v1/audit-logs/entity/:type/:id', () => HttpResponse.json(trailPage)))
})

it('HOSPITAL_ADMIN resolve được tên người từ /v1/users', async () => {
  useAuthStore.getState().setSession(fakeSession(['HOSPITAL_ADMIN']))
  server.use(
    http.get('/v1/users', () =>
      HttpResponse.json({
        items: [
          { id: '12345678-aaaa-bbbb-cccc-000000000000', username: 'nva', fullName: 'Nguyễn Văn A' },
        ],
        total: 1,
        page: 1,
        limit: 200,
      }),
    ),
  )
  renderWithProviders(<AuditTrail entityType="equipment" entityId="e1" />)
  expect(await screen.findByText(/Nguyễn Văn A/)).toBeVisible()
})

it('role khác không gọi /v1/users và hiện userId rút gọn', async () => {
  useAuthStore.getState().setSession(fakeSession(['DEPT_USER']))
  let userCalls = 0
  server.use(
    http.get('/v1/users', () => {
      userCalls += 1
      return HttpResponse.json({ items: [], total: 0, page: 1, limit: 200 })
    }),
  )
  renderWithProviders(<AuditTrail entityType="equipment" entityId="e1" />)
  expect(await screen.findByText(/12345678…/)).toBeVisible()
  expect(userCalls).toBe(0)
})
