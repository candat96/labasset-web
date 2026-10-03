import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component as EquipmentDashboardPage } from './EquipmentDashboardPage'

const respond = (rows: Record<string, unknown>[]) =>
  HttpResponse.json({ columns: [], rows, total: rows.length, page: 1, limit: 1000 })

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/reports/equipment.availability', () =>
      respond([
        { code: 'TB-A', name: 'Máy A', downHours: 24, availability: 99 },
        { code: 'TB-B', name: 'Máy B', downHours: 0, availability: 100 },
      ]),
    ),
    http.get('/v1/reports/equipment.maintenanceCompliance', () =>
      respond([{ departmentName: 'Khoa A', due: 4, done: 3, onTime: 3, compliance: 75 }]),
    ),
    http.get('/v1/reports/equipment.repeatFailures', () =>
      respond([
        { code: 'TB-A', faultName: 'E01' },
        { code: 'TB-B', faultName: 'E02' },
      ]),
    ),
    http.get('/v1/reports/equipment.calibrationCompliance', () =>
      respond([{ type: 'calibration', due: 2, done: 2, onTime: 2, compliance: 100 }]),
    ),
    http.get('/v1/departments', () => HttpResponse.json([])),
  )
})

it('hiện bốn thẻ chỉ số kỳ hiện tại', async () => {
  renderWithProviders(<EquipmentDashboardPage />, {
    path: '/equipment/dashboard',
    route: '/equipment/dashboard',
  })
  expect(await screen.findByText('Tỷ lệ sẵn sàng')).toBeVisible()
  expect(screen.getByText('Bảo trì đúng hạn')).toBeVisible()
  expect(screen.getByText('Lỗi lặp lại')).toBeVisible()
  expect(screen.getByText('Tuân thủ kiểm định')).toBeVisible()
})

it('gộp số liệu báo cáo thành chỉ số', async () => {
  renderWithProviders(<EquipmentDashboardPage />, {
    path: '/equipment/dashboard',
    route: '/equipment/dashboard',
  })
  // 1 - 24 / (2 máy × 30 ngày × 24 giờ) = 98,3%
  expect(await screen.findByText('98,3%')).toBeVisible()
  // 3 đúng hạn / 4 đến hạn = 75%
  expect(screen.getByText('75%')).toBeVisible()
  // 2 cặp lỗi lặp lại
  expect(screen.getByText('2')).toBeVisible()
  // 2/2 = 100%
  expect(screen.getByText('100%')).toBeVisible()
})

it('bấm thẻ mở báo cáo đầy đủ tương ứng', async () => {
  renderWithProviders(<EquipmentDashboardPage />, {
    path: '/equipment/dashboard',
    route: '/equipment/dashboard',
  })
  expect((await screen.findByText('Tỷ lệ sẵn sàng')).closest('a')).toHaveAttribute(
    'href',
    '/reports?key=equipment.availability',
  )
  expect(screen.getByText('Lỗi lặp lại').closest('a')).toHaveAttribute(
    'href',
    '/reports?key=equipment.repeatFailures',
  )
})
