import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { api, unwrap, unwrapAs } from './client'
import { useAuthStore } from '@/stores/auth.store'
import { useSysAuthStore } from '@/stores/sys-auth.store'
import { ApiError } from './errors'

const user = {
  id: 'u',
  username: 'admin',
  fullName: 'A',
  email: null,
  phone: null,
  departmentId: null,
  departmentName: null,
  isActive: true,
  lastLoginAt: null,
  roles: ['HOSPITAL_ADMIN'],
  mustChangePassword: false,
  otpEnabled: false,
}
const session = { accessToken: 'A1', refreshToken: 'R1', tenantId: 'T1', user }
const unauthorized = () => HttpResponse.json({ code: 'UNAUTHORIZED', message: '' }, { status: 401 })
const meIfA2 = ({ request }: { request: Request }) =>
  request.headers.get('authorization') === 'Bearer A2' ? HttpResponse.json(user) : unauthorized()

beforeEach(() => useAuthStore.getState().setSession(session))

it('attaches bearer + tenant header', async () => {
  let seen: Headers | undefined
  server.use(
    http.get('/v1/auth/me', ({ request }) => {
      seen = request.headers
      return HttpResponse.json(user)
    }),
  )
  await unwrap(api.GET('/v1/auth/me'))
  expect(seen?.get('authorization')).toBe('Bearer A1')
  expect(seen?.get('x-tenant-id')).toBe('T1')
})

it('does not attach auth on public paths', async () => {
  let seen: Headers | undefined
  server.use(
    http.post('/v1/auth/login', ({ request }) => {
      seen = request.headers
      return HttpResponse.json(session)
    }),
  )
  await unwrap(api.POST('/v1/auth/login', { body: { username: 'a', password: 'b' } }))
  expect(seen?.get('authorization')).toBeNull()
})

it('on 401 refreshes once (rotating) and retries', async () => {
  let calls = 0
  server.use(
    http.get('/v1/auth/me', meIfA2),
    http.post('/v1/auth/refresh', async ({ request }) => {
      calls++
      const b = (await request.json()) as { refreshToken: string }
      expect(b.refreshToken).toBe('R1')
      return HttpResponse.json({ ...session, accessToken: 'A2', refreshToken: 'R2' })
    }),
  )
  const me = await unwrap(api.GET('/v1/auth/me'))
  expect(me.username).toBe('admin')
  expect(calls).toBe(1)
  expect(useAuthStore.getState().refreshToken).toBe('R2')
})

it('retries POST with its body after refresh', async () => {
  let received: unknown
  server.use(
    http.post('/v1/departments', async ({ request }) => {
      if (request.headers.get('authorization') !== 'Bearer A2') return unauthorized()
      received = await request.json()
      return HttpResponse.json({ id: 'd1' }, { status: 201 })
    }),
    http.post('/v1/auth/refresh', () =>
      HttpResponse.json({ ...session, accessToken: 'A2', refreshToken: 'R2' }),
    ),
  )
  await unwrap(api.POST('/v1/departments', { body: { code: 'XN', name: 'Khoa', type: 'lab' } }))
  expect(received).toEqual({ code: 'XN', name: 'Khoa', type: 'lab' })
})

it('concurrent 401s share one refresh', async () => {
  let calls = 0
  server.use(
    http.get('/v1/auth/me', meIfA2),
    http.post('/v1/auth/refresh', () => {
      calls++
      return HttpResponse.json({ ...session, accessToken: 'A2', refreshToken: 'R2' })
    }),
  )
  await Promise.all([
    unwrap(api.GET('/v1/auth/me')),
    unwrap(api.GET('/v1/auth/me')),
    unwrap(api.GET('/v1/auth/me')),
  ])
  expect(calls).toBe(1)
})

it('refresh failure logs out with reason expired', async () => {
  server.use(
    http.get('/v1/auth/me', unauthorized),
    http.post('/v1/auth/refresh', () =>
      HttpResponse.json({ code: 'UNAUTHORIZED', message: 'revoked' }, { status: 401 }),
    ),
  )
  await expect(unwrap(api.GET('/v1/auth/me'))).rejects.toMatchObject({ status: 401 })
  expect(useAuthStore.getState().accessToken).toBeNull()
  expect(useAuthStore.getState().lastLogoutReason).toBe('expired')
})

it('does not loop when retry also gets 401', async () => {
  let refreshes = 0
  server.use(
    http.get('/v1/auth/me', unauthorized),
    http.post('/v1/auth/refresh', () => {
      refreshes++
      return HttpResponse.json({ ...session, accessToken: 'A2', refreshToken: 'R2' })
    }),
  )
  await expect(unwrap(api.GET('/v1/auth/me'))).rejects.toMatchObject({ status: 401 })
  expect(refreshes).toBe(1)
})

it('unwrap throws ApiError with code', async () => {
  server.use(
    http.get('/v1/auth/me', () =>
      HttpResponse.json({ code: 'FORBIDDEN', message: 'no' }, { status: 403 }),
    ),
  )
  await expect(unwrap(api.GET('/v1/auth/me'))).rejects.toBeInstanceOf(ApiError)
})

it('sys paths use sys token and omit tenant header', async () => {
  useSysAuthStore.getState().setSession({
    accessToken: 'SYS1',
    user: { id: 's1', username: 'sys', fullName: 'System' },
  })
  let seen: Headers | undefined
  server.use(
    http.get('/sys/stats', ({ request }) => {
      seen = request.headers
      return HttpResponse.json({
        hospitals: 0,
        byStatus: {},
        users: '0',
        storageBytes: '0',
        sampledHospitals: 0,
      })
    }),
  )
  await unwrap(api.GET('/sys/stats'))
  expect(seen?.get('authorization')).toBe('Bearer SYS1')
  expect(seen?.get('x-tenant-id')).toBeNull()
})

it('sys login is public and sys 401 logs out sys store only', async () => {
  useSysAuthStore.getState().setSession({
    accessToken: 'SYS1',
    user: { id: 's1', username: 'sys', fullName: 'System' },
  })
  let loginHeaders: Headers | undefined
  server.use(
    http.post('/sys/auth/login', ({ request }) => {
      loginHeaders = request.headers
      return HttpResponse.json({
        accessToken: 'X',
        user: { id: 's1', username: 'sys', fullName: 'S' },
      })
    }),
    http.get('/sys/stats', () => unauthorized()),
  )
  await unwrapAs(api.POST('/sys/auth/login', { body: { username: 'sys', password: 'x' } }))
  expect(loginHeaders?.get('authorization')).toBeNull()
  await expect(unwrap(api.GET('/sys/stats'))).rejects.toMatchObject({ status: 401 })
  expect(useSysAuthStore.getState().accessToken).toBeNull()
  expect(useAuthStore.getState().accessToken).toBe('A1')
})

it('TENANT_SUSPENDED logs out with reason tenant', async () => {
  server.use(
    http.get('/v1/auth/me', () =>
      HttpResponse.json({ code: 'TENANT_SUSPENDED', message: '' }, { status: 403 }),
    ),
  )
  await expect(unwrap(api.GET('/v1/auth/me'))).rejects.toMatchObject({ code: 'TENANT_SUSPENDED' })
  expect(useAuthStore.getState().lastLogoutReason).toBe('tenant')
})
