import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component as CalendarPage, eventTimeLabel } from './CalendarPage'

const item = (over: Record<string, unknown> = {}) => ({
  id: 'm1',
  type: 'maintenance',
  title: 'Bảo dưỡng BD-2001',
  equipment: { id: 'e1', code: 'TB-1', name: 'Máy XN' },
  start: '2026-09-20T00:00:00',
  end: '2026-09-20T00:00:00',
  status: 'scheduled',
  assigneeId: null,
  assigneeName: null,
  movable: true,
  ...over,
})

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
})

it('hiện nhãn nút lịch bằng tiếng Việt', async () => {
  server.use(http.get('/v1/calendar', () => HttpResponse.json({ items: [] })))
  renderWithProviders(<CalendarPage />)
  expect(await screen.findByRole('button', { name: 'Hôm nay' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Tháng' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Tuần' })).toBeVisible()
})

it('giới hạn sự kiện mỗi ngày và hiện "+N nữa"', async () => {
  const now = new Date()
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-15`
  const items = Array.from({ length: 6 }, (_, i) =>
    item({
      id: `m${i}`,
      title: `Bảo dưỡng BD-${i}`,
      start: `${day}T00:00:00`,
      end: `${day}T00:00:00`,
    }),
  )
  server.use(http.get('/v1/calendar', () => HttpResponse.json({ items })))
  renderWithProviders(<CalendarPage />)
  expect(await screen.findByText('+3 nữa')).toBeVisible()
})

describe('eventTimeLabel', () => {
  it('bỏ giờ vô nghĩa khi công việc chỉ có ngày', () => {
    expect(eventTimeLabel('2026-09-20T00:00:00')).toBeNull()
  })

  it('hiện giờ dạng HH:mm khi công việc có giờ cụ thể', () => {
    expect(eventTimeLabel('2026-09-20T15:05:00')).toBe('15:05')
  })
})
