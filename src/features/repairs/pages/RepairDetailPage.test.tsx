import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './RepairDetailPage'

const ticket = {
  id: 'r1',
  code: 'SC-202609-0001',
  equipmentId: 'e1',
  equipment: { id: 'e1', code: 'TB-1', name: 'Máy huyết học' },
  status: 'new',
  severity: 'medium',
  description: 'Kẹt kim',
  errorCode: null,
  diagnosis: null,
  faultId: null,
  faultGroupId: null,
  faultInfo: null,
  resolutionType: null,
  resolutionSummary: null,
  assignee: null,
  assigneeId: null,
  assistantIds: [],
  assignments: [],
  logs: [],
  parts: [],
  vendors: [],
  costs: [],
  attachments: {},
  equipmentSnapshot: null,
  reportedDepartmentId: 'd1',
  reportedBy: 'u2',
  dueAt: '2026-09-20T00:00:00Z',
  dueAtOverridden: false,
  isOverdue: false,
  equipmentDown: false,
  totalCost: '0',
  costWarning: false,
  rating: null,
  ratingNote: null,
  postRepairWarrantyUntil: null,
  calibrationRequired: false,
  calibrationTicketId: null,
  acceptedAt: null,
  acceptedByDeptAt: null,
  completedAt: null,
  closedAt: null,
  startedAt: null,
  slaNotifiedAt: null,
  slaLastRemindedAt: null,
  createdAt: '2026-09-19T00:00:00Z',
  updatedAt: '2026-09-19T00:00:00Z',
}

const acceptedAssignment = {
  id: 'a1',
  ticketId: 'r1',
  userId: 'u1',
  role: 'primary',
  response: 'accepted',
  responseNote: null,
  assignedAt: '2026-09-19T00:00:00Z',
  assignedBy: 'adm',
  respondedAt: '2026-09-19T00:00:00Z',
}

function stub(over: Record<string, unknown> = {}) {
  const row = { ...ticket, ...over }
  server.use(
    http.get('/v1/repairs/r1', () => HttpResponse.json(row)),
    http.get('/v1/settings/public', () => HttpResponse.json({ 'repair.requireAcceptance': true })),
    http.get('/v1/attachments', () => HttpResponse.json([])),
    http.get('/v1/audit-logs', () =>
      HttpResponse.json({ items: [], total: 0, page: 1, limit: 20 }),
    ),
    http.get('/v1/departments', () => HttpResponse.json({ items: [] })),
    http.post('/v1/repairs/r1/accept', () => HttpResponse.json({ ...row, status: 'accepted' })),
  )
  return row
}

it('shows accept for staff on a new ticket', async () => {
  stub()
  useAuthStore.getState().setSession(fakeSession(['EQUIPMENT_STAFF']))
  renderWithProviders(<Component />, { path: '/repairs/:id', route: '/repairs/r1' })
  expect(await screen.findByRole('button', { name: 'Tiếp nhận' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Phân công' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Hoàn thành' })).not.toBeInTheDocument()
})

