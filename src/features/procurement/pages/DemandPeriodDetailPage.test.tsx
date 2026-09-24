import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

/** Dòng tổng hợp có `onHand` + gợi ý "Nên lấy từ kho" (tồn ≥ yêu cầu). */
const consolidationRow = {
  id: 'c1',
  periodId: 'dp1',
  key: 'supply:sp1',
  itemType: 'supply',
  supplyId: 'sp1',
  supplyCode: 'VT01',
  itemName: 'Găng tay',
  spec: null,
  unit: 'Hộp',
  qtyRequested: '200.0000',
  qtyApproved: '200.0000',
  onHand: '150.0000',
  unitPricePlan: '50000.0000',
  amountPlan: '10000000.0000',
  breakdown: [
    {
      departmentId: 'dep1',
      departmentName: 'Nội khoa',
      requestId: 'dr1',
      lineId: 'dl1',
      qtyRequested: '200.0000',
      qtyApproved: '200.0000',
    },
  ],
  decision: 'buy',
  suggestedDecision: 'from_stock',
  note: null,
  sortOrder: 1,
}

const periodSummary = {
  departmentsTotal: 15,
  departmentsSubmitted: 12,
  totalRequested: '2250000',
  totalApproved: '2250000',
  byItemType: [],
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

it('B5 — Tổng hợp có cột Tồn kho và chip "Nên lấy từ kho" bấm để áp quyết định', async () => {
  let patchBody: unknown = null
  server.use(
    http.get('/v1/demand/periods/dp1/consolidation', () =>
      HttpResponse.json({ items: [consolidationRow] }),
    ),
    http.patch('/v1/demand/consolidation/c1', async ({ request }) => {
      patchBody = await request.json()
      return HttpResponse.json({ items: [consolidationRow] })
    }),
  )
  renderPage()
  const user = userEvent.setup()
  await user.click(await screen.findByRole('tab', { name: 'Tổng hợp' }))
  expect(await screen.findByText('Tồn kho')).toBeInTheDocument()
  expect(screen.getByText('150')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Nên lấy từ kho' }))
  await waitFor(() => expect(patchBody).toEqual({ decision: 'from_stock' }))
})

it('B5 — kỳ đã duyệt: chip gợi ý chỉ là nhãn, không bấm được', async () => {
  useAuthStore.getState().setSession(sessionWith(['HOSPITAL_ADMIN']))
  server.use(
    http.get('/v1/demand/periods/dp1', () => HttpResponse.json({ ...period, status: 'approved' })),
    http.get('/v1/demand/periods/dp1/consolidation', () =>
      HttpResponse.json({ items: [consolidationRow] }),
    ),
    http.get('/v1/demand/periods/dp1/summary', () => HttpResponse.json(periodSummary)),
  )
  renderPage()
  const user = userEvent.setup()
  await user.click(await screen.findByRole('tab', { name: 'Tổng hợp' }))
  expect(await screen.findByText('Nên lấy từ kho')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Nên lấy từ kho' })).not.toBeInTheDocument()
})

it('B1 — ADM + kỳ đã duyệt: Sao chép mở form mặc định +1 năm, gọi API rồi điều hướng', async () => {
  let cloneBody: Record<string, unknown> | null = null
  server.use(
    http.get('/v1/demand/periods/dp1', () => HttpResponse.json({ ...period, status: 'approved' })),
    http.get('/v1/demand/periods/dp1/consolidation', () => HttpResponse.json({ items: [] })),
    http.get('/v1/demand/periods/dp1/summary', () => HttpResponse.json(periodSummary)),
    http.post('/v1/demand/periods/dp1/clone', async ({ request }) => {
      cloneBody = (await request.json()) as Record<string, unknown>
      return HttpResponse.json({ ...period, id: 'dp2', name: 'Dự trù năm 2027', year: 2027 })
    }),
  )
  const { router } = renderPage()
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Sao chép sang kỳ mới' }))
  expect(await screen.findByDisplayValue('Dự trù năm 2027')).toBeInTheDocument()
  expect(screen.getByDisplayValue('2027')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Tạo kỳ mới' }))
  await waitFor(() =>
    expect(cloneBody).toMatchObject({
      name: 'Dự trù năm 2027',
      kind: 'annual',
      year: 2027,
      submitDeadline: expect.stringMatching(/^2027-10-3\d$/),
    }),
  )
  await waitFor(() =>
    expect(router.state.location.pathname).toBe('/procurement/demand/periods/dp2'),
  )
})

it('B1 — kỳ đang tổng hợp: không hiện nút Sao chép', async () => {
  renderPage()
  expect(await screen.findByText('Dự trù năm 2026')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Sao chép sang kỳ mới' })).not.toBeInTheDocument()
})

it('B1 — chỉ ADM: nhân viên vật tư không thấy nút Sao chép', async () => {
  useAuthStore.getState().setSession(sessionWith(['EQUIPMENT_STAFF']))
  server.use(
    http.get('/v1/demand/periods/dp1', () => HttpResponse.json({ ...period, status: 'approved' })),
    http.get('/v1/demand/periods/dp1/consolidation', () => HttpResponse.json({ items: [] })),
    http.get('/v1/demand/periods/dp1/summary', () => HttpResponse.json(periodSummary)),
  )
  renderPage()
  expect(await screen.findByText('Dự trù năm 2026')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Sao chép sang kỳ mới' })).not.toBeInTheDocument()
})

it('B2 — "Tính lại" cảnh báo mất chỉnh sửa, nút nguy hiểm, chỉ gọi API khi xác nhận', async () => {
  let rebuilds = 0
  server.use(
    http.get('/v1/demand/periods/dp1/consolidation', () =>
      HttpResponse.json({ items: [consolidationRow] }),
    ),
    http.post('/v1/demand/periods/dp1/consolidation/rebuild', () => {
      rebuilds += 1
      return HttpResponse.json({ items: [] })
    }),
  )
  renderPage()
  const user = userEvent.setup()
  await user.click(await screen.findByRole('tab', { name: 'Tổng hợp' }))
  await user.click(await screen.findByRole('button', { name: 'Tính lại' }))
  expect(
    await screen.findByText(/mọi SL duyệt, quyết định và ghi chú bạn đã chỉnh ở bảng này sẽ mất/),
  ).toBeInTheDocument()
  expect(rebuilds).toBe(0)
  const dialog = screen.getByRole('alertdialog')
  const dangerButton = within(dialog).getByRole('button', { name: 'Tính lại' })
  expect(dangerButton.className).toContain('bg-destructive')
  await user.click(dangerButton)
  await waitFor(() => expect(rebuilds).toBe(1))
})
