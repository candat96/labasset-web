import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './TaskDetailPage'

const baseTask = {
  id: 'k1',
  code: 'BD-1',
  planId: null,
  equipmentId: 'e1',
  equipment: { id: 'e1', code: 'TB-1', name: 'Máy huyết học' },
  type: 'periodic',
  status: 'in_progress',
  scheduledAt: '2026-09-20T00:00:00Z',
  dueAt: '2026-09-21T00:00:00Z',
  assigneeId: 'u1',
  startedAt: '2026-09-20T01:00:00Z',
  finishedAt: null,
  notifiedDueAt: null,
  notifiedOverdueAt: null,
  templateId: null,
  templateItems: [] as unknown[],
  results: [] as unknown[],
  suppliesUsed: [],
  clientVersion: 1,
  overallPass: null,
  notes: null,
  techSignatureFileId: null,
  deptSignatureFileId: null,
  createdBy: 'u1',
  createdAt: '2026-09-19T00:00:00Z',
  updatedAt: '2026-09-19T00:00:00Z',
  room: null,
}

function stub(over: Record<string, unknown> = {}) {
  const row = { ...baseTask, ...over }
  server.use(
    http.get('/v1/maintenance/tasks/k1', () => HttpResponse.json(row)),
    http.put('/v1/maintenance/tasks/k1/checklist', () => HttpResponse.json(row)),
    http.put('/v1/maintenance/tasks/k1/results', () =>
      HttpResponse.json({ ...row, clientVersion: 2 }),
    ),
    http.get('/v1/attachments', () => HttpResponse.json([])),
    http.get('/v1/audit-logs', () =>
      HttpResponse.json({ items: [], total: 0, page: 1, limit: 20 }),
    ),
    http.post('/v1/maintenance/tasks/k1/save-as-template', () =>
      HttpResponse.json({ id: 't9', name: 'x' }, { status: 201 }),
    ),
  )
  return row
}

function renderDetail(over: Record<string, unknown> = {}) {
  stub(over)
  useAuthStore.getState().setSession(fakeSession(['EQUIPMENT_STAFF']))
  return renderWithProviders(<Component />, {
    path: '/maintenance/tasks/:id',
    route: '/maintenance/tasks/k1',
  })
}

it('công việc rỗng hiện nút thêm dòng đầu tiên và không chặn', async () => {
  renderDetail()
  expect(
    await screen.findByText('Chưa có mục nào — thêm dòng đầu tiên, không cần chọn mẫu.'),
  ).toBeVisible()
  expect(screen.getByRole('button', { name: 'Thêm dòng đầu tiên' })).toBeVisible()
})

it('thêm dòng rồi lưu gửi đúng items với key tự sinh không trùng', async () => {
  const saved: { items: { key: string; label: string; type: string }[] }[] = []
  stub()
  server.use(
    http.put('/v1/maintenance/tasks/k1/checklist', async ({ request }) => {
      saved.push(
        (await request.json()) as { items: { key: string; label: string; type: string }[] },
      )
      return HttpResponse.json(baseTask)
    }),
  )
  useAuthStore.getState().setSession(fakeSession(['EQUIPMENT_STAFF']))
  renderWithProviders(<Component />, {
    path: '/maintenance/tasks/:id',
    route: '/maintenance/tasks/k1',
  })
  await userEvent.click(await screen.findByRole('button', { name: 'Thêm dòng đầu tiên' }))
  await userEvent.type(await screen.findByLabelText('Nhãn'), 'Nguồn điện')
  const itemsSection = screen.getByText('Mục kiểm tra').closest('section')!
  await userEvent.click(within(itemsSection).getByRole('button', { name: 'Thêm dòng' }))
  const labels = await screen.findAllByLabelText('Nhãn')
  await userEvent.type(labels[1]!, 'Nguồn điện')
  await userEvent.click(screen.getByRole('button', { name: 'Lưu mục kiểm tra' }))
  await waitFor(() => expect(saved).toHaveLength(1))
  expect(saved[0]!.items).toHaveLength(2)
  expect(saved[0]!.items[0]).toMatchObject({ key: 'nguon_dien', label: 'Nguồn điện' })
  expect(saved[0]!.items[1]!.key).not.toBe('nguon_dien')
  expect(saved[0]!.items[1]!.label).toBe('Nguồn điện')
})

it('xoá dòng thì lần lưu sau không còn mục đó', async () => {
  const saved: { items: { key: string }[] }[] = []
  stub({
    templateItems: [
      { key: 'power', label: 'Nguồn', type: 'check' },
      { key: 'lamp', label: 'Đèn', type: 'check' },
    ],
  })
  server.use(
    http.put('/v1/maintenance/tasks/k1/checklist', async ({ request }) => {
      saved.push((await request.json()) as { items: { key: string }[] })
      return HttpResponse.json(baseTask)
    }),
  )
  useAuthStore.getState().setSession(fakeSession(['EQUIPMENT_STAFF']))
  renderWithProviders(<Component />, {
    path: '/maintenance/tasks/:id',
    route: '/maintenance/tasks/k1',
  })
  const removeButtons = await screen.findAllByRole('button', { name: 'Xoá dòng' })
  await userEvent.click(removeButtons[1]!)
  await userEvent.click(screen.getByRole('button', { name: 'Lưu mục kiểm tra' }))
  await waitFor(() => expect(saved).toHaveLength(1))
  expect(saved[0]!.items).toEqual([expect.objectContaining({ key: 'power' })])
})

it('tích lưu mẫu thì gọi save-as-template với tên đã nhập', async () => {
  const created: { name: string }[] = []
  const finished: unknown[] = []
  stub({ templateItems: [{ key: 'power', label: 'Nguồn', type: 'check' }] })
  server.use(
    http.post('/v1/maintenance/tasks/k1/save-as-template', async ({ request }) => {
      created.push((await request.json()) as { name: string })
      return HttpResponse.json({ id: 't9', name: 'Mẫu BD' }, { status: 201 })
    }),
    http.post('/v1/maintenance/tasks/k1/finish', async ({ request }) => {
      finished.push(await request.json())
      return HttpResponse.json(baseTask)
    }),
  )
  useAuthStore.getState().setSession(fakeSession(['EQUIPMENT_STAFF']))
  renderWithProviders(<Component />, {
    path: '/maintenance/tasks/:id',
    route: '/maintenance/tasks/k1',
  })
  await userEvent.click(await screen.findByRole('button', { name: 'Đạt' }))
  await userEvent.click(screen.getByRole('button', { name: 'Thêm' }))
  await userEvent.click(await screen.findByRole('menuitem', { name: 'Hoàn thành' }))
  const dialog = await screen.findByRole('dialog')
  await userEvent.click(within(dialog).getByRole('checkbox', { name: /Lưu các mục này thành mẫu/ }))
  const name = within(dialog).getByLabelText('Tên mẫu')
  await userEvent.clear(name)
  await userEvent.type(name, 'Mẫu BD')
  await userEvent.click(within(dialog).getByRole('button', { name: 'Hoàn thành' }))
  await waitFor(() => expect(created).toHaveLength(1))
  expect(created[0]).toMatchObject({ name: 'Mẫu BD' })
  expect(finished).toHaveLength(1)
})