it('hides write actions for department users on a new ticket', async () => {
  stub()
  useAuthStore.getState().setSession(fakeSession(['DEPT_USER']))
  renderWithProviders(<Component />, { path: '/repairs/:id', route: '/repairs/r1' })
  expect(await screen.findByText('Kẹt kim')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Tiếp nhận' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'In biên bản' })).toBeVisible()
})

it('shows complete for the assignee in progress', async () => {
  stub({ status: 'in_progress', assignments: [acceptedAssignment] })
  useAuthStore.getState().setSession(fakeSession(['EQUIPMENT_STAFF']))
  renderWithProviders(<Component />, { path: '/repairs/:id', route: '/repairs/r1' })
  expect(await screen.findByRole('button', { name: 'Hoàn thành' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Chẩn đoán' })).toBeVisible()
})

it('shows acceptance after completed', async () => {
  stub({ status: 'completed' })
  useAuthStore.getState().setSession(fakeSession(['DEPT_USER']))
  renderWithProviders(<Component />, { path: '/repairs/:id', route: '/repairs/r1' })
  expect(await screen.findByRole('button', { name: 'Nghiệm thu' })).toBeVisible()
})

it('staff can accept a new ticket', async () => {
  stub()
  useAuthStore.getState().setSession(fakeSession(['EQUIPMENT_STAFF']))
  renderWithProviders(<Component />, { path: '/repairs/:id', route: '/repairs/r1' })
  await userEvent.click(await screen.findByRole('button', { name: 'Tiếp nhận' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Xác nhận' }))
  expect(await screen.findByText('Đã cập nhật phiếu')).toBeVisible()
})

it('chỉ hiện trạng thái hợp lệ và bắt buộc ghi chú', async () => {
  const saved: { status?: string; note?: string }[] = []
  stub({ status: 'awaiting_parts', assignments: [acceptedAssignment] })
  useAuthStore.getState().setSession(fakeSession(['EQUIPMENT_STAFF']))
  server.use(
    http.post('/v1/repairs/r1/status', async ({ request }) => {
      const body = (await request.json()) as { status?: string; note?: string }
      if (!body.status || !body.note || !body.note.trim())
        return HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'status/note bắt buộc' },
          { status: 400 },
        )
      saved.push(body)
      return HttpResponse.json({ ...ticket, status: body.status })
    }),
  )
  renderWithProviders(<Component />, { path: '/repairs/:id', route: '/repairs/r1' })
  await userEvent.click(await screen.findByRole('button', { name: 'Đổi trạng thái' }))
  const dialog = await screen.findByRole('dialog')
  await userEvent.click(within(dialog).getByLabelText('Trạng thái'))
  expect(await screen.findByRole('option', { name: 'Đang xử lý' })).toBeVisible()
  expect(screen.queryByRole('option', { name: 'Chờ linh kiện' })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('option', { name: 'Đang xử lý' }))
  await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
  expect(await screen.findByText('Bắt buộc')).toBeVisible()
  await userEvent.type(within(dialog).getByLabelText('Ghi chú'), 'Đã có linh kiện')
  await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(saved[0]).toEqual({ status: 'in_progress', note: 'Đã có linh kiện' }))
})

it('từ chối việc bắt buộc có lý do', async () => {
  const saved: { response?: string; note?: string }[] = []
  stub({
    status: 'accepted',
    assignments: [{ ...acceptedAssignment, response: 'pending', respondedAt: null }],
  })
  useAuthStore.getState().setSession(fakeSession(['EQUIPMENT_STAFF']))
  server.use(
    http.post('/v1/repairs/r1/assignments/respond', async ({ request }) => {
      const body = (await request.json()) as { response?: string; note?: string }
      if (body.response === 'declined' && !body.note?.trim())
        return HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'note bắt buộc' },
          { status: 400 },
        )
      saved.push(body)
      return HttpResponse.json({ ...ticket, status: 'accepted' })
    }),
  )
  renderWithProviders(<Component />, { path: '/repairs/:id', route: '/repairs/r1' })
  await userEvent.click(await screen.findByRole('button', { name: 'Từ chối' }))
  const dialog = await screen.findByRole('dialog')
  await userEvent.click(within(dialog).getByRole('button', { name: 'Từ chối' }))
  expect(await screen.findByText('Bắt buộc')).toBeVisible()
  await userEvent.type(within(dialog).getByLabelText('Lý do từ chối'), 'Bận việc đột xuất')
  await userEvent.click(within(dialog).getByRole('button', { name: 'Từ chối' }))
  await waitFor(() => expect(saved[0]).toEqual({ response: 'declined', note: 'Bận việc đột xuất' }))
})

it('lưu chẩn đoán kèm lỗi gợi ý', async () => {
  const saved: { diagnosis?: string; faultId?: string }[] = []
  stub({ status: 'in_progress', assignments: [acceptedAssignment] })
  useAuthStore.getState().setSession(fakeSession(['EQUIPMENT_STAFF']))
  server.use(
    http.get('/v1/faults/suggest', () =>
      HttpResponse.json([
        {
          fault: { id: 'f2', title: 'Kẹt kim', severity: 'high', errorCode: 'E-1' },
          matchedBy: 'model',
          occurrences: { onEquipment: 1, sameModel: 2 },
          score: 60,
        },
      ]),
    ),
    http.patch('/v1/repairs/r1/diagnosis', async ({ request }) => {
      const body = (await request.json()) as { diagnosis?: string; faultId?: string }
      if (!body.diagnosis?.trim())
        return HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'diagnosis bắt buộc' },
          { status: 400 },
        )
      saved.push(body)
      return HttpResponse.json({ ...ticket, status: 'in_progress' })
    }),
  )
  renderWithProviders(<Component />, { path: '/repairs/:id', route: '/repairs/r1' })
  await userEvent.click(await screen.findByRole('button', { name: 'Chẩn đoán' }))
  const dialog = await screen.findByRole('dialog')
  await userEvent.type(within(dialog).getByLabelText('Chẩn đoán'), 'Kim bị cong')
  await userEvent.click(await screen.findByRole('button', { name: /Kẹt kim/ }))
  await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(saved[0]).toMatchObject({ diagnosis: 'Kim bị cong', faultId: 'f2' }))
  expect(await screen.findByText('Đã lưu chẩn đoán')).toBeVisible()
})

