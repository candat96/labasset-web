import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import type { SaveSigningProfileBody } from '../api'
import { Component } from './SigningProfilePage'

const profile = {
  userId: 'u1',
  providerKey: 'intrust',
  username: 'ICA.0108357319',
  credentialId: 'c1',
  certSerial: '123456',
  certSubject: 'CN=Nguyễn Văn A',
  certValidFrom: '2025-01-01T00:00:00Z',
  certValidTo: '2027-01-01T00:00:00Z',
  sessionExpiresAt: null,
  rememberPin: true,
  expiringSoon: false,
  passwordSet: true,
  pinSet: true,
}

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/me/signing-profile', () => HttpResponse.json({ profile, configured: true })),
  )
})

it('tắt "Nhớ mã PIN" thì gửi rememberPin: false', async () => {
  const captured: { body?: SaveSigningProfileBody } = {}
  server.use(
    http.put('/v1/me/signing-profile', async ({ request }) => {
      captured.body = (await request.json()) as SaveSigningProfileBody
      return HttpResponse.json(profile)
    }),
  )
  renderWithProviders(<Component />, { route: '/settings/signing', path: '/settings/signing' })

  const toggle = await screen.findByRole('switch', { name: 'Nhớ mã PIN trên máy chủ' })
  await waitFor(() => expect(toggle).toBeChecked())
  await userEvent.click(toggle)
  expect(toggle).not.toBeChecked()
  expect(screen.getByText('Mỗi lần ký sẽ phải nhập PIN.')).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: 'Lưu cài đặt' }))
  await waitFor(() => expect(captured.body).toBeDefined())
  expect(captured.body).toMatchObject({ rememberPin: false, username: 'ICA.0108357319' })
  expect(captured.body?.pin).toBeUndefined()
})

it('cảnh báo đỏ khi chứng thư đã hết hạn', async () => {
  server.use(
    http.get('/v1/me/signing-profile', () =>
      HttpResponse.json({
        profile: { ...profile, certValidTo: '2020-01-01T00:00:00Z' },
        configured: true,
      }),
    ),
  )
  renderWithProviders(<Component />, { route: '/settings/signing', path: '/settings/signing' })
  expect(await screen.findByText('Chứng thư đã hết hạn')).toBeInTheDocument()
})
