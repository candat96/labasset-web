import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './PerformancePage'

const area = (score: number) => ({
  score,
  volume: 100,
  onTime: 100,
  speed: 100,
  quality: 100,
  credits: 4,
  items: 4,
  skipped: 0,
})

const staff = (over: Record<string, unknown>) => ({
  userId: 'u1',
  fullName: 'Nguyễn Văn An',
  departmentId: null,
  inactive: false,
  total: 90,
  rank: 1,
  insufficient: false,
  credits: 8,
  items: 8,
  onTime: 100,
  avgHandleHours: 2,
  avgQuality: 95,
  skipped: 0,
  areas: { repair: area(90), maintenance: null, calibration: null },
  rankChange: null,
  ...over,
})

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

const periods = {
  type: 'month',
  periods: [
    {
      type: 'month',
      start: '2026-08-01',
      end: '2026-08-31',
      locked: false,
      lockedBy: null,
      lockedAt: null,
      note: null,
    },
    {
      type: 'month',
      start: '2026-09-01',
      end: '2026-09-30',
      locked: false,
      lockedBy: null,
      lockedAt: null,
      note: null,
    },
  ],
}

const board = {
  type: 'month',
  start: '2026-09-01',
  end: '2026-09-30',
  locked: false,
  lockedBy: null,
  lockedAt: null,
  note: null,
  weights,
  totals: { items: 10, credits: 10, onTime: 100, avgHandleHours: 2, avgQuality: 95 },
  staff: [
    staff({ userId: 'u1', fullName: 'Nguyễn Văn An', rank: 1, total: 90 }),
    staff({
      userId: 'u2',
      fullName: 'Trần Thị Bích',
      rank: 2,
      total: 80,
      areas: { repair: null, maintenance: area(80), calibration: null },
    }),
    staff({
      userId: 'u3',
      fullName: 'Lê Văn Cường',
      rank: 3,
      total: 70,
      areas: { repair: null, maintenance: null, calibration: area(70) },
    }),
    staff({
      userId: 'u4',
      fullName: 'Phạm Thị Dung',
      rank: null,
      insufficient: true,
      total: null,
      credits: 1,
      items: 1,
      areas: { repair: area(50), maintenance: null, calibration: null },
    }),
  ],
}

function renderPage(over: Record<string, unknown> = {}, route = '/performance') {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/performance/periods', () => HttpResponse.json(periods)),
    http.get('/v1/performance', () => HttpResponse.json({ ...board, ...over })),
    http.get('/v1/departments', () => HttpResponse.json([])),
    http.get('/v1/users', () => HttpResponse.json({ items: [], total: 0, page: 1, limit: 50 })),
  )
  return renderWithProviders(<Component />, { route, path: '/performance' })
}

it('hiện huy hiệu top 3 và nhóm chưa đủ mẫu ở cuối', async () => {
  renderPage()
  expect(await screen.findByText('Nguyễn Văn An')).toBeInTheDocument()
  expect(screen.getByTestId('rank-1')).toHaveTextContent('Nguyễn Văn An')
  expect(screen.getByTestId('rank-2')).toHaveTextContent('Trần Thị Bích')
  expect(screen.getByText('Chưa đủ mẫu')).toBeInTheDocument()
  expect(screen.getByText('Phạm Thị Dung')).toBeInTheDocument()
})

it('đổi loại kỳ gọi lại API với type=quarter', async () => {
  const urls: string[] = []
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/performance/periods', () => HttpResponse.json(periods)),
    http.get('/v1/performance', ({ request }) => {
      urls.push(request.url)
      return HttpResponse.json(board)
    }),
    http.get('/v1/departments', () => HttpResponse.json([])),
    http.get('/v1/users', () => HttpResponse.json({ items: [], total: 0, page: 1, limit: 50 })),
  )
  renderWithProviders(<Component />, { route: '/performance', path: '/performance' })
  await screen.findByText('Nguyễn Văn An')
  await userEvent.click(screen.getByRole('tab', { name: 'Quý' }))
  await waitFor(() => expect(urls.some((url) => url.includes('type=quarter'))).toBe(true))
})

it('kỳ đã chốt hiện nhãn và ẩn nút Chốt kỳ', async () => {
  renderPage({ locked: true, lockedBy: 'Quản trị viên', lockedAt: '2026-10-05T10:00:00Z' })
  expect(await screen.findByText(/Đã chốt/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Chốt kỳ' })).toBeNull()
})

it('kỳ năm không có nút Chốt kỳ và ghi rõ không chốt', async () => {
  renderPage({ type: 'year' }, '/performance?type=year')
  expect(screen.queryByRole('button', { name: 'Chốt kỳ' })).toBeNull()
  expect(await screen.findByText(/Số liệu tổng hợp, không chốt/)).toBeInTheDocument()
})

it('kỳ chưa kết thúc thì nút Chốt kỳ bị khoá', async () => {
  renderPage({ end: '2999-12-31' })
  const button = await screen.findByRole('button', { name: 'Chốt kỳ' })
  expect(button).toBeDisabled()
})

it('kỳ đã chốt không có thời gian xử lý TB hiện dấu — kèm gợi ý, không NaN', async () => {
  renderPage({
    locked: true,
    lockedBy: 'Quản trị viên',
    lockedAt: '2026-10-05T10:00:00Z',
    totals: { items: 10, credits: 10, onTime: 100, avgHandleHours: null, avgQuality: 95 },
  })
  expect(await screen.findByText('Bản chốt không lưu thời gian xử lý')).toBeInTheDocument()
  expect(screen.queryByText(/NaN/)).toBeNull()
})
