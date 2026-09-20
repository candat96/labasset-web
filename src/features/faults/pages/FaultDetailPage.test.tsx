import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './FaultDetailPage'

const fault = {
  id: 'f1',
  title: 'Không hút mẫu',
  errorCode: 'E-01',
  scope: 'model',
  model: 'XN-1000',
  groupId: null,
  manufacturerId: null,
  severity: 'high',
  status: 'draft',
  version: 1,
  viewCount: 4,
  helpfulCount: 1,
  notHelpfulCount: 0,
  symptoms: 'Kẹt kim',
  causes: 'Tắc ống',
  estMinutes: 30,
  faultGroupId: null,
  steps: [
    {
      id: 's1',
      faultId: 'f1',
      order: 1,
      instruction: 'Tắt máy',
      expectedResult: null,
      cautions: null,
      imageFileId: null,
    },
  ],
  parts: [],
  createdAt: '2026-09-19T00:00:00Z',
  updatedAt: '2026-09-19T00:00:00Z',
  createdBy: null,
  updatedBy: null,
  publishedAt: null,
  feedback: null,
}

function stub(over: Record<string, unknown> = {}) {
  const row = { ...fault, ...over }
  server.use(
    http.get('/v1/faults/f1', () => HttpResponse.json(row)),
    http.get('/v1/faults/f1/versions', () => HttpResponse.json([])),
    http.get('/v1/faults/f1/history', () => HttpResponse.json([])),
    http.get('/v1/attachments', () => HttpResponse.json([])),
    http.post('/v1/faults/f1/publish', () => HttpResponse.json({ ...row, status: 'published' })),
    http.post('/v1/faults/f1/archive', () => HttpResponse.json({ ...row, status: 'archived' })),
    http.post('/v1/faults/f1/feedback', () =>
      HttpResponse.json({
        helpful: true,
        helpfulCount: 2,
        notHelpfulCount: 0,
        faultId: 'f1',
        userId: 'u1',
      }),
    ),
  )
  return row
}

it('shows publish for admin on draft and hides it for staff', async () => {
  stub()
  useAuthStore.getState().setSession(fakeSession(['EQUIPMENT_STAFF']))
  renderWithProviders(<Component />, { path: '/faults/:id', route: '/faults/f1' })
  expect(await screen.findByRole('heading', { name: 'Không hút mẫu' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Sửa' })).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Ban hành' })).not.toBeInTheDocument()
})

it('admin can publish a draft', async () => {
  stub()
  useAuthStore.getState().setSession(fakeSession(['HOSPITAL_ADMIN']))
  renderWithProviders(<Component />, { path: '/faults/:id', route: '/faults/f1' })
  await userEvent.click(await screen.findByRole('button', { name: 'Ban hành' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Xác nhận' }))
  expect(await screen.findByText('Đã ban hành lỗi')).toBeVisible()
})

it('sends helpful feedback', async () => {
  stub({ status: 'published' })
  useAuthStore.getState().setSession(fakeSession())
  renderWithProviders(<Component />, { path: '/faults/:id', route: '/faults/f1' })
  await userEvent.click(await screen.findByRole('button', { name: '👍 Hữu ích' }))
  expect(await screen.findByText('Đã gửi phản hồi')).toBeVisible()
})

it('ẩn Sửa khi lỗi đã lưu trữ và ẩn phản hồi khi còn nháp', async () => {
  stub({ status: 'archived' })
  useAuthStore.getState().setSession(fakeSession())
  renderWithProviders(<Component />, { path: '/faults/:id', route: '/faults/f1' })
  await screen.findByRole('heading', { name: 'Không hút mẫu' })
  expect(screen.queryByRole('link', { name: 'Sửa' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '👍 Hữu ích' })).not.toBeInTheDocument()
  expect(screen.getByText('Chỉ gửi phản hồi cho lỗi đã ban hành')).toBeVisible()
})

it('xem được phiên bản lỗi trong lịch sử', async () => {
  stub()
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/faults/f1/versions', () =>
      HttpResponse.json([
        {
          id: 'ver1',
          faultId: 'f1',
          version: 1,
          changedBy: 'u1',
          changedAt: '2026-09-18T00:00:00Z',
        },
      ]),
    ),
    http.get('/v1/faults/f1/versions/1', () =>
      HttpResponse.json({
        id: 'ver1',
        faultId: 'f1',
        version: 1,
        changedBy: 'u1',
        changedAt: '2026-09-18T00:00:00Z',
        snapshot: {
          ...fault,
          title: 'Không hút mẫu (bản cũ)',
          symptoms: 'Triệu chứng cũ',
          steps: [],
          parts: [],
        },
      }),
    ),
  )
  renderWithProviders(<Component />, { path: '/faults/:id', route: '/faults/f1' })
  await screen.findByRole('heading', { name: 'Không hút mẫu' })
  await userEvent.click(screen.getByLabelText('Phiên bản'))
  await userEvent.click(await screen.findByRole('option', { name: /^v1/ }))
  expect(await screen.findByText('Triệu chứng cũ')).toBeVisible()
})
