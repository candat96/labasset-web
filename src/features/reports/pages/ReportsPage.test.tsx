import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './ReportsPage'

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
