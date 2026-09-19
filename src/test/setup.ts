import '@testing-library/jest-dom/vitest'
import { server } from './msw/server'
import { useAuthStore } from '@/stores/auth.store'
import { useUiStore } from '@/stores/ui.store'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  useAuthStore.getState().logout()
  useUiStore.setState({ tenantMode: null, hospitalName: null, notificationsPolling: false })
  localStorage.clear()
})
afterAll(() => server.close())
