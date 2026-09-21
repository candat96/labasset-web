import { screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeUser } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './DemandPeriodDetailPage'

const sessionWith = (roles: string[], extra: Record<string, unknown> = {}) => ({
  accessToken: 'A1',
  refreshToken: 'R1',
  tenantId: 'T1',
  user: fakeUser(roles, extra),
})

const period = {
  id: 'dp1',
  code: 'DT-2026',
  name: 'Dự trù năm 2026',
  kind: 'annual',
  year: 2026,
  quarter: null,
  buckets: 12,
  status: 'consolidating',
  submitDeadline: '2026-10-31T00:00:00Z',
  notes: null,
  approvedBy: null,
  approvedAt: null,
  consolidatedAt: null,
  closedAt: null,
  cancelReason: null,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  progress: { total: 15, submitted: 12, deptApproved: 8, accepted: 6 },
}

const summary = {
  departmentId: 'dep1',
  departmentCode: 'NOI',
  departmentName: 'Nội khoa',
  requestId: 'dr1',
  lineCount: 3,
  status: 'dept_approved',
  totalEstimated: '2250000',
}

function renderPage() {
  return renderWithProviders(<Component />, {
    route: '/procurement/demand/periods/dp1',
    path: '/procurement/demand/periods/:id',
  })
}

beforeEach(() => {
  useAuthStore.getState().setSession(sessionWith(['HOSPITAL_ADMIN']))
  server.use(
    http.get('/v1/demand/periods/dp1', () => HttpResponse.json(period)),
    http.get('/v1/demand/periods/dp1/requests', () =>
      HttpResponse.json({
        items: [summary],
        total: 1,
        page: 1,
        limit: 20,
        progress: { total: 15, submitted: 12, deptApproved: 8, accepted: 6 },
      }),
    ),
  )
})

it('chi tiết kỳ: aside có tiến độ 12/15 khoa đã nộp và hạn nộp', async () => {
  renderPage()
  expect(await screen.findByText('12/15 khoa đã nộp')).toBeInTheDocument()
  expect(screen.getByText('Dự trù năm 2026')).toBeInTheDocument()
})

it('Tổng hợp/thiết bị/dịch vụ chỉ hiện với STAFF/ADM', async () => {
  renderPage()
  expect(await screen.findByText('Nội khoa')).toBeInTheDocument()
  expect(screen.getByText('Tổng hợp')).toBeInTheDocument()
  expect(screen.getByText('Thiết bị mới')).toBeInTheDocument()
  expect(screen.getByText('Dịch vụ')).toBeInTheDocument()
})

it('DEPT không thấy tab Tổng hợp — chỉ tab phiếu các khoa', async () => {
  useAuthStore
    .getState()
    .setSession(sessionWith(['DEPT_USER'], { departmentId: 'dep1', departmentName: 'Nội khoa' }))
  renderPage()
  expect(await screen.findByText('Dự trù năm 2026')).toBeInTheDocument()
  expect(screen.queryByText('Tổng hợp')).not.toBeInTheDocument()
  expect(screen.queryByText('Thiết bị mới')).not.toBeInTheDocument()
})
