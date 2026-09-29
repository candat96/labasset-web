import { File as NativeFile } from 'node:buffer'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Component } from './RepairFormPage'
import { useNavigate } from 'react-router'

vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useNavigate: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(useNavigate).mockReturnValue(vi.fn())
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/equipment', () =>
      HttpResponse.json({
        items: [{ id: 'e1', code: 'TB-1', name: 'Máy huyết học' }],
        total: 1,
        page: 1,
        limit: 50,
      }),
    ),
    http.get('/v1/departments', () => HttpResponse.json({ items: [] })),
    http.get('/v1/settings/public', () =>
      HttpResponse.json({ 'repair.sla': { low: 48, medium: 24, high: 8, critical: 4 } }),
    ),
    http.get('/v1/faults/suggest', () => HttpResponse.json([])),
  )
})

it('validates description and creates a ticket', async () => {
  const saved: unknown[] = []
  server.use(
    http.post('/v1/repairs', async ({ request }) => {
      const body = await request.json()
      saved.push(body)
      return HttpResponse.json({ id: 'r2', code: 'SC-2' }, { status: 201 })
    }),
  )
  renderWithProviders(<Component />, {
    path: '/repairs/new',
    route: '/repairs/new',
    routes: [{ path: '/repairs/:id', element: <div>DETAIL</div> }],
  })
  await userEvent.click(screen.getByRole('button', { name: 'Tạo phiếu' }))
  expect((await screen.findAllByText('Bắt buộc')).length).toBeGreaterThan(0)
  await userEvent.type(screen.getByLabelText('Máy'), 'TB')
  await userEvent.click(await screen.findByRole('option', { name: /TB-1/ }))
  await userEvent.type(screen.getByLabelText(/Mô tả/), 'Máy kẹt kim')
  expect(screen.getByText('SLA: 24 giờ')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Tạo phiếu' }))
  await waitFor(() =>
    expect(saved[0]).toMatchObject({
      equipmentId: 'e1',
      description: 'Máy kẹt kim',
      severity: 'medium',
    }),
  )
  await waitFor(() => expect(useNavigate()).toHaveBeenCalledWith('/repairs/r2', expect.anything()))
})

it('retries failed report photos on the same ticket without creating a duplicate', async () => {
  let creates = 0
  let attempts = 0
  const attached: unknown[] = []
  server.use(
    http.post('/v1/repairs', () => {
      creates++
      return HttpResponse.json({ id: 'r-photo' })
    }),
    http.post('/v1/files/presign', () =>
      // URL kho lưu trữ phải tuyệt đối: msw không chặn fetch tới đường dẫn tương đối.
      HttpResponse.json({
        fileId: 'f-photo',
        uploadUrl: 'http://storage.test/photo-upload',
        headers: {},
      }),
    ),
    http.put('http://storage.test/photo-upload', () => new HttpResponse(null, { status: 200 })),
    http.post('/v1/files/f-photo/complete', () => HttpResponse.json({ id: 'f-photo' })),
    http.post('/v1/attachments', async ({ request }) => {
      attached.push(await request.json())
      attempts++
      return attempts === 1
        ? HttpResponse.json({ code: 'INTERNAL_ERROR' }, { status: 500 })
        : HttpResponse.json({ id: 'a1' })
    }),
  )
  renderWithProviders(<Component />)
  await userEvent.type(screen.getByLabelText('Máy'), 'TB')
  await userEvent.click(await screen.findByRole('option', { name: /TB-1/ }))
  await userEvent.type(screen.getByLabelText(/Mô tả/), 'Máy kẹt kim')
  await userEvent.upload(
    screen.getByLabelText('Ảnh tình trạng khi báo hỏng'),
    // File của jsdom không dùng được làm body của fetch.
    new NativeFile(['photo'], 'hong.jpg', { type: 'image/jpeg' }) as unknown as File,
  )
  await userEvent.click(screen.getByRole('button', { name: 'Tạo phiếu' }))
  await screen.findByText(/Đã tạo phiếu, nhưng chưa tải đủ ảnh/)
  await userEvent.click(screen.getByRole('button', { name: 'Tạo phiếu' }))
  await waitFor(() => expect(attempts).toBe(2))
  expect(creates).toBe(1)
  expect(attached).toEqual(
    Array(2).fill({
      entityType: 'repair_ticket',
      entityId: 'r-photo',
      fileId: 'f-photo',
      kind: 'photo',
      label: 'Báo hỏng — hong.jpg',
    }),
  )
  await waitFor(() =>
    expect(useNavigate()).toHaveBeenCalledWith('/repairs/r-photo', expect.anything()),
  )
})

/** Một dòng kết quả `/v1/faults/suggest` đủ trường để dựng khối gợi ý. */
function suggestion(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    matchedBy: 'errorCode',
    score: 10,
    occurrences: { onEquipment: 2, sameModel: 5 },
    fault: {
      id: 'f1',
      title: 'Không hút mẫu',
      errorCode: 'E-01',
      severity: 'high',
      scope: 'model',
      status: 'published',
      model: 'XN-1000',
      helpfulCount: 1,
      viewCount: 3,
      version: 1,
      updatedAt: '2026-09-19T00:00:00Z',
      steps: [],
      ...overrides,
    },
  }
}

