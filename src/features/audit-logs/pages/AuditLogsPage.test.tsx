import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { AuditTrail } from '@/components/audit-trail'
import { Component } from './AuditLogsPage'

const user = { id: 'u1', username: 'admin', fullName: 'Quản trị viên' }
const createLog = {
  id: 'a1',
  createdAt: '2026-09-19T08:00:00.000Z',
  userId: 'u1',
  action: 'create',
  entityType: 'users',
  entityId: 'u1',
  before: null,
  after: { username: 'admin', roles: ['HOSPITAL_ADMIN'] },
  ip: '10.0.0.1',
  userAgent: 'test',
}
const updateLog = {
  id: 'a2',
  createdAt: '2026-09-19T09:00:00.000Z',
  userId: 'u1',
  action: 'update',
  entityType: 'users',
  entityId: 'u1',
  before: { fullName: 'Cũ' },
  after: { fullName: 'Mới' },
  ip: '10.0.0.2',
  userAgent: 'test',
}

beforeEach(() => {
  server.use(
    http.get('/v1/users', () =>
      HttpResponse.json({ items: [user], total: 1, page: 1, limit: 200 }),
    ),
    http.get('/v1/audit-logs', () =>
      HttpResponse.json({ items: [createLog, updateLog], total: 2, page: 1, limit: 20 }),
    ),
  )
})

it('lists audit logs and sends server-supported filters', async () => {
  const urls: string[] = []
  server.use(
    http.get('/v1/audit-logs', ({ request }) => {
      urls.push(request.url)
      return HttpResponse.json({ items: [createLog], total: 1, page: 1, limit: 20 })
    }),
  )
  const { router } = renderWithProviders(<Component />)
  expect(await screen.findByText('Tạo')).toBeVisible()
  expect(screen.getByText('Quản trị viên')).toBeVisible()
  expect(screen.getByText('10.0.0.1')).toBeVisible()
  expect(screen.getAllByRole('link', { name: 'u1' })[0]).toHaveAttribute('href', '/admin/users/u1')
  await userEvent.type(screen.getByLabelText('Loại đối tượng'), 'users')
  await userEvent.click(screen.getByLabelText('Từ ngày'))
  await userEvent.click(screen.getByRole('button', { name: /ngày 1 tháng 09 năm 2026/i }))
  await waitFor(() =>
    expect(urls.some((url) => url.includes('entityType=users') && url.includes('from='))).toBe(
      true,
    ),
  )
  expect(router.state.location.search).toContain('entityType=users')
})

it('does not send client-side action or q filters', async () => {
  const urls: string[] = []
  server.use(
    http.get('/v1/audit-logs', ({ request }) => {
      urls.push(request.url)
      const url = new URL(request.url)
      expect(url.searchParams.get('action')).toBeNull()
      expect(url.searchParams.get('q')).toBeNull()
      return HttpResponse.json({ items: [createLog, updateLog], total: 2, page: 1, limit: 20 })
    }),
  )
  renderWithProviders(<Component />)
  expect(await screen.findByText('Tạo')).toBeVisible()
  expect(screen.queryByLabelText('Hành động')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('Tìm nhật ký')).not.toBeInTheDocument()
  expect(urls.some((item) => item.includes('action=') || item.includes('q='))).toBe(false)
})

it('opens a before/after drawer and highlights changed keys', async () => {
  renderWithProviders(<Component />)
  await userEvent.click(await screen.findByText('Sửa'))
  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getByText('Trước')).toBeVisible()
  expect(within(dialog).getByText('Sau')).toBeVisible()
  expect(within(dialog).getByText(/Cũ/)).toBeVisible()
  expect(within(dialog).getByText(/Mới/)).toBeVisible()
  const changed = within(dialog).getAllByText('fullName')
  expect(changed[0]?.closest('[data-changed]')).toBeTruthy()
})

it('reuses AuditTrail against the entity endpoint', async () => {
  server.use(
    http.get('/v1/audit-logs/entity/:type/:id', ({ params }) => {
      expect(params.type).toBe('users')
      expect(params.id).toBe('u1')
      return HttpResponse.json({ items: [updateLog], total: 1, page: 1, limit: 20 })
    }),
  )
  renderWithProviders(<AuditTrail entityType="users" entityId="u1" />)
  expect(await screen.findByText('Sửa')).toBeVisible()
  expect(screen.getByLabelText('Dòng thời gian')).toBeVisible()
})

it('shows error and retries the list', async () => {
  let failed = true
  server.use(
    http.get('/v1/audit-logs', () =>
      failed
        ? HttpResponse.json({ code: 'INTERNAL_ERROR', message: 'boom' }, { status: 500 })
        : HttpResponse.json({ items: [createLog], total: 1, page: 1, limit: 20 }),
    ),
  )
  renderWithProviders(<Component />)
  expect(await screen.findByText('Lỗi hệ thống, vui lòng thử lại')).toBeVisible()
  failed = false
  await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(await screen.findByText('Tạo')).toBeVisible()
})
