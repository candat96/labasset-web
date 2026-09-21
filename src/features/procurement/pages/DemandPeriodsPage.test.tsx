import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component as DemandPeriodsPage } from './DemandPeriodsPage'

const period = {
  id: 'dp1',
  code: 'DT-2026',
  name: 'Dự trù năm 2026',
  kind: 'annual',
  year: 2026,
  buckets: 12,
  status: 'collecting',
  submitDeadline: '2026-10-31T00:00:00Z',
  notes: null,
  approvedBy: null,
  approvedAt: null,
  consolidatedAt: null,
  closedAt: null,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  progress: { total: 15, submitted: 12, deptApproved: 8, accepted: 6 },
  totalRequested: '15000000',
  totalApproved: '14000000',
}

const myRequestBase = {
  id: 'dr1',
  periodId: 'dp1',
  departmentId: 'dep1',
  department: { id: 'dep1', code: 'NOI', name: 'Nội' },
  status: 'draft',
  createdById: 'u1',
  createdAt: '2026-09-02T00:00:00Z',
  updatedAt: '2026-09-02T00:00:00Z',
  totalEstimated: '500000',
  notes: null,
  returnReason: null,
  submittedAt: null,
  deptApprovedBy: null,
  deptApprovedAt: null,
  createdBy: null,
  period: { id: 'dp1', code: 'DT-2026', name: 'Dự trù năm 2026', status: 'collecting' },
}

const myRequest = {
  ...myRequestBase,
  lines: [{ id: 'dl1' }, { id: 'dl2' }, { id: 'dl3' }],
}

function setupPeriodHandlers() {
  server.use(
    http.get('/v1/demand/periods', ({ request }) => {
      if (!request.headers.get('Authorization')?.startsWith('Bearer ')) {
        return HttpResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 })
      }
      // Danh sách item T2 không progress — card fetch chi tiết riêng.
      const { progress: _ignored, ...listItem } = period
      void _ignored
      return HttpResponse.json({ items: [listItem], total: 1, page: 1, limit: 20 })
    }),
    http.get('/v1/demand/periods/dp1', ({ request }) => {
      if (!request.headers.get('Authorization')?.startsWith('Bearer ')) {
        return HttpResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 })
      }
      return HttpResponse.json(period)
    }),
  )
}

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  setupPeriodHandlers()
  server.use(
    http.get('/v1/demand/my', ({ request }) => {
      if (!request.headers.get('Authorization')?.startsWith('Bearer ')) {
        return HttpResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 })
      }
      // T2 thật: trang phẳng {items,total,page,limit} (không còn {toSubmit,...})
      return HttpResponse.json({ items: [myRequest], total: 1, page: 1, limit: 20 })
    }),
  )
})

it('ADM: hiển thị card kỳ đang mở với tiến độ và tổng tiền', async () => {
  renderWithProviders(<DemandPeriodsPage />)
  expect((await screen.findAllByText('Dự trù năm 2026')).length).toBeGreaterThan(0)
  expect(await screen.findByText('12/15 khoa đã nộp')).toBeInTheDocument()
  await waitFor(() => screen.getByText('15.000.000'))
})

it('ADM: bảng kỳ có link mã + badge trạng thái', async () => {
  renderWithProviders(<DemandPeriodsPage />)
  expect((await screen.findAllByRole('link', { name: 'DT-2026' }))[0]!.getAttribute('href')).toBe(
    '/procurement/demand/periods/dp1',
  )
})

it('ADM: tạo kỳ gửi đúng body', async () => {
  const saved: unknown[] = []
  server.use(
    http.post('/v1/demand/periods', async ({ request }) => {
      if (!request.headers.get('Authorization')?.startsWith('Bearer ')) {
        return HttpResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 })
      }
      saved.push(await request.json())
      return HttpResponse.json({ ...period, id: 'dp2', code: 'DT-Q1-2026', status: 'draft' })
    }),
  )
  renderWithProviders(<DemandPeriodsPage />)
  await screen.findByText('12/15 khoa đã nộp')
  await userEvent.click(screen.getByRole('button', { name: 'Tạo kỳ' }))
  await userEvent.type(await screen.findByLabelText('Tên kỳ'), 'Quý bổ sung')
  await userEvent.clear(await screen.findByLabelText('Năm (yyyy)'))
  await userEvent.type(screen.getByLabelText('Năm (yyyy)'), '2026')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(saved).toHaveLength(1))
  expect(saved[0]).toMatchObject({ name: 'Quý bổ sung', kind: 'annual', year: 2026 })
})

it('DEPT_USER: xem phiếu khoa mình và không thấy nút tạo kỳ', async () => {
  useAuthStore.getState().setSession(fakeSession(['DEPT_USER']))
  renderWithProviders(<DemandPeriodsPage />)
  expect(await screen.findByText('Dự trù năm 2026')).toBeInTheDocument()
  await screen.findByText('3')
  expect(screen.queryByRole('button', { name: 'Tạo kỳ' })).toBeNull()
})
