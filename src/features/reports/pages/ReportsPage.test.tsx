import { screen } from '@testing-library/react'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './ReportsPage'

it('lists contracted reports', async () => {
  useAuthStore.getState().setSession(fakeSession())
  renderWithProviders(<Component />)
  expect(await screen.findByText('Hiện trạng thiết bị')).toBeVisible()
})