it('hoàn thành kèm đề xuất lỗi đủ bước và linh kiện', async () => {
  const saved: { resolutionSummary?: string; proposeFault?: unknown }[] = []
  stub({ status: 'in_progress', assignments: [acceptedAssignment] })
  useAuthStore.getState().setSession(fakeSession(['EQUIPMENT_STAFF']))
  server.use(
    http.post('/v1/repairs/r1/complete', async ({ request }) => {
      const body = (await request.json()) as { resolutionSummary?: string }
      if (!body.resolutionSummary?.trim())
        return HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'resolutionSummary bắt buộc' },
          { status: 400 },
        )
      saved.push(body)
      return HttpResponse.json({ ...ticket, status: 'completed' })
    }),
  )
  renderWithProviders(<Component />, { path: '/repairs/:id', route: '/repairs/r1' })
  await userEvent.click(await screen.findByRole('button', { name: 'Hoàn thành' }))
  const dialog = await screen.findByRole('dialog')
  await userEvent.type(within(dialog).getByLabelText('Tóm tắt xử lý'), 'Thay kim mới')
  await userEvent.click(within(dialog).getByRole('switch', { name: 'Đề xuất vào thư viện lỗi' }))
  await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
  // Thiếu tiêu đề và thiếu bước → cả field lẫn nhóm bước hiện lỗi "Bắt buộc".
  expect((await screen.findAllByText('Bắt buộc')).length).toBeGreaterThanOrEqual(2)
  await userEvent.type(within(dialog).getByLabelText('Tiêu đề lỗi'), 'Cong kim')
  await userEvent.click(within(dialog).getByRole('button', { name: 'Thêm bước' }))
  await userEvent.type(within(dialog).getByLabelText('Hướng dẫn'), 'Thay kim mới')
  await userEvent.click(within(dialog).getByRole('button', { name: 'Thêm linh kiện' }))
  await userEvent.type(within(dialog).getByLabelText('Tên'), 'Kim hút mẫu')
  await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
  await waitFor(() =>
    expect(saved[0]).toMatchObject({
      resolutionSummary: 'Thay kim mới',
      proposeFault: {
        title: 'Cong kim',
        steps: [{ order: 1, instruction: 'Thay kim mới' }],
        parts: [{ name: 'Kim hút mẫu', quantity: 1 }],
      },
    }),
  )
})

it('nghiệm thu đạt bắt buộc chọn sao 1–5', async () => {
  const saved: { accepted?: boolean; rating?: number }[] = []
  stub({ status: 'completed' })
  useAuthStore.getState().setSession(fakeSession(['DEPT_USER']))
  server.use(
    http.post('/v1/repairs/r1/acceptance', async ({ request }) => {
      const body = (await request.json()) as { accepted?: boolean; rating?: number }
      if (body.accepted && body.rating == null)
        return HttpResponse.json(
          { code: 'REPAIR_RATING_REQUIRED', message: 'Cần đánh giá' },
          { status: 400 },
        )
      saved.push(body)
      return HttpResponse.json({ ...ticket, status: 'acceptance' })
    }),
  )
  renderWithProviders(<Component />, { path: '/repairs/:id', route: '/repairs/r1' })
  await userEvent.click(await screen.findByRole('button', { name: 'Nghiệm thu' }))
  const dialog = await screen.findByRole('dialog')
  await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
  expect(await screen.findByText('Bắt buộc')).toBeVisible()
  await userEvent.click(within(dialog).getByRole('radio', { name: 'Xếp hạng 4/5' }))
  await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
  await waitFor(() => expect(saved[0]).toMatchObject({ accepted: true, rating: 4 }))
  expect(await screen.findByText('Đã nghiệm thu')).toBeVisible()
})

