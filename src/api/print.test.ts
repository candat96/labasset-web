import { waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { useAuthStore } from '@/stores/auth.store'
import { printBlob, printFile } from './print'

const frameIn = () => document.querySelector<HTMLIFrameElement>('iframe[aria-hidden="true"]')

/** jsdom không tải blob: — giả lập sự kiện load của iframe như trình duyệt. */
function fireFrameLoad() {
  frameIn()?.dispatchEvent(new Event('load'))
}

/** jsdom không tải blob: trong iframe — thay contentWindow để kiểm tra lời gọi in. */
function mockFrameWindow(print: () => void = () => {}) {
  const win = { focus: vi.fn(), print: vi.fn(print), addEventListener: vi.fn() }
  vi.spyOn(window.HTMLIFrameElement.prototype, 'contentWindow', 'get').mockReturnValue(
    win as unknown as Window,
  )
  return win
}

afterEach(() => {
  vi.restoreAllMocks()
  document.querySelectorAll('iframe').forEach((frame) => frame.remove())
})

it('tải PDF kèm token rồi in qua iframe ẩn (không lưu file)', async () => {
  useAuthStore.getState().setTokens('A1', 'R1')
  let auth: string | null = null
  server.use(
    http.get('/v1/stock/issues/i1/print.pdf', ({ request }) => {
      auth = request.headers.get('authorization')
      return new HttpResponse('pdf-bytes', { headers: { 'content-type': 'application/pdf' } })
    }),
  )
  const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:in')
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  const win = mockFrameWindow()

  await printFile('/v1/stock/issues/i1/print.pdf')

  expect(auth).toBe('Bearer A1')
  expect(create).toHaveBeenCalledOnce()
  expect(frameIn()?.getAttribute('src')).toBe('blob:in')
  fireFrameLoad()
  await waitFor(() => expect(win.print).toHaveBeenCalledOnce())

  const afterPrint = (
    win.addEventListener as unknown as { mock: { calls: [string, () => void][] } }
  ).mock.calls.find(([name]) => name === 'afterprint')?.[1]
  afterPrint?.()
  expect(revoke).toHaveBeenCalledWith('blob:in')
  expect(frameIn()).toBeNull()
})

it('trình duyệt chặn in → mở tab xem PDF để in thủ công', async () => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:chan')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  const open = vi.spyOn(window, 'open').mockImplementation(() => null)
  mockFrameWindow(() => {
    throw new Error('blocked')
  })

  printBlob(new Blob(['pdf'], { type: 'application/pdf' }))
  fireFrameLoad()

  await waitFor(() => expect(open).toHaveBeenCalledWith('blob:chan', '_blank', 'noopener'))
})

it('lỗi API thì ném ApiError, không mở iframe', async () => {
  server.use(
    http.get('/v1/x', () => HttpResponse.json({ code: 'FORBIDDEN', message: '' }, { status: 403 })),
  )
  await expect(printFile('/v1/x')).rejects.toMatchObject({ code: 'FORBIDDEN' })
  expect(frameIn()).toBeNull()
})
