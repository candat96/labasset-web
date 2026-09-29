import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component as RequestsPage } from './RequestsPage'
import { Component as RequestFormPage } from './RequestFormPage'
import { Component as RecurringPage } from './RecurringPage'

const row = {
  id: 'q1',
  code: 'PYC-1',
  type: 'supply',
  status: 'submitted',
  departmentName: 'XN',
  requesterName: 'A',
  priority: 'normal',
  neededBy: null,
  quotaExceeded: false,
  itemCount: 1,
  createdAt: '2026-09-19T00:00:00Z',
}

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/requests', () =>
      HttpResponse.json({ items: [row], total: 1, page: 1, limit: 20 }),
    ),
    http.get('/v1/departments', () => HttpResponse.json({ items: [] })),
    http.get('/v1/equipment', () => HttpResponse.json({ items: [] })),
    http.get('/v1/supplies', () =>
      HttpResponse.json({
        items: [{ id: 's1', code: 'HC-01', name: 'Huyết thanh' }],
        total: 1,
        page: 1,
        limit: 20,
      }),
    ),
  )
})

it('lists requests', async () => {
  renderWithProviders(<RequestsPage />)
  expect(await screen.findByRole('link', { name: 'PYC-1' })).toHaveAttribute('href', '/requests/q1')
})

it('creates a draft request', async () => {
  const saved: unknown[] = []
  server.use(
    http.post('/v1/requests', async ({ request }) => {
      const body = (await request.json()) as {
        type?: string
        items?: { supplyId?: string; qtyRequested?: string }[]
      }
      // Phiếu vật tư phải có ít nhất 1 dòng hợp lệ (giống backend).
      if (
        !body.type ||
        (body.type === 'supply' &&
          (!body.items?.length || !body.items[0]?.supplyId || !body.items[0]?.qtyRequested))
      ) {
        return HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Thiếu dòng vật tư' },
          { status: 400 },
        )
      }
      saved.push(body)
      return HttpResponse.json({ id: 'q2', code: 'PYC-2' }, { status: 201 })
    }),
  )
  renderWithProviders(<RequestFormPage />, {
    path: '/requests/new',
    route: '/requests/new',
    routes: [{ path: '/requests/:id', element: <div>DETAIL</div> }],
  })
  await userEvent.type(screen.getByLabelText('Vật tư'), 'Huyết')
  await userEvent.click(await screen.findByRole('option', { name: /Huyết thanh/ }))
  const qty = screen.getByLabelText(/Số lượng/)
  await userEvent.clear(qty)
  await userEvent.type(qty, '2')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }))
  await waitFor(() =>
    expect(saved[0]).toMatchObject({
      type: 'supply',
      priority: 'normal',
      items: [{ supplyId: 's1', qtyRequested: '2' }],
    }),
  )
})

it('form tạo phiếu: nhãn mới, số lượng mặc định 0, thêm/xoá dòng', async () => {
  renderWithProviders(<RequestFormPage />, {
    path: '/requests/new',
    route: '/requests/new',
  })

  // Bốn nhãn mới của yêu cầu: Khoa / Máy / Mức độ / Hạn cần trước.
  expect(await screen.findByText(/^Khoa/, { selector: 'label' })).toBeInTheDocument()
  expect(screen.getByText(/^Máy/, { selector: 'label' })).toBeInTheDocument()
  expect(screen.getByText(/^Mức độ/, { selector: 'label' })).toBeInTheDocument()
  expect(screen.getByText(/^Hạn cần trước/, { selector: 'label' })).toBeInTheDocument()

  // Chưa chọn vật tư → số lượng mặc định 0 kèm gợi ý "Nhập".
  const qty = screen.getByLabelText(/Số lượng/) as HTMLInputElement
  expect(qty).toHaveValue('0')
  expect(qty).toHaveAttribute('placeholder', 'Nhập')

  // Bấm "Thêm dòng" → có thêm một dòng.
  await userEvent.click(screen.getByRole('button', { name: /Thêm dòng/ }))
  expect(screen.getAllByLabelText(/Số lượng/)).toHaveLength(2)

  // Bấm icon thùng rác → mất dòng tương ứng.
  await userEvent.click(screen.getByRole('button', { name: 'Xoá dòng 2' }))
  expect(screen.getAllByLabelText(/Số lượng/)).toHaveLength(1)
})

