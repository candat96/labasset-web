import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders } from '@/test/utils'
import { AssignDialog } from './AssignDialog'

const users = [
  { id: 'u1', username: 'a', fullName: 'Nguyễn Văn A' },
  { id: 'u2', username: 'b', fullName: 'Trần Thị B' },
]

beforeEach(() => {
  server.use(
    http.get('/v1/users', () => HttpResponse.json({ items: users })),
    http.get('/v1/repairs/assign/suggest', () =>
      HttpResponse.json([{ id: 'u1', fullName: 'Nguyễn Văn A', openTickets: 3 }]),
    ),
  )
})

const open = () =>
  renderWithProviders(<AssignDialog id="r1" equipmentId="e1" onClose={vi.fn()} onDone={vi.fn()} />)

it('số phiếu đang xử lý hiện ngay trong danh sách chọn, không bày riêng bên ngoài', async () => {
  open()
  await userEvent.click(await screen.findByRole('combobox', { name: /người xử lý chính/i }))

  await waitFor(() =>
    expect(
      screen.getAllByRole('option', { name: /Nguyễn Văn A — 3 phiếu đang xử lý/ })[0],
    ).toBeVisible(),
  )
})

it('người đã chọn làm xử lý chính thì không còn trong danh sách xử lý phụ', async () => {
  open()
  await userEvent.click(await screen.findByRole('combobox', { name: /người xử lý chính/i }))
  await userEvent.click(await screen.findByRole('option', { name: /Nguyễn Văn A/ }))

  await userEvent.click(screen.getByRole('combobox', { name: /người phụ/i }))
  await waitFor(() => expect(screen.getByRole('option', { name: /Trần Thị B/ })).toBeVisible())
  // Chọn trùng thì server không lưu; chặn ngay lúc chọn tốt hơn báo lỗi sau khi bấm lưu.
  expect(screen.queryByRole('option', { name: /Nguyễn Văn A/ })).not.toBeInTheDocument()
})
