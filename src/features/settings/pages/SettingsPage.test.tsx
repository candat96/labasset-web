import { fireEvent, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './SettingsPage'

const settings = {
  'hospital.name': 'Bệnh viện Demo',
  'hospital.address': 'Hà Nội',
  'hospital.logoFileId': null,
  'approval.levels': 1,
  'repair.requireAcceptance': true,
  'requests.restrictToCompatible': false,
  'repair.sla': { low: 168, medium: 72, high: 24, critical: 4 },
  'stock.defaultWarehouseId': null,
  'stock.cancelWindowDays': 30,
  'alerts.stockMinEnabled': true,
  'alerts.expiryDaysBefore': 30,
  'alerts.maintenanceDaysBefore': 14,
  'alerts.calibrationDaysBefore': 30,
  'alerts.repairCostPctOfValue': 50,
  'maintenance.dueGraceDays': 7,
  'open_vial.defaultDays': 28,
  'ai.enabled': false,
  'ai.chat.protocol': 'openai_compatible',
  'ai.chat.baseUrl': 'https://api.openai.com/v1',
  'ai.chat.model': 'gpt-4o-mini',
  'ai.chat.apiKeySet': true,
  'ai.chat.headers': {},
  'ai.embedding.protocol': 'openai_compatible',
  'ai.embedding.baseUrl': 'https://api.openai.com/v1',
  'ai.embedding.model': 'text-embedding-3-small',
  'ai.embedding.dimensions': 1024,
  'ai.embedding.apiKeySet': false,
  'ai.monthlyTokenBudget': 0,
  'numbering.request': 'PYC-{YYYY}-{SEQ:4}',
  'numbering.department': 'KH-{SEQ:3}',
  'numbering.catalog.suppliers': 'NCC-{SEQ:4}',
  'future.setting': { enabled: true },
}

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/settings', () => HttpResponse.json(settings)),
    http.get('/v1/catalogs/warehouses', () => HttpResponse.json([])),
    http.get('/v1/ai/status', () =>
      HttpResponse.json({
        enabled: true,
        model: 'gpt-4o-mini',
        budget: { monthlyTokenBudget: 0, used: 1234, remaining: null },
        rateLimit: { perHour: 30 },
        chat: {
          protocol: 'openai_compatible',
          baseUrlHost: 'api.openai.com',
          model: 'gpt-4o-mini',
        },
        embedding: {
          protocol: 'openai_compatible',
          model: 'text-embedding-3-small',
          enabled: true,
        },
      }),
    ),
  )
})

it('keeps the active tab in the URL', async () => {
  const { router } = renderWithProviders(<Component />, {
    path: '/admin/settings',
    route: '/admin/settings',
  })
  await screen.findByDisplayValue('Bệnh viện Demo')
  await userEvent.click(screen.getByRole('tab', { name: 'Đánh số' }))
  expect(router.state.location.search).toContain('tab=numbering')
})

it('shows typed tabs and unknown settings as read-only JSON', async () => {
  renderWithProviders(<Component />)
  expect(await screen.findByDisplayValue('Bệnh viện Demo')).toBeVisible()
  await userEvent.click(screen.getByRole('tab', { name: 'Khác' }))
  expect(screen.getByText(/future.setting/)).toBeVisible()
  expect(screen.getByText(/open_vial.defaultDays/)).toBeVisible()
})

it('PUT sends only changed keys and groups repair SLA', async () => {
  const saved: unknown[] = []
  server.use(
    http.put('/v1/settings', async ({ request }) => {
      saved.push(await request.json())
      return new HttpResponse(null, { status: 204 })
    }),
  )
  renderWithProviders(<Component />)
  const name = await screen.findByLabelText('Tên bệnh viện')
  fireEvent.change(name, { target: { value: 'Bệnh viện Mới' } })
  await userEvent.click(screen.getByRole('tab', { name: 'Quy trình' }))
  fireEvent.change(screen.getByLabelText('SLA cao (giờ)'), { target: { value: '12' } })
  await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
  await waitFor(() => expect(saved).toHaveLength(1))
  expect(saved[0]).toEqual({
    'hospital.name': 'Bệnh viện Mới',
    'repair.sla': { low: 168, medium: 72, high: 12, critical: 4 },
  })
})

