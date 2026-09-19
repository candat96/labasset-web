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
