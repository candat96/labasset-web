import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './EquipmentFormPage'

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/departments', () => HttpResponse.json({ items: [] })),
    http.get('/v1/catalogs/:name', () => HttpResponse.json([])),
    http.get('/v1/users', () => HttpResponse.json({ items: [], total: 0 })),
  )
})

it('validates name and attaches serial conflict to the field', async () => {
  const saved: unknown[] = []
  server.use(
    http.post('/v1/equipment', async ({ request }) => {
      const body = (await request.json()) as { serial?: string; name: string }
      saved.push(body)
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
    routes: [{ path: '/equipment/:id', element: <div>DETAIL</div> }],
  })
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  expect(await screen.findByText('Bắt buộc')).toBeVisible()
  await userEvent.type(screen.getByLabelText('Tên'), 'Máy mới')
  await userEvent.type(screen.getByLabelText('Serial'), 'DUP')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  expect(await screen.findByText('Số serial đã tồn tại')).toBeVisible()
  await userEvent.clear(screen.getByLabelText('Serial'))
  await userEvent.type(screen.getByLabelText('Serial'), 'OK1')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(saved.at(-1)).toMatchObject({ name: 'Máy mới', serial: 'OK1' }))
})
