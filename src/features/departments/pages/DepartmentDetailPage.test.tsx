import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { Component } from './DepartmentDetailPage'
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
