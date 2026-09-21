import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeUser } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component, splitEvenly, sumQty } from './DemandRequestPage'

/** Session khoa cụ thể (DEPT cần departmentId cho guard own-department). */
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
  buckets: 12,
  status: 'collecting',
  submitDeadline: '2026-12-31T00:00:00Z',
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

const line = {
  id: 'dl1',
  requestId: 'dr1',
  itemType: 'supply',
  supplyId: 'sp1',
  equipmentId: null,
  itemName: 'Găng tay',
  spec: null,
  unit: 'Hộp',
  qtyByBucket: ['3', '0', '0', '0', '0', '0', '42', '0', '0', '0', '0', '0'],
  qtyRequested: '45',
  unitPriceEst: '50000',
  amountEst: '2250000',
  reason: '',
  priority: 'normal',
  suggestedQty: null,
  suggestion: null,
  qtyApproved: null,
  approverNote: null,
  sortOrder: 1,
}

const request = {
  id: 'dr1',
  periodId: 'dp1',
  departmentId: 'dep1',
  department: { id: 'dep1', code: 'NOI', name: 'Nội' },
  status: 'draft',
  createdBy: 'u1',
  creator: { id: 'u1', fullName: 'Nguyễn Văn' },
  createdAt: '2026-09-02T00:00:00Z',
  updatedAt: '2026-09-02T00:00:00Z',
  submittedAt: null,
  deptApprovedBy: null,
  deptApprovedAt: null,
  returnReason: null,
  notes: null,
  totalEstimated: '2250000',
  period: { id: 'dp1', code: 'DT-2026', name: 'Dự trù năm 2026', status: 'collecting' },
  lines: [line],
}

const lineWithSuggestion = {
  ...line,
  suggestedQty: '1200',
  suggestion: {
    consumption12m: '1100',
    avgMonthly: '91.7',
    onHand: '150',
    runwayDays: 41,
    minStock: '200',
    maxStock: null,
    lastUnitPrice: '50000',
    basis: 'consumption',
  },
}

function renderPage() {
  return renderWithProviders(<Component />, {
    route: '/procurement/demand/requests/dr1',
    path: '/procurement/demand/requests/:id',
  })
}

beforeEach(() => {
  useAuthStore
    .getState()
    .setSession(sessionWith(['DEPT_USER'], { departmentId: 'dep1', departmentName: 'Nội' }))
  server.use(
    http.get('/v1/demand/requests/dr1', ({ request: req }) => {
      if (!req.headers.get('Authorization')?.startsWith('Bearer ')) {
        return HttpResponse.json({ code: 'UNAUTHORIZED' }, { status: 401 })
      }
      return HttpResponse.json(request)
    }),
    http.get('/v1/demand/periods/dp1', () => HttpResponse.json(period)),
    http.get('/v1/supplies', () =>
      HttpResponse.json({
        items: [{ id: 'sp1', code: 'VT01', name: 'Găng tay' }],
        total: 1,
        page: 1,
        limit: 50,
      }),
    ),
    http.post('/v1/demand/requests/dr1/submit', () =>
      HttpResponse.json({ ...request, status: 'submitted' }),
    ),
  )
})

it('splitEvenly: chia đều 12 tháng, số dư dồn tháng cuối', () => {
  expect(splitEvenly('1200', 12)[11]).toBe('100')
  // số lượng ≤ 3 thập phân: base làm tròn xuống 100.083, phần dư 0.004 dồn tháng cuối
  expect(splitEvenly('1201', 12)[0]).toBe('100.083')
  expect(splitEvenly('1201', 12)[11]).toBe('100.087')
  expect(sumQty(splitEvenly('1201', 12))).toBe('1201')
  expect(splitEvenly('0', 12).filter((c) => c !== '0')).toHaveLength(0)
  // chuỗi Decimal — giữ giá trị lớn không mất số (không parseFloat)
  expect(splitEvenly('15000000', 12)[1]).toBe('1250000')
})

