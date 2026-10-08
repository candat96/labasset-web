import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './pages/RequestFormPage'

beforeEach(() => useAuthStore.getState().setSession(fakeSession()))

it('đổi loại phiếu thì xoá lý do của loại cũ (bảng lỗi 2026-10-07, mục #14)', async () => {
  renderWithProviders(<Component />, { route: '/requests/new' })
  const reason = await screen.findByLabelText(/Lý do/i)
  await userEvent.type(reason, 'Cần hoá chất xét nghiệm')
  expect(reason).toHaveValue('Cần hoá chất xét nghiệm')

  await userEvent.click(screen.getByRole('button', { name: /sửa chữa/i }))
  await waitFor(() => expect(screen.getByLabelText(/Lý do/i)).toHaveValue(''))
})
