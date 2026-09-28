import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { fakeSession, renderWithProviders } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './SupplierDetailPage'

const supplier = {
  id: 's1',
  code: 'NCC-0001',
  name: 'Công ty Vật tư A',
  description: null,
  isActive: true,
  sortOrder: 0,
  taxCode: '0101234567',
  address: 'Hà Nội',
  phone: '0241234567',
  email: 'a@ncc.vn',
  contactName: 'Nguyễn Văn A',
  contactPhone: '0900000000',
  maintenanceContractNo: null,
  maintenanceContractExpiresAt: null,
  rating: 6.35,
  notes: null,
}

const evaluation = {
  id: 'e1',
  supplierId: 's1',
  periodFrom: '2026-01-01',
  periodTo: '2026-03-31',
  deliveryScore: 8,
  qualityScore: 6,
  documentScore: 5,
  supportScore: 4,
  totalScore: 6.35,
  note: 'Giao hàng ổn',
  evaluatedBy: 'u1',
  evaluatedAt: '2026-04-01T08:00:00.000Z',
}

function mockBase(overrides: { evaluations?: unknown[] } = {}) {
  server.use(
    http.get('/v1/catalogs/suppliers/s1', () => HttpResponse.json(supplier)),
    http.get('/v1/suppliers/s1/evaluations', () =>
      HttpResponse.json(overrides.evaluations ?? [evaluation]),
    ),
    http.get('/v1/suppliers/s1/evaluation-facts', () =>
      HttpResponse.json({
        from: '2026-01-01',
        to: '2026-03-31',
        receiptCount: 3,
        qcFailedCount: 1,
        quarantineLotCount: 2,
        returnToSupplierCount: 0,
        shortShelfLifeLotCount: 4,
      }),
    ),
  )
}

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
})

it('hiện tab Đánh giá với danh sách theo kỳ và điểm tổng', async () => {
  mockBase()
  renderWithProviders(<Component />, {
    path: '/admin/catalogs/suppliers/:id',
    route: '/admin/catalogs/suppliers/s1?tab=evaluations',
  })
  expect(await screen.findByText('Công ty Vật tư A')).toBeVisible()
  expect(await screen.findByText(/Kỳ 01\/01\/2026 – 31\/03\/2026/)).toBeVisible()
  expect(screen.getAllByText('6.35').length).toBeGreaterThan(0)
  expect(screen.getByText('Giao hàng ổn')).toBeVisible()
})

it('mở form chấm điểm, hiện khối số liệu hệ thống và gửi đúng bốn điểm', async () => {
  mockBase()
  const bodies: unknown[] = []
  server.use(
    http.post('/v1/suppliers/s1/evaluations', async ({ request }) => {
      bodies.push(await request.json())
      return HttpResponse.json(evaluation, { status: 201 })
    }),
  )
  renderWithProviders(<Component />, {
    path: '/admin/catalogs/suppliers/:id',
    route: '/admin/catalogs/suppliers/s1?tab=evaluations',
  })
  await userEvent.click(await screen.findByRole('button', { name: 'Thêm đánh giá' }))
  const dialog = within(screen.getByRole('dialog'))
  // Khối số liệu hệ thống (chỉ đọc) bên cạnh form
  expect(dialog.getByText('Số liệu hệ thống')).toBeVisible()
  expect(
    await dialog.findByText('Các số liệu này là tham khảo, điểm do người đánh giá quyết định.'),
  ).toBeVisible()
  expect(dialog.getByText('Số phiếu nhập')).toBeVisible()

  const delivery = dialog.getByRole('spinbutton', { name: 'Giao hàng' })
  await userEvent.clear(delivery)
  await userEvent.type(delivery, '9')
  await userEvent.click(dialog.getByRole('button', { name: 'Lưu' }))
  await waitFor(() =>
    expect(bodies[0]).toMatchObject({
      periodFrom: expect.any(String) as string,
      periodTo: expect.any(String) as string,
      deliveryScore: 9,
      qualityScore: 5,
      documentScore: 5,
      supportScore: 5,
    }),
  )
})

it('hiện trạng thái rỗng khi chưa có đánh giá', async () => {
  mockBase({ evaluations: [] })
  renderWithProviders(<Component />, {
    path: '/admin/catalogs/suppliers/:id',
    route: '/admin/catalogs/suppliers/s1?tab=evaluations',
  })
  expect(await screen.findByText('Chưa có đánh giá nào')).toBeVisible()
})
