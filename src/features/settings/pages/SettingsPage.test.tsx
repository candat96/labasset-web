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
  'ai.chat.headers': '',
  'ai.embedding.protocol': 'openai_compatible',
  'ai.embedding.baseUrl': 'https://api.openai.com/v1',
  'ai.embedding.model': 'text-embedding-3-small',
  'ai.embedding.dimensions': 1024,
  'ai.embedding.apiKeySet': false,
  'ai.monthlyTokenBudget': 0,
  'numbering.request': 'PYC-{YYYY}-{SEQ:4}',
  'future.setting': { enabled: true },
}

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/settings', () => HttpResponse.json(settings)),
    http.get('/v1/catalogs/warehouses', () => HttpResponse.json([])),
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
  expect(screen.getByText('Độ trễ: 123 ms')).toBeVisible()
  expect(screen.getByText('Mô hình: gpt-4o-mini')).toBeVisible()
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
