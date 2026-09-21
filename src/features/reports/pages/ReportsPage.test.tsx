import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { server } from '@/test/msw/server'
import { Component } from './ReportsPage'

beforeEach(() => {
  const report = {
    key: 'equipment.byStatus',
    title: 'Hiện trạng thiết bị',
    group: 'equipment',
    params: {
      type: 'object',
      properties: { from: { type: 'string', format: 'date', title: 'Từ ngày' } },
    },
    columns: [{ key: 'status', title: 'Trạng thái', type: 'string' }],
  }
  server.use(
    http.get('/v1/reports', () =>
      HttpResponse.json(
        Array.from({ length: 19 }, (_, index) =>
          index === 0
            ? report
            : index === 1
              ? {
                  ...report,
                  key: 'equipment.byRoom',
                  title: 'Thiết bị theo phòng',
                  params: {
                    type: 'object',
                    properties: { departmentId: { type: 'string', format: 'uuid' } },
                  },
                  columns: [
                    { key: 'department', title: 'Khoa', type: 'string' },
                    { key: 'room', title: 'Phòng', type: 'string' },
                    { key: 'total', title: 'Tổng', type: 'number' },
                  ],
                }
              : { ...report, key: `report.${index}`, title: `Báo cáo ${index}` },
        ),
      ),
    ),
  )
})

it('lists contracted reports', async () => {
  useAuthStore.getState().setSession(fakeSession())
  renderWithProviders(<Component />)
  expect(await screen.findByText('Hiện trạng thiết bị')).toBeVisible()
})

it('renders date params from json schema', async () => {
  useAuthStore.getState().setSession(fakeSession())
  renderWithProviders(<Component />)
  await userEvent.click(await screen.findByText('Hiện trạng thiết bị'))
  expect(await screen.findByLabelText('Từ ngày')).toBeVisible()
})

it('renders all 19 reports returned by the registry (có "Thiết bị theo phòng")', async () => {
  useAuthStore.getState().setSession(fakeSession())
  renderWithProviders(<Component />)
  expect(await screen.findByText('Báo cáo 18')).toBeVisible()
  expect(document.querySelectorAll('[data-testid="report-list"] button')).toHaveLength(19)
  expect(screen.getByText('Thiết bị theo phòng')).toBeVisible()
})

it('báo cáo theo phòng: chạy với tham số Khoa/Phòng ban và hiện cột Phòng', async () => {
  server.use(
    http.get('/v1/departments', () =>
      HttpResponse.json([{ id: 'd1', code: 'XN', name: 'Khoa Xét nghiệm' }]),
    ),
    http.get('/v1/reports/equipment.byRoom', ({ request }) => {
      const url = new URL(request.url)
      if (url.searchParams.get('format') !== 'json') return HttpResponse.json({})
      return HttpResponse.json({
        columns: [
          { key: 'department', title: 'Khoa', type: 'string' },
          { key: 'room', title: 'Phòng', type: 'string' },
          { key: 'total', title: 'Tổng', type: 'number' },
        ],
        rows: [{ department: 'Khoa Xét nghiệm', room: 'Phòng Huyết học', total: 4 }],
        total: 1,
        page: 1,
        limit: 20,
      })
    }),
  )
  useAuthStore.getState().setSession(fakeSession())
  renderWithProviders(<Component />)
  await userEvent.click(await screen.findByText('Thiết bị theo phòng'))
  expect(await screen.findByRole('combobox', { name: 'Khoa/Phòng ban' })).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Xem' }))
  expect(await screen.findByText('Phòng Huyết học')).toBeVisible()
  expect(screen.getByRole('columnheader', { name: 'Phòng' })).toBeVisible()
})
