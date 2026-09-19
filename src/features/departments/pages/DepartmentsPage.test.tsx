import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession, fakeUser } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { toast } from 'sonner'
import { Component as DepartmentsPage } from './DepartmentsPage'

const dept = (over: Partial<Record<string, unknown>> = {}) => ({
  id: 'd1',
  code: 'XN',
  name: 'Khoa Xét nghiệm',
  type: 'lab',
  headUserId: 'u1',
  phone: null,
  location: null,
  isActive: true,
  sortOrder: 0,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  ...over,
})

const handlers = (
  items = [
    dept(),
    dept({
      id: 'd2',
      code: 'VT',
      name: 'Phòng Vật tư',
      type: 'equipment_office',
      headUserId: null,
    }),
  ],
) => [
  http.get('/v1/departments', () =>
    HttpResponse.json({ items, total: items.length, page: 1, limit: 20 }),
  ),
  http.get('/v1/users', () =>
    HttpResponse.json({ items: [fakeUser()], total: 1, page: 1, limit: 200 }),
  ),
]

beforeEach(() => server.use(...handlers()))

it('lists departments with head name and hides write actions for DEPT_USER', async () => {
  useAuthStore.getState().setSession(fakeSession(['DEPT_USER']))
  renderWithProviders(<DepartmentsPage />, { route: '/admin/departments' })
  expect(await screen.findByText('Khoa Xét nghiệm')).toBeInTheDocument()
  expect(await screen.findByText('Quản trị viên')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Thêm khoa\/phòng/ })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Thao tác' })).not.toBeInTheDocument()
})

it('creates a department: validation, uppercase code, server field error', async () => {
  useAuthStore.getState().setSession(fakeSession(['HOSPITAL_ADMIN']))
  const bodies: unknown[] = []
  server.use(
    http.post('/v1/departments', async ({ request }) => {
      const b = (await request.json()) as { code: string }
      bodies.push(b)
      if (b.code === 'DUP')
        return HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Validation failed', details: ['code đã tồn tại'] },
          { status: 400 },
        )
      return HttpResponse.json(dept({ id: 'd3', code: b.code }), { status: 201 })
    }),
  )
  renderWithProviders(<DepartmentsPage />, { route: '/admin/departments' })
  await userEvent.click(await screen.findByRole('button', { name: /Thêm khoa\/phòng/ }))
  const dialog = await screen.findByRole('dialog')
  await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
  expect((await within(dialog).findAllByText('Bắt buộc')).length).toBeGreaterThan(0)

  await userEvent.type(within(dialog).getByLabelText('Mã'), 'dup')
  await userEvent.type(within(dialog).getByLabelText('Tên'), 'Khoa mới')
  await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
  expect(await within(dialog).findByText('code đã tồn tại')).toBeInTheDocument()
  expect(bodies[0]).toMatchObject({ code: 'DUP', name: 'Khoa mới', type: 'lab' })

  await userEvent.clear(within(dialog).getByLabelText('Mã'))
  await userEvent.type(within(dialog).getByLabelText('Mã'), 'ok1')
  await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
  await vi.waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  expect(bodies[1]).toMatchObject({ code: 'OK1' })
})

it('deletes with deactivated notice', async () => {
  useAuthStore.getState().setSession(fakeSession(['HOSPITAL_ADMIN']))
  server.use(http.delete('/v1/departments/d1', () => HttpResponse.json({ deactivated: true })))
  renderWithProviders(<DepartmentsPage />, { route: '/admin/departments' })
  const row = (await screen.findByText('Khoa Xét nghiệm')).closest('tr')!
  await userEvent.click(within(row).getByRole('button', { name: 'Thao tác' }))
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Xoá' }))
  const success = vi.spyOn(toast, 'success')
  await userEvent.click(await screen.findByRole('button', { name: 'Xoá' }))
  await vi.waitFor(() =>
    expect(success).toHaveBeenCalledWith(expect.stringMatching(/ngừng hoạt động/)),
  )
})

it('edit sends only changed fields', async () => {
  useAuthStore.getState().setSession(fakeSession(['HOSPITAL_ADMIN']))
  let body: unknown
  server.use(
    http.patch('/v1/departments/d1', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json(dept({ name: 'Khoa XN mới' }))
    }),
  )
  renderWithProviders(<DepartmentsPage />, { route: '/admin/departments' })
  const row = (await screen.findByText('Khoa Xét nghiệm')).closest('tr')!
  await userEvent.click(within(row).getByRole('button', { name: 'Thao tác' }))
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Sửa' }))
  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getByLabelText('Mã')).toBeDisabled()
  await userEvent.clear(within(dialog).getByLabelText('Tên'))
  await userEvent.type(within(dialog).getByLabelText('Tên'), 'Khoa XN mới')
  await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
  await vi.waitFor(() => expect(body).toEqual({ name: 'Khoa XN mới' }))
})
