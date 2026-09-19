import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { downloadFile, filenameFrom } from './download'
import { useAuthStore } from '@/stores/auth.store'

it('parses content-disposition', () => {
  expect(filenameFrom('attachment; filename="khoa.xlsx"')).toBe('khoa.xlsx')
  expect(filenameFrom("attachment; filename*=UTF-8''kho%20a.xlsx")).toBe('kho a.xlsx')
  expect(filenameFrom(null)).toBeNull()
})

it('downloads with auth headers and uses server filename', async () => {
  useAuthStore.getState().setTokens('A1', 'R1')
  let seen: Headers | undefined
  server.use(
    http.get('/v1/departments/export', ({ request }) => {
      seen = request.headers
      expect(new URL(request.url).searchParams.get('q')).toBe('xn')
      return new HttpResponse('xlsx', {
        headers: { 'content-disposition': 'attachment; filename="khoa.xlsx"' },
      })
    }),
  )
  URL.createObjectURL = vi.fn(() => 'blob:x')
  URL.revokeObjectURL = vi.fn()
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    expect(this.download).toBe('khoa.xlsx')
  })
  await downloadFile('/v1/departments/export', { q: 'xn', isActive: undefined })
  expect(seen?.get('authorization')).toBe('Bearer A1')
  expect(click).toHaveBeenCalledOnce()
})

it('throws ApiError on failure', async () => {
  server.use(
    http.get('/v1/x', () => HttpResponse.json({ code: 'FORBIDDEN', message: '' }, { status: 403 })),
  )
  await expect(downloadFile('/v1/x')).rejects.toMatchObject({ code: 'FORBIDDEN' })
})