it('attaches SETTING_INVALID to the matching field', async () => {
  server.use(
    http.put('/v1/settings', () =>
      HttpResponse.json(
        { code: 'SETTING_INVALID', message: 'Invalid setting', details: { key: 'hospital.name' } },
        { status: 400 },
      ),
    ),
  )
  renderWithProviders(<Component />)
  const name = await screen.findByLabelText('Tên bệnh viện')
  fireEvent.change(name, { target: { value: 'Tên khác' } })
  await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
  expect(await screen.findByText('Giá trị cấu hình không hợp lệ')).toBeVisible()
  expect(name).toHaveAttribute('aria-invalid', 'true')
})

it('numbering tab shows auto-code types with defaults (handoff 16)', async () => {
  renderWithProviders(<Component />)
  await screen.findByDisplayValue('Bệnh viện Demo')
  await userEvent.click(screen.getByRole('tab', { name: 'Đánh số' }))
  // panel đang active (các panel khác forceMount nhưng ẩn)
  const panel = () =>
    screen.getAllByRole('tabpanel').find((el) => el.getAttribute('data-state') === 'active')!
  // nhóm gốc vẫn hiện
  expect(within(panel()).getByLabelText('Phiếu yêu cầu')).toHaveValue('PYC-{YYYY}-{SEQ:4}')
  // các loại mã tự sinh mới → hiện với giá trị đã lưu / default
  expect(within(panel()).getByLabelText('Khoa')).toHaveValue('KH-{SEQ:3}')
  expect(within(panel()).getByLabelText('Nhà cung cấp')).toHaveValue('NCC-{SEQ:4}')
  expect(within(panel()).getByLabelText('Phòng')).toHaveValue('PH-{SEQ:4}')
  expect(within(panel()).getByLabelText('Vật tư')).toHaveValue('VT-{SEQ:5}')
  // không rơi vào tab Khác
  await userEvent.click(screen.getByRole('tab', { name: 'Khác' }))
  expect(screen.queryByText(/numbering\.department/)).not.toBeInTheDocument()
})

it('saves a changed numbering template and labels preview as persisted', async () => {
  const saved: unknown[] = []
  server.use(
    http.put('/v1/settings', async ({ request }) => {
      saved.push(await request.json())
      return new HttpResponse(null, { status: 204 })
    }),
    http.get('/v1/numbering/preview', () =>
      HttpResponse.json({ template: 'PYC-{YYYY}-{SEQ:4}', example: 'PYC-2026-0001', nextValue: 1 }),
    ),
  )
  renderWithProviders(<Component />)
  await screen.findByDisplayValue('Bệnh viện Demo')
  await userEvent.click(screen.getByRole('tab', { name: 'Đánh số' }))
  const input = screen.getByLabelText('Phiếu yêu cầu')
  fireEvent.change(input, { target: { value: 'YC-{YYYY}-{SEQ:4}' } })
  const row = input.closest('div.grid')
  await userEvent.click(within(row as HTMLElement).getByRole('button', { name: 'Xem trước' }))
  expect(await screen.findByText('Xem trước đã lưu: PYC-2026-0001')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
  await waitFor(() => expect(saved[0]).toEqual({ 'numbering.request': 'YC-{YYYY}-{SEQ:4}' }))
})

const openAiTab = async () => {
  renderWithProviders(<Component />)
  await screen.findByDisplayValue('Bệnh viện Demo')
  await userEvent.click(screen.getByRole('tab', { name: 'AI' }))
}

it('renders the AI provider form with chat and embedding blocks', async () => {
  await openAiTab()
  expect(screen.getByLabelText('Bật trợ lý AI')).not.toBeChecked()
  expect(screen.getByLabelText('Giao thức')).toHaveTextContent('OpenAI-compatible')
  expect(screen.getByLabelText('Nhà cung cấp')).toHaveTextContent('OpenAI')
  expect(screen.getByLabelText('Base URL')).toHaveValue('https://api.openai.com/v1')
  expect(screen.getByLabelText('Mô hình')).toHaveValue('gpt-4o-mini')
  expect(screen.getByLabelText('API key (đã đặt)')).toBeVisible()
  expect(screen.getByLabelText('Giao thức embedding')).toHaveTextContent('OpenAI-compatible')
  expect(screen.getByLabelText('Base URL embedding')).toHaveValue('https://api.openai.com/v1')
  expect(screen.getByLabelText('Mô hình embedding')).toHaveValue('text-embedding-3-small')
  expect(screen.getByLabelText('API key embedding (chưa đặt)')).toBeVisible()
  expect(screen.queryByText(/API D2 chưa có/)).toBeNull()
})

it('fills Base URL from the selected provider preset', async () => {
  await openAiTab()
  await userEvent.click(screen.getByLabelText('Nhà cung cấp'))
  await userEvent.click(screen.getByRole('option', { name: 'OpenRouter' }))
  expect(screen.getByLabelText('Base URL')).toHaveValue('https://openrouter.ai/api/v1')
  expect(screen.getByLabelText('Giao thức')).toHaveTextContent('OpenAI-compatible')
  await userEvent.click(screen.getByLabelText('Nhà cung cấp embedding'))
  await userEvent.click(screen.getByRole('option', { name: 'Voyage' }))
  expect(screen.getByLabelText('Base URL embedding')).toHaveValue('https://api.voyageai.com/v1')
})

it('fills OpenRouter embedding with qwen/qwen3-embedding-4b and suggests bge-m3', async () => {
  await openAiTab()
  await userEvent.click(screen.getByLabelText('Nhà cung cấp embedding'))
  await userEvent.click(screen.getByRole('option', { name: 'OpenRouter' }))
  expect(screen.getByLabelText('Base URL embedding')).toHaveValue('https://openrouter.ai/api/v1')
  expect(screen.getByLabelText('Mô hình embedding')).toHaveValue('qwen/qwen3-embedding-4b')
  const options = [...document.querySelectorAll('#ai-embedding-model-suggestions option')].map(
    (node) => (node as HTMLOptionElement).value,
  )
  expect(options).toEqual([
    'qwen/qwen3-embedding-4b',
    'openai/text-embedding-3-small',
    'baai/bge-m3',
  ])
})

it('warns when a Base URL is pasted with an endpoint suffix and shows the placeholder hint', async () => {
  await openAiTab()
  expect(screen.getByLabelText('Base URL')).toHaveAttribute(
    'placeholder',
    'https://openrouter.ai/api/v1 (không kèm /embeddings hay /chat/completions)',
  )
  fireEvent.change(screen.getByLabelText('Base URL embedding'), {
    target: { value: 'https://openrouter.ai/api/v1/embeddings' },
  })
  expect(screen.getByRole('alert')).toHaveTextContent('đang kèm đuôi /embeddings')
  expect(screen.getByLabelText('Base URL embedding')).toHaveAttribute('aria-invalid', 'true')
  fireEvent.change(screen.getByLabelText('Base URL embedding'), {
    target: { value: 'https://openrouter.ai/api/v1' },
  })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Base URL'), {
    target: { value: 'https://api.deepseek.com/v1/chat/completions' },
  })
  expect(screen.getByRole('alert')).toHaveTextContent('/chat/completions')
})

