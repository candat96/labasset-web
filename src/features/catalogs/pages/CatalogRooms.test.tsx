import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { Component } from './CatalogPage'

const departments = [
  { id: 'd1', code: 'XN', name: 'Khoa Xét nghiệm' },
  { id: 'd2', code: 'CNTT', name: 'Phòng CNTT' },
]
const rooms = [
  {
    id: 'r1',
    code: 'XN-P101',
    name: 'Phòng Huyết học',
    description: null,
    isActive: true,
    sortOrder: 0,
    departmentId: 'd1',
    departmentCode: 'XN',
    building: 'Nhà A',
    floor: 'Tầng 1',
    roomType: 'lab',
  },
  {
    id: 'r2',
    code: 'HT-01',
    name: 'Hội trường',
    description: null,
    isActive: true,
    sortOrder: 0,
    departmentId: null,
    departmentCode: null,
    building: null,
    floor: null,
    roomType: 'other',
  },
]

function mockDepartments() {
  server.use(
    http.get('/v1/departments', () => HttpResponse.json(departments)),
    http.get('/v1/departments/:id', ({ params }) =>
      HttpResponse.json(departments.find((d) => d.id === params.id) ?? null),
    ),
  )
}

it('hiện danh mục Phòng: tên khoa, "Dùng chung", Toà/Tầng, loại phòng và lọc theo khoa', async () => {
  const urls: string[] = []
  mockDepartments()
  server.use(
    http.get('/v1/catalogs/rooms', ({ request }) => {
      urls.push(request.url)
      return HttpResponse.json({ items: rooms, total: 2, page: 1, limit: 20 })
    }),
  )
  const { router } = renderWithProviders(<Component />, {
    path: '/admin/catalogs/:name',
    route: '/admin/catalogs/rooms',
  })
  expect(await screen.findByText('Phòng Huyết học')).toBeVisible()
  expect(await screen.findByText('Khoa Xét nghiệm')).toBeVisible()
  expect(screen.getByText('Dùng chung')).toBeVisible()
  expect(screen.getByText('Nhà A / Tầng 1')).toBeVisible()
  expect(screen.getByText('Phòng xét nghiệm')).toBeVisible()
  expect(screen.getByRole('columnheader', { name: 'Khoa/Phòng ban' })).toBeVisible()
  expect(screen.getByRole('columnheader', { name: 'Toà/Tầng' })).toBeVisible()
  // không lộ enum thô
  expect(screen.queryByText('lab')).not.toBeInTheDocument()

  await userEvent.click(screen.getByRole('combobox', { name: 'Lọc Khoa/Phòng ban' }))
  await userEvent.click(await screen.findByRole('option', { name: /Khoa Xét nghiệm/ }))
  await waitFor(() => expect(urls.some((url) => url.includes('departmentId=d1'))).toBe(true))
  expect(router.state.location.search).toContain('departmentId=d1')
})

it('tạo phòng: gửi đúng body (departmentId, building, floor, roomType); "Dùng chung" gửi null', async () => {
  const bodies: Record<string, unknown>[] = []
  mockDepartments()
  server.use(
    http.get('/v1/catalogs/rooms', () =>
      HttpResponse.json({ items: [], total: 0, page: 1, limit: 20 }),
    ),
    http.post('/v1/catalogs/rooms', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>
      bodies.push(body)
      return HttpResponse.json({ ...rooms[0], ...body, id: 'r9' }, { status: 201 })
    }),
  )
  renderWithProviders(<Component />, {
    path: '/admin/catalogs/:name',
    route: '/admin/catalogs/rooms',
  })
  await userEvent.click(await screen.findByRole('button', { name: 'Thêm mới' }))
  const dialog = within(screen.getByRole('dialog'))
  expect(dialog.getByRole('combobox', { name: 'Khoa/Phòng ban' })).toHaveTextContent('Dùng chung')
  await userEvent.type(dialog.getByLabelText('Mã'), 'xn-p102')
  await userEvent.type(dialog.getByLabelText('Tên'), 'Phòng Sinh hoá')
  await userEvent.click(dialog.getByRole('combobox', { name: 'Khoa/Phòng ban' }))
  await userEvent.click(await screen.findByRole('option', { name: /Khoa Xét nghiệm/ }))
  await userEvent.type(dialog.getByLabelText('Toà nhà'), 'Nhà B')
  await userEvent.type(dialog.getByLabelText('Tầng'), 'Tầng 2')
  await userEvent.click(dialog.getByRole('combobox', { name: 'Loại phòng' }))
  await userEvent.click(await screen.findByRole('option', { name: 'Phòng xét nghiệm' }))
  await userEvent.click(dialog.getByRole('button', { name: 'Lưu' }))
  await waitFor(() =>
    expect(bodies[0]).toMatchObject({
      code: 'XN-P102',
      name: 'Phòng Sinh hoá',
      departmentId: 'd1',
      building: 'Nhà B',
      floor: 'Tầng 2',
      roomType: 'lab',
    }),
  )
  expect(await screen.findByText('Đã lưu danh mục')).toBeVisible()

  // phòng dùng chung: không chọn khoa → departmentId null
  await userEvent.click(await screen.findByRole('button', { name: 'Thêm mới' }))
  const dialog2 = within(screen.getByRole('dialog'))
  await userEvent.type(dialog2.getByLabelText('Mã'), 'HT-02')
  await userEvent.type(dialog2.getByLabelText('Tên'), 'Hội trường B')
  await userEvent.click(dialog2.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(bodies[1]).toMatchObject({ code: 'HT-02', departmentId: null }))
})

it('sửa phòng gửi diff; xoá bị 409 ROOM_IN_USE báo gợi ý tắt kích hoạt', async () => {
  const patches: Record<string, unknown>[] = []
  mockDepartments()
  server.use(
    http.get('/v1/catalogs/rooms', () =>
      HttpResponse.json({ items: [rooms[0]], total: 1, page: 1, limit: 20 }),
    ),
    http.patch('/v1/catalogs/rooms/r1', async ({ request }) => {
      const body = (await request.json()) as Record<string, unknown>
      patches.push(body)
      return HttpResponse.json({ ...rooms[0], ...body })
    }),
    http.delete('/v1/catalogs/rooms/r1', () =>
      HttpResponse.json({ code: 'ROOM_IN_USE', message: 'in use' }, { status: 409 }),
    ),
  )
  renderWithProviders(<Component />, {
    path: '/admin/catalogs/:name',
    route: '/admin/catalogs/rooms',
  })
  await userEvent.click(await screen.findByRole('button', { name: 'Sửa' }))
  const dialog = within(screen.getByRole('dialog'))
  await userEvent.clear(dialog.getByLabelText('Tầng'))
  await userEvent.type(dialog.getByLabelText('Tầng'), 'Tầng 3')
  await userEvent.click(dialog.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(patches[0]).toEqual({ floor: 'Tầng 3' }))

  await userEvent.click(await screen.findByRole('button', { name: 'Xoá' }))
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
  expect(await screen.findByText(/Phòng đang có máy nên không xoá được/)).toBeVisible()
})
