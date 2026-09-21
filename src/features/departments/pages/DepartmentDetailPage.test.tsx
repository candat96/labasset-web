import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './DepartmentDetailPage'

beforeEach(() => {
  server.use(
    http.get('/v1/departments/:id/rooms', () => HttpResponse.json([])),
    http.get('/v1/reports/equipment.byRoom', () =>
      HttpResponse.json({ columns: [], rows: [], total: 0 }),
    ),
  )
})
it('loads department and paged users, displaying the full user count', async () => {
  server.use(
    http.get('/v1/departments/d1', () =>
      HttpResponse.json({
        id: 'd1',
        code: 'XN',
        name: 'Khoa xét nghiệm',
        isActive: true,
        phone: '123456',
        location: 'Tầng 1',
      }),
    ),
    http.get('/v1/departments/d1/users', () =>
      HttpResponse.json({
        items: [
          { id: 'u1', username: 'staff', fullName: 'Nguyễn An', email: null, roles: ['DEPT_USER'] },
        ],
        total: 25,
        page: 1,
        limit: 20,
      }),
    ),
  )
  renderWithProviders(<Component />, {
    path: '/admin/departments/:id',
    route: '/admin/departments/d1?tab=users',
  })
  expect(await screen.findByText('Nguyễn An')).toBeVisible()
  expect(screen.getByText('25')).toBeVisible()
  expect(screen.getByRole('tab', { name: 'Người dùng' })).toHaveAttribute('data-state', 'active')
})
it('shows a retryable error for unavailable department', async () => {
  server.use(
    http.get('/v1/departments/d1', () =>
      HttpResponse.json({ code: 'DEPARTMENT_NOT_FOUND' }, { status: 404 }),
    ),
    http.get('/v1/departments/d1/users', () => HttpResponse.json({ items: [], total: 0 })),
  )
  renderWithProviders(<Component />, {
    path: '/admin/departments/:id',
    route: '/admin/departments/d1',
  })
  expect(await screen.findByText('Không tìm thấy khoa/phòng')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Thử lại' })).toBeVisible()
})
it('tab Phòng: bảng phòng + số máy từ báo cáo byRoom, nút thêm phòng tạo phòng của khoa', async () => {
  const bodies: Record<string, unknown>[] = []
  server.use(
    http.get('/v1/departments/d1', () =>
      HttpResponse.json({ id: 'd1', code: 'XN', name: 'Khoa xét nghiệm', isActive: true }),
    ),
    http.get('/v1/departments/d1/users', () => HttpResponse.json({ items: [], total: 0 })),
    http.get('/v1/departments/d1/rooms', () =>
      HttpResponse.json([
        {
          id: 'r1',
          code: 'XN-HH',
          name: 'Phòng Huyết học',
          departmentId: 'd1',
          building: 'Nhà A',
          floor: 'Tầng 1',
          roomType: 'lab',
          isActive: true,
        },
      ]),
    ),
    http.get('/v1/reports/equipment.byRoom', () =>
      HttpResponse.json({
        columns: [],
        rows: [
          { department: 'Khoa xét nghiệm', room: 'Phòng Huyết học', roomCode: 'XN-HH', total: 7 },
        ],
        total: 1,
      }),
    ),
    http.post('/v1/catalogs/rooms', async ({ request }) => {
      bodies.push((await request.json()) as Record<string, unknown>)
      return HttpResponse.json({ id: 'r2', code: 'XN-SH', name: 'Sinh hoá' }, { status: 201 })
    }),
  )
  useAuthStore.getState().setSession(fakeSession())
  renderWithProviders(<Component />, {
    path: '/admin/departments/:id',
    route: '/admin/departments/d1?tab=rooms',
  })
  expect(await screen.findByText('Phòng Huyết học')).toBeVisible()
  expect(screen.getByText('Nhà A / Tầng 1')).toBeVisible()
  expect(screen.getByText('Phòng xét nghiệm')).toBeVisible()
  expect(await screen.findByRole('link', { name: '7' })).toHaveAttribute(
    'href',
    '/equipment?departmentId=d1&roomId=r1',
  )
  await userEvent.click(screen.getByRole('button', { name: 'Thêm phòng' }))
  const dialog = within(await screen.findByRole('dialog'))
  expect(dialog.getByText('Phòng mới thuộc Khoa xét nghiệm')).toBeVisible()
  await userEvent.type(dialog.getByLabelText('Tên'), 'Sinh hoá')
  await userEvent.click(dialog.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(bodies[0]).toMatchObject({ name: 'Sinh hoá', departmentId: 'd1' }))
})
