import { screen } from '@testing-library/react'
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

function stub(over: Record<string, unknown> = {}) {
  const row = { ...ticket, ...over }
  server.use(
    http.get('/v1/repairs/r1', () => HttpResponse.json(row)),
    http.get('/v1/settings/public', () => HttpResponse.json({ 'repair.requireAcceptance': true })),
    http.get('/v1/attachments', () => HttpResponse.json([])),
    http.get('/v1/audit-logs', () =>
      HttpResponse.json({ items: [], total: 0, page: 1, limit: 20 }),
    ),
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
  stub({
    status: 'in_progress',
    assignments: [
      {
        id: 'a1',
        ticketId: 'r1',
        userId: 'u1',
        role: 'primary',
        response: 'accepted',
        responseNote: null,
        assignedAt: '2026-09-19T00:00:00Z',
        assignedBy: 'adm',
        respondedAt: '2026-09-19T00:00:00Z',
      },
    ],
  })
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
