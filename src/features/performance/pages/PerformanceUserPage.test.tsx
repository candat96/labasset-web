import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './PerformanceUserPage'

const weights = {
  areaWeights: { repair: 50, maintenance: 30, calibration: 20 },
  metricWeights: {
    repair: { volume: 30, onTime: 30, speed: 20, quality: 20 },
    maintenance: { volume: 30, onTime: 30, speed: 20, quality: 20 },
    calibration: { volume: 40, onTime: 40, quality: 20 },
  },
  minItems: 3,
  assistantWeight: 0.5,
  countBy: 'completed' as const,
}

const periods = [4, 5, 6, 7, 8, 9].map((month) => ({
  type: 'month',
  start: `2026-${String(month).padStart(2, '0')}-01`,
  end: `2026-${String(month).padStart(2, '0')}-28`,
  total: month === 9 ? 86.9 : null,
  rank: month === 9 ? 3 : null,
}))

const person = (over: Record<string, unknown> = {}) => ({
  userId: 'u1',
  fullName: 'Nguyễn Văn An',
  inactive: false,
  type: 'month',
  start: '2026-09-01',
  end: '2026-09-30',
  total: 86.9,
  rank: 3,
  insufficient: false,
  credits: 8,
  items: 8,
  onTime: 100,
  skipped: 0,
  areas: {
    repair: {
      score: 85,
      volume: 50,
      onTime: 100,
      speed: 100,
      quality: 100,
      credits: 4,
      items: 4,
      skipped: 0,
    },
    maintenance: {
      score: 90,
      volume: 100,
      onTime: 100,
      speed: 50,
      quality: 100,
      credits: 4,
      items: 4,
      skipped: 0,
    },
    calibration: null,
  },
  weights,
  periods,
  tasks: {
    items: [
      {
        area: 'repair',
        id: 't1',
        code: 'SC-202609-0012',
        title: 'Máy thở',
        equipmentName: 'Máy thở',
        departmentName: 'Khoa Hồi sức tích cực',
        completedAt: '2026-09-21T04:27:21.015Z',
        onTime: true,
        quality: 100,
      },
    ],
    total: 1,
    page: 1,
    limit: 20,
  },
  ...over,
})

function renderPage(over: Record<string, unknown> = {}) {
  useAuthStore.getState().setSession(fakeSession())
  server.use(http.get('/v1/performance/users/u1', () => HttpResponse.json(person(over))))
  return renderWithProviders(<Component />, {
    route: '/performance/users/u1',
    path: '/performance/users/:id',
  })
}

it('hiện điểm tổng, ba mảng, đầu việc và biểu đồ 6 kỳ', async () => {
  renderPage()
  expect(await screen.findByText('Nguyễn Văn An')).toBeInTheDocument()
  expect(screen.getByText('Hạng 3')).toBeInTheDocument()
  expect(screen.getByText('86,9')).toBeInTheDocument()
  expect(screen.getByText('Điểm tổng 6 kỳ gần nhất')).toBeInTheDocument()
  expect(screen.getByText('SC-202609-0012')).toBeInTheDocument()
  expect(screen.getAllByText('Đúng hạn').length).toBeGreaterThan(0)
})

it('người chưa đủ mẫu hiện nhãn và mảng trống báo không có việc', async () => {
  renderPage({ rank: null, insufficient: true })
  expect(await screen.findByText('Chưa đủ mẫu')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('tab', { name: 'Kiểm định' }))
  expect(screen.getByText('Không có việc ở mảng này')).toBeInTheDocument()
})
