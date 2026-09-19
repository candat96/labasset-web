import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { Component as ChangePasswordPage } from './ChangePasswordPage'
import { useAuthStore } from '@/stores/auth.store'

beforeEach(() => useAuthStore.getState().setSession(fakeSession()))

it('validates mismatch and weak password', async () => {
  renderWithProviders(<ChangePasswordPage />)
  await userEvent.type(screen.getByLabelText('Mật khẩu hiện tại'), 'old')
  await userEvent.type(screen.getByLabelText('Mật khẩu mới'), 'abcdefgh')
  await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'abcdefg1')
  await userEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }))
  expect(await screen.findByText('Tối thiểu 8 ký tự, có chữ và số')).toBeInTheDocument()
})

it('logs out after successful change', async () => {
  server.use(http.post('/v1/auth/change-password', () => new HttpResponse(null, { status: 204 })))
  renderWithProviders(<ChangePasswordPage />)
  await userEvent.type(screen.getByLabelText('Mật khẩu hiện tại'), 'old')
  await userEvent.type(screen.getByLabelText('Mật khẩu mới'), 'abcdefg1')
  await userEvent.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'abcdefg1')
  await userEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }))
  await vi.waitFor(() => expect(useAuthStore.getState().accessToken).toBeNull())
  expect(useAuthStore.getState().lastLogoutReason).toBe('password-changed')
})