it('shows the live AI status card and queues a reindex with a count toast', async () => {
  let reindexCalled = false
  server.use(
    http.post('/v1/ai/admin/reindex', () => {
      reindexCalled = true
      return HttpResponse.json({ queued: 12 })
    }),
  )
  await openAiTab()
  const card = await screen.findByRole('group', { name: 'Trạng thái trợ lý AI' })
  expect(card).toHaveTextContent('Đang bật')
  expect(card).toHaveTextContent('openai_compatible · api.openai.com · gpt-4o-mini')
  expect(card).toHaveTextContent('openai_compatible · text-embedding-3-small')
  expect(card).toHaveTextContent('Đã dùng 1.234 token (không giới hạn)')
  await userEvent.click(screen.getByRole('button', { name: 'Lập chỉ mục lại tài liệu' }))
  expect(await screen.findByText('Đã xếp 12 tài liệu vào hàng lập chỉ mục')).toBeVisible()
  expect(reindexCalled).toBe(true)
})

it('fills DeepSeek chat URL and current model names, not gpt-4o-mini', async () => {
  await openAiTab()
  await userEvent.click(screen.getByLabelText('Nhà cung cấp'))
  await userEvent.click(screen.getByRole('option', { name: 'DeepSeek' }))
  expect(screen.getByLabelText('Base URL')).toHaveValue('https://api.deepseek.com/v1')
  expect(screen.getByLabelText('Mô hình')).toHaveValue('deepseek-flash')
  const suggestions = screen.getByLabelText('Mô hình').getAttribute('list')
  expect(suggestions).toBe('ai-chat-model-suggestions')
  const options = [...document.querySelectorAll('#ai-chat-model-suggestions option')].map(
    (node) => (node as HTMLOptionElement).value,
  )
  expect(options).toEqual(['deepseek-flash', 'deepseek-v4-pro'])
})

