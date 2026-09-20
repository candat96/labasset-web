import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { detail, validationError } from './fixtures'
import { Component } from './EquipmentFormPage'

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/departments', () =>
      HttpResponse.json({ items: [{ id: 'd1', code: 'HH', name: 'Huyết học' }] }),
    ),
    http.get('/v1/catalogs/:name', () => HttpResponse.json([])),
    http.get('/v1/users', () => HttpResponse.json({ items: [], total: 0, page: 1, limit: 50 })),
    http.get('/v1/attachments', () => HttpResponse.json([])),
  )
})

const formRoutes = [{ path: '/equipment/:id', element: <div>DETAIL</div> }]

it('tạo máy: bắt buộc tên + khoa, gửi body hợp lệ', async () => {
  const saved: Record<string, unknown>[] = []
  server.use(
    http.post('/v1/equipment', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>
      if (typeof body.name !== 'string' || !body.name)
        return validationError('name must not be empty')
      if (typeof body.departmentId !== 'string' || !body.departmentId)
        return validationError('departmentId must be a UUID')
      saved.push(body)
      return HttpResponse.json(
        { id: 'e2', code: 'TB-2026-00002', name: body.name },
        { status: 201 },
      )
    }),
  )
  renderWithProviders(<Component />, {
    path: '/equipment/new',
    route: '/equipment/new',
    routes: formRoutes,
  })
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  expect(await screen.findByText('Bắt buộc')).toBeVisible()
  await userEvent.type(screen.getByLabelText('Tên'), 'Máy mới')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(saved.length).toBe(0))
  await userEvent.click(screen.getByRole('combobox', { name: 'Khoa' }))
  await userEvent.click(await screen.findByText('HH — Huyết học'))
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(saved.length).toBe(1))
  expect(saved[0]).toMatchObject({ name: 'Máy mới', departmentId: 'd1' })
  expect(saved[0]).not.toHaveProperty('code')
})

it('gắn lỗi trùng serial vào field', async () => {
  server.use(
    http.post('/v1/equipment', async ({ request }) => {
      const body = (await request.json()) as { name?: string; serial?: string }
      if (typeof body.name !== 'string' || !body.name)
        return validationError('name must not be empty')
      if (body.serial === 'DUP')
        return HttpResponse.json(
          { code: 'EQUIPMENT_SERIAL_TAKEN', message: 'taken' },
          { status: 409 },
        )
      return HttpResponse.json(
        { id: 'e2', code: 'TB-2026-00002', name: body.name },
        { status: 201 },
      )
    }),
  )
  renderWithProviders(<Component />, {
    path: '/equipment/new',
    route: '/equipment/new',
    routes: formRoutes,
  })
  await userEvent.type(screen.getByLabelText('Tên'), 'Máy mới')
  await userEvent.click(screen.getByRole('combobox', { name: 'Khoa' }))
  await userEvent.click(await screen.findByText('HH — Huyết học'))
  await userEvent.type(screen.getByLabelText('Serial'), 'DUP')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  expect(await screen.findByText('Số serial đã tồn tại')).toBeVisible()
})

it('sửa máy: khoá mã máy và không gửi code/departmentId', async () => {
  const bodies: Record<string, unknown>[] = []
  server.use(
    http.get('/v1/equipment/e1', () => HttpResponse.json(detail)),
    http.patch('/v1/equipment/e1', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>
      bodies.push(body)
      if ('code' in body || 'departmentId' in body)
        return validationError('code/departmentId không được sửa')
      if ('name' in body && (typeof body.name !== 'string' || !body.name))
        return validationError('name must not be empty')
      return HttpResponse.json(detail)
    }),
  )
  renderWithProviders(<Component />, {
    path: '/equipment/:id/edit',
    route: '/equipment/e1/edit',
    routes: formRoutes,
  })
  const codeInput = await screen.findByLabelText('Mã máy')
  expect(codeInput).toBeDisabled()
  expect(screen.queryByRole('combobox', { name: 'Khoa' })).not.toBeInTheDocument()
  await userEvent.clear(screen.getByLabelText('Nguyên giá'))
  await userEvent.type(screen.getByLabelText('Nguyên giá'), '2500000')
  expect(screen.getByLabelText('Nguyên giá')).toHaveValue('2500000')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(bodies.length).toBe(1))
  expect(bodies[0]).toMatchObject({ originalValue: '2500000' })
  expect(bodies[0]).not.toHaveProperty('code')
  expect(bodies[0]).not.toHaveProperty('departmentId')
  expect(await screen.findByText('Đã lưu máy')).toBeVisible()
  expect(await screen.findByText('DETAIL')).toBeVisible()
})

it('nguyên giá phải là chuỗi số nguyên', async () => {
  const patches: unknown[] = []
  server.use(
    http.get('/v1/equipment/e1', () => HttpResponse.json(detail)),
    http.patch('/v1/equipment/e1', async ({ request }) => {
      patches.push(await request.json())
      return HttpResponse.json(detail)
    }),
  )
  renderWithProviders(<Component />, {
    path: '/equipment/:id/edit',
    route: '/equipment/e1/edit',
    routes: formRoutes,
  })
  await userEvent.clear(await screen.findByLabelText('Nguyên giá'))
  await userEvent.type(screen.getByLabelText('Nguyên giá'), '12.5')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  expect(await screen.findByText('Số không hợp lệ')).toBeVisible()
  expect(patches.length).toBe(0)
})
