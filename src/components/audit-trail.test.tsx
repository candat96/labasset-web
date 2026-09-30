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

it('dịch nhãn trường và tra tên cho giá trị UUID tham chiếu', async () => {
  useAuthStore.getState().setSession(fakeSession(['HOSPITAL_ADMIN']))
  const groupId = 'eca494ad-0000-4000-8000-000000000002'
  const oldAssignee = '11111111-0000-4000-8000-000000000009'
  const assignee = 'e8117d70-8ffc-4fac-a913-89cd2e382859'
  server.use(
    http.get('/v1/audit-logs/entity/:type/:id', () =>
      HttpResponse.json({
        items: [
          {
            id: 'a1',
            action: 'update',
            entityType: 'repair_ticket',
            entityId: 'r1',
            userId: '12345678-aaaa-bbbb-cccc-000000000000',
            ip: null,
            createdAt: '2026-09-19T08:00:00.000Z',
            before: { assigneeId: oldAssignee, faultGroupId: null, dueAtOverridden: false },
            after: {
              assigneeId: assignee,
              assignee: { id: assignee, fullName: 'Lê Hoàng Cường' },
              faultGroupId: groupId,
              dueAtOverridden: true,
            },
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      }),
    ),
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
    http.get('/v1/catalogs/fault-groups', () =>
      HttpResponse.json({
        items: [{ id: groupId, code: 'G1', name: 'Nhóm lỗi cơ khí' }],
        total: 1,
        page: 1,
        limit: 50,
      }),
    ),
  )
  renderWithProviders(<AuditTrail entityType="repair_ticket" entityId="r1" />)
  // Tên trường tiếng Việt, không lọt "Due at overridden".
  expect((await screen.findAllByText(/Gia hạn xử lý/)).length).toBeGreaterThan(0)
  // Quan hệ kèm sẵn trong bản ghi (assignee) → tên.
  expect(screen.getByText(/Lê Hoàng Cường/)).toBeVisible()
  // UUID nhóm lỗi tra qua danh mục → tên, không in UUID thô.
  expect(screen.getByText(/Nhóm lỗi cơ khí/)).toBeVisible()
  expect(screen.queryByText(groupId)).not.toBeInTheDocument()
})
