import { File as NativeFile } from 'node:buffer'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { FileField } from './file-field'

function Harness() {
  const [value, setValue] = useState<string | null>(null)
  return <FileField label="Hoá đơn" value={value} onChange={setValue} />
}

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.post('/v1/files/presign', () =>
      HttpResponse.json({
        fileId: 'f1',
        uploadUrl: 'http://storage.test/upload',
        headers: {},
      }),
    ),
    http.put('http://storage.test/upload', () => new HttpResponse(null, { status: 200 })),
    http.post('/v1/files/f1/complete', () => HttpResponse.json({ id: 'f1' })),
  )
})

it('vùng chọn tệp bằng tiếng Việt, không dùng nhãn mặc định của trình duyệt', () => {
  renderWithProviders(<Harness />)
  expect(screen.getByText('Chọn tệp')).toBeVisible()
  expect(screen.getByText('Chưa chọn tệp nào')).toBeVisible()
})

it('tệp đã tải hiện tên, dung lượng và định dạng', async () => {
  renderWithProviders(<Harness />)
  // `File` của jsdom không dùng làm thân yêu cầu fetch được; phải lấy từ node:buffer.
  const file = new NativeFile([new Uint8Array(2048)], 'hoa-don.pdf', {
    type: 'application/pdf',
  }) as unknown as File

  await userEvent.upload(screen.getByLabelText('Hoá đơn'), file)

  await waitFor(() => expect(screen.getByText('hoa-don.pdf')).toBeVisible())
  expect(screen.getByText(/2,0 KB · PDF/)).toBeVisible()
})
