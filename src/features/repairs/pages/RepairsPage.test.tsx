import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { dayRangeToIso } from '@/lib/format/date-range'
import { Component } from './RepairsPage'

const row = {
  id: 'r1',
  code: 'SC-202609-0001',
  equipmentId: 'e1',
  equipment: { id: 'e1', code: 'TB-1', name: 'Máy huyết học' },
  reportedDepartmentId: 'd1',
  severity: 'high',
  equipmentDown: true,
  status: 'new',
  assignee: null,
  assigneeId: null,
  assistantIds: [],
  dueAt: '2026-09-18T00:00:00Z',
  isOverdue: true,
  createdAt: '2026-09-17T00:00:00Z',
  updatedAt: '2026-09-17T00:00:00Z',
  totalCost: '0',
  costWarning: false,
  description: 'Hỏng',
  diagnosis: null,
  errorCode: null,
  faultId: null,
  faultGroupId: null,
  resolutionType: null,
  resolutionSummary: null,
  postRepairWarrantyUntil: null,
  rating: null,
  ratingNote: null,
  reportedBy: null,
  acceptedAt: null,
  acceptedByDeptAt: null,
  completedAt: null,
  closedAt: null,
  startedAt: null,
  slaNotifiedAt: null,
  slaLastRemindedAt: null,
  dueAtOverridden: false,
  calibrationRequired: false,
  calibrationTicketId: null,
}

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/repairs', () =>
      HttpResponse.json({ items: [row], total: 1, page: 1, limit: 20 }),
    ),
    http.get('/v1/departments', () => HttpResponse.json({ items: [] })),
    http.get('/v1/users', () => HttpResponse.json({ items: [] })),
    http.get('/v1/equipment', () => HttpResponse.json({ items: [] })),
  )
})

it('lists tickets and keeps search on the URL', async () => {
  const urls: string[] = []
  server.use(
    http.get('/v1/repairs', ({ request }) => {
      urls.push(request.url)
      return HttpResponse.json({ items: [row], total: 1, page: 1, limit: 20 })
    }),
  )
  const { router } = renderWithProviders(<Component />)
  expect(await screen.findByRole('link', { name: 'SC-202609-0001' })).toHaveAttribute(
    'href',
    '/repairs/r1',
  )
  expect(screen.getByText('Máy huyết học', { exact: false })).toBeVisible()
  expect(screen.getByLabelText('Máy ngừng')).toBeVisible()
  expect(screen.getAllByText('Quá hạn').length).toBeGreaterThan(0)
  await userEvent.type(screen.getByLabelText('Tìm phiếu'), 'sc')
  await waitFor(() => expect(urls.some((u) => u.includes('q=sc'))).toBe(true))
  expect(router.state.location.search).toContain('q=sc')
})

it('applies the mine preset', async () => {
  const urls: string[] = []
  server.use(
    http.get('/v1/repairs', ({ request }) => {
      urls.push(request.url)
      return HttpResponse.json({ items: [row], total: 1, page: 1, limit: 20 })
    }),
  )
  renderWithProviders(<Component />)
  await screen.findByText('SC-202609-0001')
  await userEvent.click(screen.getByRole('button', { name: 'Của tôi' }))
  await waitFor(() => expect(urls.some((u) => u.includes('assigneeId=me'))).toBe(true))
})

it('gửi nhiều trạng thái dạng a,b', async () => {
  const urls: string[] = []
  server.use(
    http.get('/v1/repairs', ({ request }) => {
      urls.push(request.url)
      return HttpResponse.json({ items: [row], total: 1, page: 1, limit: 20 })
    }),
  )
  renderWithProviders(<Component />)
  await screen.findByText('SC-202609-0001')
  await userEvent.click(screen.getByRole('combobox', { name: 'Trạng thái' }))
  await userEvent.click(await screen.findByRole('option', { name: 'Mới' }))
  await userEvent.click(screen.getByRole('option', { name: 'Đang xử lý' }))
  await waitFor(() =>
    expect(urls.some((u) => new URL(u).searchParams.get('status') === 'new,in_progress')).toBe(
      true,
    ),
  )
})

it('gửi from/to dạng ISO theo ngày local', async () => {
  const urls: string[] = []
  server.use(
    http.get('/v1/repairs', ({ request }) => {
      urls.push(request.url)
      return HttpResponse.json({ items: [row], total: 1, page: 1, limit: 20 })
    }),
  )
  renderWithProviders(<Component />, { route: '/repairs?from=2026-09-01&to=2026-09-30' })
  const range = dayRangeToIso('2026-09-01', '2026-09-30')
  await waitFor(() => {
    const url = urls.map((item) => new URL(item)).find((item) => item.searchParams.get('from'))
    expect(url?.searchParams.get('from')).toBe(range.from)
    expect(url?.searchParams.get('to')).toBe(range.to)
  })
})