it('báo lỗi tồn kho khi thêm linh kiện từ kho', async () => {
  stub({ status: 'in_progress', assignments: [acceptedAssignment] })
  useAuthStore.getState().setSession(fakeSession(['EQUIPMENT_STAFF']))
  server.use(
    http.get('/v1/supplies', () =>
      HttpResponse.json({ items: [{ id: 's1', code: 'VT-1', name: 'Kim hút mẫu' }] }),
    ),
    http.post('/v1/repairs/r1/parts', () =>
      HttpResponse.json({ code: 'STOCK_INSUFFICIENT', message: 'Không đủ tồn' }, { status: 409 }),
    ),
  )
  renderWithProviders(<Component />, { path: '/repairs/:id', route: '/repairs/r1' })
  await userEvent.click(await screen.findByRole('tab', { name: 'Linh kiện/vật tư' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Thêm linh kiện' }))
  const dialog = await screen.findByRole('dialog')
  await userEvent.click(within(dialog).getByRole('combobox', { name: 'Vật tư' }))
  await userEvent.type(screen.getByPlaceholderText('Tìm theo mã hoặc tên'), 'Kim')
  await userEvent.click(await screen.findByRole('option', { name: /Kim hút mẫu/ }))
  await userEvent.click(within(dialog).getByRole('button', { name: 'Lưu' }))
  expect(await screen.findByText('Tồn kho không đủ')).toBeVisible()
})

it('đính kèm hoá đơn theo từng dòng chi phí', async () => {
  const urls: string[] = []
  stub({
    status: 'in_progress',
    assignments: [acceptedAssignment],
    costs: [
      {
        id: 'c1',
        ticketId: 'r1',
        category: 'parts',
        description: 'Kim hút mẫu',
        amount: '100000',
        invoiceNo: null,
        invoiceDate: null,
        paidAt: null,
      },
    ],
  })
  useAuthStore.getState().setSession(fakeSession(['EQUIPMENT_STAFF']))
  server.use(
    http.get('/v1/attachments', ({ request }) => {
      urls.push(request.url)
      return HttpResponse.json([])
    }),
  )
  renderWithProviders(<Component />, { path: '/repairs/:id', route: '/repairs/r1' })
  await userEvent.click(await screen.findByRole('tab', { name: 'Chi phí' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Hoá đơn' }))
  await waitFor(() =>
    expect(
      urls.some((url) => url.includes('entityType=repair_cost') && url.includes('entityId=c1')),
    ).toBe(true),
  )
})

it('chỉ cho ký khi đúng vai trò và trạng thái', async () => {
  stub({ status: 'in_progress', assignments: [acceptedAssignment] })
  useAuthStore.getState().setSession(fakeSession(['DEPT_USER']))
  renderWithProviders(<Component />, { path: '/repairs/:id', route: '/repairs/r1' })
  await screen.findByText('Kẹt kim')
  await userEvent.click(await screen.findByRole('tab', { name: 'Tài liệu & chữ ký' }))
  expect(screen.queryByRole('button', { name: 'Ký' })).not.toBeInTheDocument()
})

it('DEPT ký vai khoa khi phiếu đã hoàn thành', async () => {
  stub({ status: 'completed' })
  useAuthStore.getState().setSession(fakeSession(['DEPT_USER']))
  renderWithProviders(<Component />, { path: '/repairs/:id', route: '/repairs/r1' })
  await screen.findByText('Kẹt kim')
  await userEvent.click(await screen.findByRole('tab', { name: 'Tài liệu & chữ ký' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Ký' }))
  const dialog = await screen.findByRole('dialog')
  await userEvent.click(within(dialog).getByLabelText('Vai trò'))
  expect(await screen.findByRole('option', { name: 'Khoa' })).toBeVisible()
  expect(screen.queryByRole('option', { name: 'Kỹ thuật' })).not.toBeInTheDocument()
})

it('hiện tên người được phân công cho ADM', async () => {
  stub({ status: 'accepted', assignments: [{ ...acceptedAssignment, userId: 'u3' }] })
  useAuthStore.getState().setSession(fakeSession(['HOSPITAL_ADMIN']))
  server.use(
    http.get('/v1/users', () =>
      HttpResponse.json({
        items: [{ id: 'u3', username: 'vt3', fullName: 'Trần Văn C' }],
        total: 1,
        page: 1,
        limit: 200,
      }),
    ),
  )
  renderWithProviders(<Component />, { path: '/repairs/:id', route: '/repairs/r1' })
  expect(await screen.findByText('Trần Văn C')).toBeVisible()
})
