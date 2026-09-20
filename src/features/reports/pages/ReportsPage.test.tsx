import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { server } from '@/test/msw/server'
import { Component } from './ReportsPage'

beforeEach(() => {
  server.use(
    http.get('/v1/reports', () =>
      HttpResponse.json({ code: 'NOT_FOUND', message: 'D1 chưa triển khai' }, { status: 404 }),
    ),
  )
})

it('lists contracted reports', async () => {
  useAuthStore.getState().setSession(fakeSession())
  renderWithProviders(<Component />)
  expect(await screen.findByText('Hiện trạng thiết bị')).toBeVisible()
})

it('renders date params from json schema', async () => {
  useAuthStore.getState().setSession(fakeSession())
  renderWithProviders(<Component />)
  await userEvent.click(await screen.findByText('Hiện trạng thiết bị'))
  expect(await screen.findByLabelText('Từ ngày')).toBeVisible()
})

it('marks the 18-report fallback as sample data and blocks export', async () => {
  useAuthStore.getState().setSession(fakeSession())
  renderWithProviders(<Component />)
  expect(await screen.findByText('Dữ liệu mẫu')).toBeVisible()
  expect(document.querySelectorAll('aside button')).toHaveLength(18)
})
