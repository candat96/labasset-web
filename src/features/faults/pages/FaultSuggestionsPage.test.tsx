import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './FaultSuggestionsPage'

const proposal = {
  id: 'p1',
  repairTicketId: 'r1',
  proposedBy: 'u2',
  createdAt: '2026-09-19T00:00:00Z',
  reviewedAt: null,
  reviewedBy: null,
  reviewNote: null,
  faultId: null,
  status: 'pending',
  payload: {
    title: 'Kẹt pittong',
    steps: [{ order: 1, instruction: 'Tháo pittong' }],
    parts: [{ name: 'Pittong', quantity: 1 }],
  },
}

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession(['HOSPITAL_ADMIN']))
  server.use(
    http.get('/v1/faults/suggestions', () =>
      HttpResponse.json({ items: [proposal], total: 1, page: 1, limit: 20 }),
    ),
    http.get('/v1/faults/suggestions/p1', () => HttpResponse.json(proposal)),
    http.post('/v1/faults/suggestions/p1/accept', () =>
      HttpResponse.json({ ...proposal, status: 'accepted' }),
    ),
  )
})

it('accepts a pending suggestion as a new fault', async () => {
  renderWithProviders(<Component />)
  await userEvent.click(await screen.findByText('Kẹt pittong'))
  await userEvent.click(await screen.findByRole('button', { name: 'Chấp nhận' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Xác nhận' }))
  expect(await screen.findByText('Đã chấp nhận đề xuất')).toBeVisible()
})

it('hides the page from non-admin', async () => {
  useAuthStore.getState().setSession(fakeSession(['EQUIPMENT_STAFF']))
  renderWithProviders(<Component />)
  expect(await screen.findByRole('alert')).toHaveTextContent('Bạn không có quyền duyệt đề xuất')
})