it('edits a draft request and validates the PATCH body', async () => {
  const patched: unknown[] = []
  server.use(
    http.get('/v1/requests/q1', () =>
      HttpResponse.json({
        ...row,
        departmentId: null,
        equipmentId: null,
        reason: null,
        items: [{ id: 'ri1', supplyId: 's1', qtyRequested: '1', note: null }],
      }),
    ),
    http.patch('/v1/requests/q1', async ({ request }) => {
      const body = (await request.json()) as { priority?: string; items?: unknown[] }
      if (body.priority !== 'urgent' || !body.items?.length)
        return HttpResponse.json({ code: 'VALIDATION_ERROR', message: 'Body sai' }, { status: 400 })
      patched.push(body)
      return HttpResponse.json({ ...row, priority: 'urgent' })
    }),
  )
  renderWithProviders(<RequestFormPage />, {
    path: '/requests/:id/edit',
    route: '/requests/q1/edit',
    routes: [{ path: '/requests/:id', element: <div>DETAIL</div> }],
  })
  await userEvent.click(await screen.findByLabelText(/Mức độ/))
  await userEvent.click(await screen.findByRole('option', { name: 'Khẩn' }))
  await userEvent.click(screen.getByRole('button', { name: 'Lưu nháp' }))
  await waitFor(() => expect(patched).toHaveLength(1))
})

it('creates a recurring request with validated items', async () => {
  const saved: unknown[] = []
  server.use(
    http.get('/v1/requests/recurring', () =>
      HttpResponse.json({ items: [], total: 0, page: 1, limit: 20 }),
    ),
    http.post('/v1/requests/recurring', async ({ request }) => {
      const body = (await request.json()) as {
        dayOfMonth?: number
        items?: Array<{ supplyId?: string; qty?: string }>
      }
      if (!body.dayOfMonth || !body.items?.[0]?.supplyId || !body.items[0].qty)
        return HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'Thiếu dòng' },
          { status: 400 },
        )
      saved.push(body)
      return HttpResponse.json({ id: 'rec1', ...body, isActive: true })
    }),
  )
  renderWithProviders(<RecurringPage />)
  await userEvent.click(await screen.findByRole('button', { name: 'Tạo định kỳ' }))
  await userEvent.type(screen.getByLabelText('Vật tư'), 'Huyết')
  await userEvent.click(await screen.findByRole('option', { name: /Huyết thanh/ }))
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(saved).toHaveLength(1))
}, 15_000)

it('hiện chip lọc đang áp khi panel thu và gọi API đúng tham số', async () => {
  localStorage.setItem('filter-panel:requests', '0')
  const urls: string[] = []
  server.use(
    http.get('/v1/requests', ({ request }) => {
      urls.push(request.url)
      return HttpResponse.json({ items: [row], total: 1, page: 1, limit: 20 })
    }),
  )
  renderWithProviders(<RequestsPage />, { route: '/?status=submitted' })
  expect(await screen.findByTestId('filter-panel-active-chips')).toHaveTextContent('Đã gửi')
  await waitFor(() => expect(urls.some((u) => u.includes('status=submitted'))).toBe(true))
  localStorage.removeItem('filter-panel:requests')
})

it('đổi bộ lọc trong panel gọi API với tham số mới', async () => {
  localStorage.setItem('filter-panel:requests', '1')
  const urls: string[] = []
  server.use(
    http.get('/v1/requests', ({ request }) => {
      urls.push(request.url)
      return HttpResponse.json({ items: [row], total: 1, page: 1, limit: 20 })
    }),
  )
  renderWithProviders(<RequestsPage />)
  await userEvent.click(await screen.findByLabelText('Loại'))
  await userEvent.click(await screen.findByRole('option', { name: 'Yêu cầu sửa chữa' }))
  await waitFor(() => expect(urls.some((u) => u.includes('type=repair'))).toBe(true))
  localStorage.removeItem('filter-panel:requests')
})
