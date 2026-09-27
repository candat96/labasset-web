import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { DocumentSigningCard, SignedDocumentsPanel } from './SignedDocumentsPanel'

beforeEach(() => useAuthStore.getState().setSession(fakeSession()))

it('hiện empty state khi chưa có bản ký nào', async () => {
  server.use(http.get('/v1/documents/repair.completion/r1/signed', () => HttpResponse.json([])))
  renderWithProviders(<SignedDocumentsPanel docType="repair.completion" id="r1" />)
  expect(await screen.findByText('Chưa có bản ký nào')).toBeInTheDocument()
})

it('liệt kê bản đã ký kèm nút Tải về', async () => {
  server.use(
    http.get('/v1/documents/repair.completion/r1/signed', () =>
      HttpResponse.json([
        {
          attachmentId: 'a1',
          fileId: 'f1',
          name: 'SC-1-da-ky.pdf',
          label: 'Đã ký — Người sửa chữa',
          signedAt: '2026-09-20T08:00:00Z',
          url: 'https://files.local/signed.pdf',
        },
      ]),
    ),
  )
  renderWithProviders(<SignedDocumentsPanel docType="repair.completion" id="r1" />)
  expect(await screen.findByText('Đã ký — Người sửa chữa')).toBeInTheDocument()
  const link = screen.getByRole('link', { name: 'Tải về' })
  expect(link).toHaveAttribute('href', 'https://files.local/signed.pdf')
  expect(link).toHaveAttribute('target', '_blank')
})

it('khối gộp có nút mở hộp thoại ký số', async () => {
  server.use(http.get('/v1/documents/repair.completion/r1/signed', () => HttpResponse.json([])))
  renderWithProviders(
    <DocumentSigningCard docType="repair.completion" id="r1" slots={['handler', 'department']} />,
  )
  expect(await screen.findByRole('button', { name: 'Ký số' })).toBeInTheDocument()
})