/** Promise mở khoá thủ công để giữ một request đang bay. */
function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

it('chỉ đánh dấu bắt buộc ở trường thật sự bắt buộc', () => {
  renderWithProviders(<Component />)
  expect(screen.getByText('Máy', { selector: 'label' })).toHaveTextContent('(bắt buộc)')
  expect(screen.getByText('Mô tả', { selector: 'label' })).toHaveTextContent('(bắt buộc)')
  expect(screen.getByText('Mức khẩn', { selector: 'label' })).toHaveTextContent('(bắt buộc)')
  // Mã lỗi và khoa báo hỏng là tuỳ chọn, không được gắn sao.
  expect(screen.getByText('Mã lỗi', { selector: 'label' })).not.toHaveTextContent('bắt buộc')
  expect(screen.getByText('Khoa báo hỏng', { selector: 'label' })).not.toHaveTextContent('bắt buộc')
})

it('bấm gợi ý lỗi thì điền sẵn mô tả, mã lỗi và mức độ', async () => {
  server.use(
    http.get('/v1/faults/suggest', () =>
      HttpResponse.json([
        suggestion({ id: 'f9', title: 'Kim kẹt', errorCode: 'E-99', severity: 'low' }),
      ]),
    ),
  )
  renderWithProviders(<Component />)
  await userEvent.type(screen.getByLabelText('Máy'), 'TB')
  await userEvent.click(await screen.findByRole('option', { name: /TB-1/ }, { timeout: 5000 }))
  await userEvent.click(await screen.findByRole('button', { name: /Kim kẹt/ }, { timeout: 5000 }))

  expect(screen.getByLabelText(/Mô tả/)).toHaveValue('Kim kẹt')
  expect(screen.getByLabelText('Mã lỗi')).toHaveValue('E-99')
  expect(screen.getByLabelText(/Mức khẩn/)).toHaveTextContent('Thấp')
})

it('giữ gợi ý cũ trong lúc tra từ khoá mới, không để danh sách rỗng giữa chừng', async () => {
  const slow = deferred()
  let suggestCalls = 0
  server.use(
    http.get('/v1/faults/suggest', async ({ request }) => {
      const q = new URL(request.url).searchParams.get('q')
      if (!q) return HttpResponse.json([suggestion()])
      suggestCalls++
      await slow.promise
      return HttpResponse.json([
        suggestion({ id: 'f2', title: 'Kim kẹt', errorCode: 'E-02', severity: 'low' }),
      ])
    }),
  )
  renderWithProviders(<Component />)
  await userEvent.type(screen.getByLabelText('Máy'), 'TB')
  await userEvent.click(await screen.findByRole('option', { name: /TB-1/ }, { timeout: 5000 }))
  expect(
    await screen.findByRole('button', { name: /Không hút mẫu/ }, { timeout: 5000 }),
  ).toBeVisible()

  await userEvent.type(screen.getByLabelText(/Mô tả/), 'kẹt')
  await waitFor(() => expect(suggestCalls).toBe(1), { timeout: 5000 })
  // Request mới còn đang bay: gợi ý cũ vẫn nguyên, không rỗng và không nhấp nháy.
  expect(screen.getByRole('button', { name: /Không hút mẫu/ })).toBeVisible()
  expect(screen.queryByText('Không có gợi ý lỗi.')).not.toBeInTheDocument()

  slow.resolve()
  expect(await screen.findByRole('button', { name: /Kim kẹt/ }, { timeout: 5000 })).toBeVisible()
})