it('ADM: STAFF thấy nút Tiếp nhận khi trưởng khoa đã duyệt', async () => {
  useAuthStore.getState().setSession(sessionWith(['HOSPITAL_ADMIN']))
  server.use(
    http.get('/v1/demand/requests/dr1', () =>
      HttpResponse.json({ ...request, status: 'dept_approved' }),
    ),
  )
  renderPage()
  expect(await screen.findByText('Trưởng khoa đã duyệt')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Tiếp nhận' })).toBeInTheDocument()
})

it('DEPT_USER: gửi phiếu đúng endpoint submit', async () => {
  renderPage()
  const btn = await screen.findByRole('button', { name: 'Gửi' })
  await userEvent.click(btn)
  await screen.findByText('Gửi phiếu để trưởng khoa duyệt?')
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
  await waitFor(() => expect(screen.getByText('Đã lưu')).toBeInTheDocument())
})

it('Trưởng khoa: duyệt phiếu dept-approve', async () => {
  useAuthStore
    .getState()
    .setSession(sessionWith(['DEPT_HEAD'], { departmentId: 'dep1', departmentName: 'Nội' }))
  let status = 'submitted'
  server.use(
    http.get('/v1/demand/requests/dr1', () => HttpResponse.json({ ...request, status })),
    http.post('/v1/demand/requests/dr1/dept-approve', () => {
      status = 'dept_approved'
      return HttpResponse.json({ ...request, status })
    }),
  )
  renderPage()
  const btn = await screen.findByRole('button', { name: 'Duyệt (trưởng khoa)' })
  await userEvent.click(btn)
  await screen.findByText('Trưởng khoa duyệt phiếu?')
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
  await waitFor(
    () => expect(screen.getAllByText('Trưởng khoa đã duyệt').length).toBeGreaterThan(0),
    { timeout: 3000 },
  )
})

/** Handler GET phiếu trả dòng có gợi ý (áp chip) + PATCH dòng ghi nhận body. */
function lineEditHandlers(patched: unknown[]) {
  server.use(
    http.get('/v1/demand/requests/dr1', () =>
      HttpResponse.json({ ...request, lines: [lineWithSuggestion] }),
    ),
    http.patch('/v1/demand/lines/dl1', async ({ request: req }) => {
      patched.push(await req.json())
      return HttpResponse.json(lineWithSuggestion)
    }),
  )
}

it('bảng dòng: ô 12 tháng T3 sửa 42 → PATCH /lines/:lineId qtyByBucket[2]="42"', async () => {
  const patched: unknown[] = []
  lineEditHandlers(patched)
  renderPage()
  const cell = await screen.findByRole('textbox', { name: /Găng tay T3/ })
  await userEvent.clear(cell)
  await userEvent.type(cell, '42')
  await userEvent.tab()
  await waitFor(() => expect(patched).toHaveLength(1))
  const body = patched[0] as { qtyByBucket: string[] }
  expect(body.qtyByBucket).toHaveLength(12)
  expect(body.qtyByBucket[2]).toBe('42')
})

it('bảng dòng: bấm chip gợi ý → PATCH qtyByBucket chia đều 12 tháng, Σ = suggestedQty', async () => {
  const patched: unknown[] = []
  lineEditHandlers(patched)
  renderPage()
  const chip = await screen.findByRole('button', { name: /1200/ })
  await userEvent.click(chip)
  await waitFor(() => expect(patched).toHaveLength(1))
  const body = patched[0] as { qtyByBucket: string[] }
  expect(body.qtyByBucket).toHaveLength(12)
  expect(sumQty(body.qtyByBucket)).toBe('1200')
})

it('bảng dòng: nút Thêm dòng → POST /requests/:id/lines body itemType=supply + 12 ô 0', async () => {
  const created: unknown[] = []
  server.use(
    http.post('/v1/demand/requests/dr1/lines', async ({ request: req }) => {
      created.push(await req.json())
      return HttpResponse.json(line)
    }),
  )
  renderPage()
  await userEvent.click(await screen.findByRole('button', { name: 'Thêm dòng' }))
  await waitFor(() => expect(created).toHaveLength(1))
  const body = created[0] as { itemType: string; qtyByBucket: string[] }
  expect(body).toMatchObject({ itemType: 'supply' })
  expect(body.qtyByBucket).toHaveLength(12)
  expect(body.qtyByBucket.every((v) => v === '0')).toBe(true)
  expect(screen.getAllByText('Đã thêm dòng').length).toBeGreaterThan(0)
})

it('VT/ADM: sửa SL duyệt từng dòng → POST accept {lines:[{id, qtyApproved}]}', async () => {
  useAuthStore.getState().setSession(sessionWith(['HOSPITAL_ADMIN']))
  const accepted: unknown[] = []
  server.use(
    http.get('/v1/demand/requests/dr1', () =>
      HttpResponse.json({
        ...request,
        status: 'submitted',
        lines: [{ ...line, qtyApproved: '10' }],
      }),
    ),
    http.post('/v1/demand/requests/dr1/accept', async ({ request: req }) => {
      accepted.push(await req.json())
      return HttpResponse.json({ ...request, status: 'accepted' })
    }),
  )
  renderPage()
  const input = await screen.findByRole('textbox', { name: /SL duyệt/ })
  await userEvent.clear(input)
  await userEvent.type(input, '8')
  await userEvent.tab()
  await waitFor(() => expect(accepted).toHaveLength(1))
  const body = accepted[0] as { lines: { id: string; qtyApproved: string }[] }
  expect(body.lines[0]).toMatchObject({ id: 'dl1', qtyApproved: '8' })
})
