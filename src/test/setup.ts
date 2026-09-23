import '@testing-library/jest-dom/vitest'
import { server } from './msw/server'
import { useAuthStore } from '@/stores/auth.store'
import { useSysAuthStore } from '@/stores/sys-auth.store'
import { useUiStore } from '@/stores/ui.store'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  useAuthStore.getState().logout()
  useSysAuthStore.getState().logout()
  useUiStore.setState({ tenantMode: null, hospitalName: null, notificationsPolling: false })
  localStorage.clear()
})
afterAll(() => server.close())

// Polyfill cho Radix trong jsdom.
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (!('ResizeObserver' in globalThis))
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = RO
if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {}
if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false
if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = () => {}
// jsdom không có createObjectURL — polyfill để test luồng tải/in tệp.
const urlWithBlob = URL as unknown as {
  createObjectURL?: (blob: Blob) => string
  revokeObjectURL?: (url: string) => void
}
if (!urlWithBlob.createObjectURL) {
  urlWithBlob.createObjectURL = () => 'blob:mock'
  urlWithBlob.revokeObjectURL = () => {}
}
if (!window.matchMedia) {
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}
