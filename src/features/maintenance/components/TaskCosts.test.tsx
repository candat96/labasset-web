import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { TaskCosts } from './TaskCosts'

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
})

it('nhiều khoản chi phí: hiện từng khoản và cộng ra tổng', async () => {
  server.use(
    http.get('/v1/maintenance/tasks/:id/costs', () =>
      HttpResponse.json([
        {
          id: 'c1',
          taskId: 't1',
          category: 'labor',
          description: 'Công kỹ thuật viên',
          amount: '1500000',
          invoiceNo: 'HD-01',
        },
        {
          id: 'c2',
          taskId: 't1',
          category: 'parts',
          description: 'Bộ lọc khí',
          amount: '2500000',
          invoiceNo: null,
        },
      ]),
    ),
  )
  renderWithProviders(<TaskCosts taskId="t1" canWrite />)

  await waitFor(() => expect(screen.getByText('Công kỹ thuật viên')).toBeVisible())
  expect(screen.getByText('HD-01')).toBeVisible()
  expect(screen.getByText('1.500.000 ₫')).toBeVisible()
  expect(screen.getByText('4.000.000 ₫')).toBeVisible()
})

it('chưa ghi chi phí nào thì nói rõ', async () => {
  server.use(http.get('/v1/maintenance/tasks/:id/costs', () => HttpResponse.json([])))
  renderWithProviders(<TaskCosts taskId="t1" canWrite />)
  await waitFor(() => expect(screen.getByText(/chưa ghi chi phí/i)).toBeVisible())
})

it('không có quyền sửa thì không có nút thêm hay xoá', async () => {
  server.use(
    http.get('/v1/maintenance/tasks/:id/costs', () =>
      HttpResponse.json([
        {
          id: 'c1',
          taskId: 't1',
          category: 'other',
          description: 'Phí vận chuyển máy',
          amount: '1000',
        },
      ]),
    ),
  )
  renderWithProviders(<TaskCosts taskId="t1" canWrite={false} />)
  await waitFor(() => expect(screen.getByText('Phí vận chuyển máy')).toBeVisible())
  expect(screen.queryByRole('button', { name: /thêm chi phí/i })).toBeNull()
  expect(screen.queryByRole('button', { name: /xoá khoản chi phí/i })).toBeNull()
})

it('thêm một khoản: gửi đúng số tiền dạng chuỗi nguyên', async () => {
  let sent: unknown
  const rows: Record<string, unknown>[] = []
  server.use(
    http.get('/v1/maintenance/tasks/:id/costs', () => HttpResponse.json(rows)),
    http.post('/v1/maintenance/tasks/:id/costs', async ({ request }) => {
      sent = await request.json()
      rows.push({ id: 'c9', taskId: 't1', ...(sent as object) })
      return HttpResponse.json(rows[0])
    }),
  )
  renderWithProviders(<TaskCosts taskId="t1" canWrite />)

  await userEvent.click(await screen.findByRole('button', { name: /thêm chi phí/i }))
  await userEvent.type(await screen.findByLabelText(/nội dung/i), 'Thuê hãng bảo dưỡng')
  await userEvent.type(screen.getByLabelText(/số tiền/i), '7200000')
  await userEvent.click(screen.getByRole('button', { name: /^lưu$/i }))

  await waitFor(() =>
    expect(sent).toEqual({
      category: 'service',
      description: 'Thuê hãng bảo dưỡng',
      amount: '7200000',
      invoiceNo: null,
    }),
  )
})
