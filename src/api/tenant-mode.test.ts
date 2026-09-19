import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { resolveTenantMode } from './tenant-mode'
import { useUiStore } from '@/stores/ui.store'

it('reads mode from /health and caches', async () => {
  let calls = 0
  server.use(
    http.get('/health', () => {
      calls++
      return HttpResponse.json({ status: 'ok', mode: 'single' })
    }),
  )
  expect(await resolveTenantMode()).toBe('single')
  expect(await resolveTenantMode()).toBe('single')
  expect(calls).toBe(1)
  expect(useUiStore.getState().tenantMode).toBe('single')
})

it('defaults to multi when health fails', async () => {
  server.use(http.get('/health', () => HttpResponse.error()))
  expect(await resolveTenantMode()).toBe('multi')
})
