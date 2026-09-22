import { screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { Component } from './CatalogPage'
import { Component as CatalogsIndexPage } from './CatalogsIndexPage'

const row = {
  id: 'c1',
  code: 'NSX',
  name: 'Hãng A',
  description: null,
  country: 'Việt Nam',
  website: null,
  isActive: true,
  sortOrder: 0,
}

it('renders a configured catalog and keeps list filters in the URL', async () => {
  const urls: string[] = []
  server.use(
    http.get('/v1/catalogs/manufacturers', ({ request }) => {
      urls.push(request.url)
      return HttpResponse.json({ items: [row], total: 1, page: 1, limit: 20 })
    }),
  )
  const { router } = renderWithProviders(<Component />, {
    path: '/admin/catalogs/:name',
    route: '/admin/catalogs/manufacturers',
  })
  expect(await screen.findByText('Hãng A')).toBeVisible()
  expect(screen.getByText('Việt Nam')).toBeVisible()
  await userEvent.type(screen.getByLabelText('Tìm danh mục'), 'abc')
  await waitFor(() => expect(urls.some((url) => url.includes('q=abc'))).toBe(true))
  expect(router.state.location.search).toContain('q=abc')
})

it('tạo mới không nhập Mã: body bỏ code, server tự sinh và toast hiển thị mã', async () => {
  const bodies: Record<string, unknown>[] = []
  server.use(
    http.get('/v1/catalogs/manufacturers', () =>
      HttpResponse.json({ items: [], total: 0, page: 1, limit: 20 }),
    ),
    http.post('/v1/catalogs/manufacturers', async ({ request }) => {
      bodies.push((await request.json()) as Record<string, unknown>)
      return HttpResponse.json({ ...row, code: 'NSX-0001' }, { status: 201 })
    }),
  )
  renderWithProviders(<Component />, {
    path: '/admin/catalogs/:name',
    route: '/admin/catalogs/manufacturers',
  })
  await userEvent.click(await screen.findByRole('button', { name: 'Thêm mới' }))
  const dialog = within(screen.getByRole('dialog'))
  expect(dialog.getByLabelText('Mã')).toHaveAttribute(
    'placeholder',
    'Để trống sẽ tự sinh (vd NSX-0001)',
  )
  await userEvent.type(dialog.getByLabelText('Tên'), 'Hãng B')
  await userEvent.click(dialog.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(bodies[0]).not.toHaveProperty('code'))
  expect(await screen.findByText('Đã tạo Hãng sản xuất — mã NSX-0001')).toBeVisible()
})

it('creates with schema validation and attaches API field errors', async () => {
  const bodies: unknown[] = []
  server.use(
    http.get('/v1/catalogs/manufacturers', () =>
      HttpResponse.json({ items: [], total: 0, page: 1, limit: 20 }),
    ),
    http.post('/v1/catalogs/manufacturers', async ({ request }) => {
      const body = (await request.json()) as { code: string }
      bodies.push(body)
      if (body.code === 'DUP')
        return HttpResponse.json(
          { code: 'VALIDATION_ERROR', details: ['code đã tồn tại'] },
          { status: 400 },
        )
      return HttpResponse.json({ ...row, ...body }, { status: 201 })
    }),
  )
  renderWithProviders(<Component />, {
    path: '/admin/catalogs/:name',
    route: '/admin/catalogs/manufacturers',
  })
  await userEvent.click(await screen.findByRole('button', { name: 'Thêm mới' }))
  const dialog = within(screen.getByRole('dialog'))
  await userEvent.click(dialog.getByRole('button', { name: 'Lưu' }))
  expect((await dialog.findAllByText(/Bắt buộc|Mã chỉ gồm/)).length).toBeGreaterThan(0)
  await userEvent.type(dialog.getByLabelText('Mã'), 'dup')
  await userEvent.type(dialog.getByLabelText('Tên'), 'Hãng A')
  await userEvent.click(dialog.getByRole('button', { name: 'Lưu' }))
  expect(await dialog.findByText('code đã tồn tại')).toBeVisible()
  await userEvent.clear(dialog.getByLabelText('Mã'))
  await userEvent.type(dialog.getByLabelText('Mã'), 'ok')
  await userEvent.click(dialog.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(bodies[1]).toMatchObject({ code: 'OK', name: 'Hãng A' }))
})

it('imports Excel and displays errors by row', async () => {
  server.use(
    http.get('/v1/catalogs/units', () =>
      HttpResponse.json({ items: [], total: 0, page: 1, limit: 20 }),
    ),
    http.post('/v1/catalogs/units/import', () =>
      HttpResponse.json({
        created: 1,
        updated: 2,
        errors: [{ row: 4, field: 'code', message: 'Mã trùng' }],
      }),
    ),
  )
  renderWithProviders(<Component />, {
    path: '/admin/catalogs/:name',
    route: '/admin/catalogs/units',
  })
  await userEvent.click(await screen.findByRole('button', { name: 'Nhập Excel' }))
  const dialog = within(screen.getByRole('dialog'))
  await userEvent.upload(
    dialog.getByLabelText('Tệp Excel'),
    new File(['xlsx'], 'units.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
  )
  await userEvent.click(dialog.getByRole('button', { name: 'Nhập Excel' }))
  expect(await dialog.findByText('Mã trùng')).toBeVisible()
  expect(dialog.getByText('4')).toBeVisible()
  expect(dialog.getByText(/Tạo mới: 1/)).toBeVisible()
})

it('shows deactivated notice when delete keeps the row', async () => {
  server.use(
    http.get('/v1/catalogs/manufacturers', () =>
      HttpResponse.json({ items: [row], total: 1, page: 1, limit: 20 }),
    ),
    http.delete('/v1/catalogs/manufacturers/c1', () => HttpResponse.json({ deactivated: true })),
  )
  renderWithProviders(<Component />, {
    path: '/admin/catalogs/:name',
    route: '/admin/catalogs/manufacturers',
  })
  await userEvent.click(await screen.findByRole('button', { name: 'Xoá' }))
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
  expect(await screen.findByText('Đã ngừng hoạt động danh mục')).toBeVisible()
})

it('renders the catalogs index with 11 links', async () => {
  server.use(http.get('/v1/catalogs/:name', () => HttpResponse.json({ items: [], total: 0 })))
  renderWithProviders(<CatalogsIndexPage />)
  expect(await screen.findByRole('link', { name: /Hãng sản xuất/ })).toHaveAttribute(
    'href',
    '/admin/catalogs/manufacturers',
  )
  expect(screen.getAllByRole('link').length).toBeGreaterThanOrEqual(11)
})
