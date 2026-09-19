import { screen } from '@testing-library/react'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './AssistantPage'

it('shows disabled state when AI is off', async () => {
  useAuthStore.getState().setSession(fakeSession())
  renderWithProviders(<Component />)
  expect(await screen.findByText(/Chưa bật/)).toBeVisible()
})
