import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { SignDialog } from './SignDialog'

const profile = (over: Record<string, unknown> = {}) => ({
  userId: 'u1',
  providerKey: 'intrust',
  username: 'ICA.0108357319',
  credentialId: 'c1',
  certSerial: '123456',
  certSubject: 'CN=Nguyễn Văn A',
  certValidFrom: '2025-01-01T00:00:00Z',
  certValidTo: '2027-01-01T00:00:00Z',
  sessionExpiresAt: null,
  rememberPin: false,
  expiringSoon: false,
  passwordSet: true,
  pinSet: true,
  ...over,
})

function stubProfile(over: Record<string, unknown> = {}) {
  server.use(
    http.get('/v1/me/signing-profile', () =>
      HttpResponse.json({ profile: profile(over), configured: true }),
    ),
  )
}

beforeEach(() => useAuthStore.getState().setSession(fakeSession()))

const renderDialog = () =>
  renderWithProviders(
    <SignDialog docType="repair.completion" id="r1" slots={['handler', 'department']} />,
  )

it('chỉ gửi một lệnh ký dù bấm hai lần liên tiếp', async () => {
  stubProfile({ pinSet: true, passwordSet: true })
  let calls = 0
  const gate: { release?: () => void } = {}
  server.use(
    http.post('/v1/documents/repair.completion/r1/sign', async () => {
      calls++
      await new Promise<void>((resolve) => {
        gate.release = resolve
      })
      return HttpResponse.json({ fileId: 'f1', attachmentId: 'a1' })
    }),
  )
  renderDialog()
  await userEvent.click(await screen.findByRole('button', { name: 'Ký số' }))
  const submit = await screen.findByRole('button', { name: 'Ký' })
  // Hai cú bấm trong cùng một nhịp: khoá đồng bộ phải chặn lệnh thứ hai.
  fireEvent.click(submit)
  fireEvent.click(submit)
  await waitFor(() => expect(calls).toBe(1))
  gate.release?.()
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

it('chỉ hiện ô PIN khi server chưa lưu PIN', async () => {
  stubProfile({ pinSet: false, passwordSet: true })
  renderDialog()
  await userEvent.click(await screen.findByRole('button', { name: 'Ký số' }))
  expect(await screen.findByLabelText('Mã PIN')).toBeInTheDocument()
})

it('không hiện ô PIN khi server đã lưu PIN', async () => {
  stubProfile({ pinSet: true, passwordSet: true })
  renderDialog()
  await userEvent.click(await screen.findByRole('button', { name: 'Ký số' }))
  // Chờ hồ sơ tải xong (tiêu đề hộp thoại luôn có) rồi mới kiểm tra.
  await screen.findByText('Chọn ô ký rồi xác nhận bằng chữ ký số của bạn.')
  expect(screen.queryByLabelText('Mã PIN')).not.toBeInTheDocument()
})

it('hiện thông báo tiếng Việt khi thiếu PIN', async () => {
  stubProfile({ pinSet: true, passwordSet: true })
  server.use(
    http.post('/v1/documents/repair.completion/r1/sign', () =>
      HttpResponse.json(
        { code: 'SIGNING_PIN_REQUIRED', message: 'Cần mã PIN để ký' },
        { status: 400 },
      ),
    ),
  )
  renderDialog()
  await userEvent.click(await screen.findByRole('button', { name: 'Ký số' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Ký' }))
  const messages = await screen.findAllByText('Cần mã PIN để ký')
  expect(messages.length).toBeGreaterThan(0)
  // Có đường ra: liên kết tới cài đặt chữ ký số.
  const alert = screen.getAllByRole('alert')[0]
  expect(within(alert!).getByRole('link', { name: 'Cài đặt chữ ký số' })).toBeInTheDocument()
})