it('PUT sends changed ai.* keys per the provider contract and skips empty keys', async () => {
  const saved: unknown[] = []
  server.use(
    http.put('/v1/settings', async ({ request }) => {
      saved.push(await request.json())
      return new HttpResponse(null, { status: 204 })
    }),
  )
  await openAiTab()
  fireEvent.change(screen.getByLabelText('Mô hình'), { target: { value: 'deepseek-chat' } })
  fireEvent.change(screen.getByLabelText('API key (đã đặt)'), { target: { value: 'sk-test' } })
  await userEvent.click(screen.getByLabelText('Bật trợ lý AI'))
  await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
  await waitFor(() => expect(saved).toHaveLength(1))
  expect(saved[0]).toEqual({
    'ai.enabled': true,
    'ai.chat.model': 'deepseek-chat',
    'ai.chat.apiKey': 'sk-test',
  })
})

it('clears a saved API key only when the user asks', async () => {
  const saved: unknown[] = []
  server.use(
    http.put('/v1/settings', async ({ request }) => {
      saved.push(await request.json())
      return new HttpResponse(null, { status: 204 })
    }),
  )
  await openAiTab()
  await userEvent.click(screen.getByRole('button', { name: 'Xoá key' }))
  expect(screen.getByText('Key đã lưu sẽ bị xoá khi bấm Lưu')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
  await waitFor(() => expect(saved[0]).toEqual({ 'ai.chat.apiKey': '' }))
})

it('test connection shows latency and model on success', async () => {
  server.use(
    http.post('/v1/ai/settings/test', () =>
      HttpResponse.json({ ok: true, latencyMs: 123, model: 'gpt-4o-mini' }),
    ),
  )
  await openAiTab()
  await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra kết nối' }))
  expect(await screen.findByText('Kết nối OK')).toBeVisible()
  expect(screen.getByText('Chat: OK — gpt-4o-mini, 123 ms')).toBeVisible()
  expect(
    await screen.findByText('Embedding: OK — text-embedding-3-small (kiểm tra cùng lượt)'),
  ).toBeVisible()
})

it('sends the form chat config when testing connection', async () => {
  let body: unknown
  server.use(
    http.post('/v1/ai/settings/test', async ({ request }) => {
      body = await request.json()
      return HttpResponse.json({
        ok: true,
        latencyMs: 40,
        model: 'deepseek-flash',
      })
    }),
  )
  await openAiTab()
  await userEvent.click(screen.getByLabelText('Nhà cung cấp'))
  await userEvent.click(screen.getByRole('option', { name: 'DeepSeek' }))
  fireEvent.change(screen.getByLabelText('API key (đã đặt)'), { target: { value: 'sk-draft' } })
  await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra kết nối' }))
  expect(await screen.findByText('Kết nối OK')).toBeVisible()
  expect(body).toEqual({
    protocol: 'openai_compatible',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-flash',
    apiKey: 'sk-draft',
  })
})

it('shows an unsupported message instead of an error when test endpoint is 404', async () => {
  server.use(
    http.post('/v1/ai/settings/test', () =>
      HttpResponse.json({ code: 'NOT_FOUND', message: 'Not found' }, { status: 404 }),
    ),
  )
  await openAiTab()
  await userEvent.click(screen.getByRole('button', { name: 'Kiểm tra kết nối' }))
  expect(await screen.findByText('Backend chưa hỗ trợ kiểm tra kết nối')).toBeVisible()
  expect(screen.queryByText('Kiểm tra kết nối thất bại')).toBeNull()
})

it('validates Headers JSON as object<string,string> and blocks save on error', async () => {
  const saved: unknown[] = []
  server.use(
    http.put('/v1/settings', async ({ request }) => {
      saved.push(await request.json())
      return new HttpResponse(null, { status: 204 })
    }),
  )
  await openAiTab()
  await userEvent.click(screen.getByRole('button', { name: 'Nâng cao' }))
  fireEvent.change(screen.getByLabelText('Headers JSON'), { target: { value: '{"x": 1}' } })
  expect(
    screen.getByText('Headers phải là JSON object kiểu {"Tên-Header": "giá trị"}'),
  ).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
  expect(saved).toHaveLength(0)
  fireEvent.change(screen.getByLabelText('Headers JSON'), {
    target: { value: '{"HTTP-Referer": "https://labasset.example"}' },
  })
  expect(screen.queryByText(/Headers phải là JSON object/)).toBeNull()
})
