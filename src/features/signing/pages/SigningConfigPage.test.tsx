import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import type { SaveSigningConfigBody } from '../api'
import { Component } from './SigningConfigPage'

const config = {
  providerKey: 'intrust',
  baseUrl: 'https://rmsapi.intrustdss.vn/Api/rms',
  username: 'hosp',
  enabled: true,
  passwordSet: true,
}

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(http.get('/v1/signing/config', () => HttpResponse.json(config)))
})

it('để trống mật khẩu thì gửi lên không có trường password', async () => {
  const captured: { body?: SaveSigningConfigBody } = {}
  server.use(
    http.put('/v1/signing/config', async ({ request }) => {
      captured.body = (await request.json()) as SaveSigningConfigBody
      return HttpResponse.json(config)
    }),
  )
  renderWithProviders(<Component />, { route: '/admin/signing', path: '/admin/signing' })

  expect(await screen.findByText('Để trống để giữ nguyên mật khẩu đã lưu.')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Lưu cấu hình' }))
  await waitFor(() => expect(captured.body).toBeDefined())
  expect(captured.body).toMatchObject({ username: 'hosp', enabled: true })
  expect('password' in (captured.body ?? {})).toBe(false)
})
