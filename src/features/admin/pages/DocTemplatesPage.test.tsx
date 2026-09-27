import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import type { DocTemplateBody } from '../api/doc-templates'
import { Component } from './DocTemplatesPage'

const DOC_TYPE = 'repair.completion'

const body: DocTemplateBody = {
  pageSetup: {
    size: 'A4',
    orientation: 'portrait',
    margin: { top: 40, right: 40, bottom: 48, left: 40 },
    baseFontSize: 10,
  },
  blocks: [
    { type: 'header', logo: 'left', lines: ['{{hospital.name}}', 'Địa chỉ: {{hospital.address}}'] },
    { type: 'title', text: 'BIÊN BẢN SỬA CHỮA', align: 'center' },
    {
      type: 'fields',
      columns: 3,
      items: [{ label: 'Mã phiếu', value: '{{doc.code}}' }],
    },
    {
      type: 'table',
      source: 'lines',
      columns: [{ key: 'stt', label: 'STT', width: 30, align: 'center' }],
      showTotals: true,
      totalsLabel: 'Tổng cộng',
    },
    {
      type: 'signatures',
      boxes: [
        { slot: 'handler', role: 'Người sửa chữa', page: 'last', x: 60, y: 90, w: 150, h: 60 },
      ],
    },
  ],
}

// Nguồn mẫu đổi được giữa chừng để handler refetch sau khi lưu phản ánh đúng trạng thái mới.
let source: 'tenant' | 'builtin' = 'builtin'

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  source = 'builtin'
  server.use(
    http.get('/v1/doc-templates', () =>
      HttpResponse.json({
        items: [{ docType: DOC_TYPE, name: null, version: null, source }],
      }),
    ),
    http.get('/v1/doc-templates/:docType', () =>
      HttpResponse.json({
        docType: DOC_TYPE,
        name: null,
        version: source === 'tenant' ? 1 : null,
        source,
        body,
      }),
    ),
  )
})

afterEach(() => vi.restoreAllMocks())

it('liệt kê loại chứng từ và ghi rõ đang dùng mẫu gốc', async () => {
  renderWithProviders(<Component />)
  expect(await screen.findByText('Biên bản sửa chữa')).toBeInTheDocument()
  expect(screen.getByText('Mẫu gốc')).toBeInTheDocument()
})

it('bấm Tạo bản riêng thì gọi PUT và chuyển sang trạng thái bản riêng', async () => {
  let saved = false
  server.use(
    http.put('/v1/doc-templates/:docType', async ({ request, params }) => {
      expect(params.docType).toBe(DOC_TYPE)
      const sent = (await request.json()) as DocTemplateBody
      expect(sent.blocks).toHaveLength(body.blocks.length)
      source = 'tenant'
      saved = true
      return HttpResponse.json({
        docType: DOC_TYPE,
        name: 'Biên bản sửa chữa',
        version: 1,
        source: 'tenant',
      })
    }),
  )
  renderWithProviders(<Component />)
  await userEvent.click(await screen.findByRole('button', { name: 'Tạo bản riêng' }))
  await waitFor(() => expect(saved).toBe(true))
  expect(await screen.findByText('Bản riêng của viện')).toBeInTheDocument()
})

it('lưu mẫu sai thì hiện đúng khối bị lỗi chứ không chỉ báo chung chung', async () => {
  server.use(
    http.put('/v1/doc-templates/:docType', () =>
      HttpResponse.json(
        {
          code: 'VALIDATION_ERROR',
          message: 'Mẫu không hợp lệ',
          details: [{ path: 'blocks.2.type', message: 'Loại khối không hợp lệ' }],
        },
        { status: 400 },
      ),
    ),
  )
  renderWithProviders(<Component />)
  await userEvent.click(await screen.findByRole('button', { name: 'Lưu' }))
  expect(await screen.findByText(/Khối 3/)).toBeInTheDocument()
})

it('tắt một khối thì mẫu gửi đi không còn khối đó', async () => {
  let sent: DocTemplateBody | null = null
  server.use(
    http.put('/v1/doc-templates/:docType', async ({ request }) => {
      sent = (await request.json()) as DocTemplateBody
      return HttpResponse.json({
        docType: DOC_TYPE,
        name: 'Biên bản sửa chữa',
        version: 1,
        source: 'tenant',
      })
    }),
  )
  renderWithProviders(<Component />)
  await userEvent.click(await screen.findByRole('switch', { name: 'Bật khối 4' }))
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(sent?.blocks).toHaveLength(body.blocks.length - 1))
})

it('Xem thử gửi đúng mẫu đang sửa và mở PDF ở tab mới', async () => {
  let received: DocTemplateBody | null = null
  server.use(
    http.post('/v1/doc-templates/:docType/preview', async ({ request }) => {
      received = (await request.json()) as DocTemplateBody
      return new HttpResponse('pdf-bytes', { headers: { 'content-type': 'application/pdf' } })
    }),
  )
  const open = vi.spyOn(window, 'open').mockReturnValue(null)
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:preview')

  renderWithProviders(<Component />)
  await userEvent.click(await screen.findByRole('button', { name: 'Xem thử' }))

  await waitFor(() => expect(received?.blocks).toHaveLength(body.blocks.length))
  expect(open).toHaveBeenCalledWith('blob:preview', '_blank', 'noopener')
})
