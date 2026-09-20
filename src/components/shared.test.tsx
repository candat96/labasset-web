import { File as NativeFile } from 'node:buffer'
import { useState } from 'react'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { Form } from './ui/form'
import { StatusBadge } from './status-badge'
import { commonStatusMap } from '@/lib/status-maps'
import { Timeline } from './timeline'
import { KpiCard } from './kpi-card'
import { DetailLayout } from './detail-layout'
import { AsyncSelect } from './form/async-select'
import { MoneyField } from './form/money-field'
import { QtyField } from './form/qty-field'
import { DateField } from './form/date-field'
import { DatetimeField } from './form/datetime-field'
import { FileField } from './form/file-field'
import { AttachmentsPanel } from './attachments-panel'
import { useConfirm } from './confirm-dialog'
import { AnnouncementBanner } from './announcement-banner'
import { api, unwrapAs } from '@/api/client'
import { formatQty } from '@/lib/format/number'
import { notificationLink } from '@/lib/notification-link'

it('renders status text including unknown values, KPI and time-ordered events', () => {
  renderWithProviders(
    <>
      <StatusBadge value="active" map={commonStatusMap} />
      <StatusBadge value="custom" map={commonStatusMap} />
      <KpiCard title="Số máy" value="12" description="Trong viện" />
      <Timeline
        events={[
          { at: '2026-01-01', title: 'Cũ' },
          { at: '2026-02-01', title: 'Mới', by: 'Admin', summary: 'Kiểm tra' },
        ]}
      />
    </>,
  )
  expect(screen.getByText('Hoạt động')).toBeVisible()
  expect(screen.getByText('custom')).toBeVisible()
  expect(screen.getByText('12')).toBeVisible()
  expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Mới')
})
it('keeps detail tab in URL and preserves other parameters', async () => {
  const { router } = renderWithProviders(
    <DetailLayout
      code="XN"
      name="Khoa"
      information="Thông tin"
      tabs={[
        { value: 'users', label: 'Người dùng', content: 'Danh sách' },
        { value: 'history', label: 'Lịch sử', content: 'Nhật ký' },
      ]}
    />,
    { route: '/detail?x=1' },
  )
  await userEvent.click(screen.getByRole('tab', { name: 'Lịch sử' }))
  expect(router.state.location.search).toContain('tab=history')
  expect(router.state.location.search).toContain('x=1')
  expect(screen.getByText('Nhật ký')).toBeVisible()
})
it('debounces API references, selects multiple values and clears', async () => {
  const searches: string[] = []
  server.use(
    http.get('/v1/departments', ({ request }) => {
      searches.push(new URL(request.url).searchParams.get('q') ?? '')
      return HttpResponse.json({ items: [{ id: 'd1', code: 'XN', name: 'Xét nghiệm' }] })
    }),
  )
  function Example() {
    const [value, onChange] = useState<string | string[] | null>([])
    return (
      <AsyncSelect
        label="Khoa"
        queryKey="departments"
        multiple
        clearable
        value={value}
        onChange={onChange}
        loadOptions={async (q) =>
          (
            await unwrapAs<{ items: { id: string; code: string; name: string }[] }>(
              api.GET('/v1/departments', { params: { query: { q } } }),
            )
          ).items
        }
      />
    )
  }
  renderWithProviders(<Example />)
  await userEvent.click(screen.getByRole('combobox', { name: 'Khoa' }))
  await userEvent.type(screen.getAllByRole('combobox')[1]!, 'XN')
  await waitFor(() => expect(searches).toContain('XN'))
  await userEvent.click(screen.getByRole('option', { name: 'XN — Xét nghiệm' }))
  expect(screen.getByRole('option')).toHaveAttribute('aria-selected', 'true')
  await userEvent.click(screen.getByRole('button', { name: 'Bỏ XN — Xét nghiệm' }))
  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Bỏ XN — Xét nghiệm' })).not.toBeInTheDocument(),
  )
})
it('preserves decimal strings and emits ISO date/time values', async () => {
  let output: unknown
  function Example() {
    const form = useForm({ defaultValues: { money: '', qty: '', date: '', datetime: '' } })
    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((v) => {
            output = v
          })}
        >
          <MoneyField control={form.control} name="money" label="Tiền" />
          <QtyField control={form.control} name="qty" label="Số lượng" />
          <DateField control={form.control} name="date" label="Ngày" />
          <DatetimeField control={form.control} name="datetime" label="Thời điểm" />
          <button>Lưu</button>
        </form>
      </Form>
    )
  }
  renderWithProviders(<Example />)
  await userEvent.type(screen.getByLabelText('Tiền'), '999999999999999999')
  await userEvent.type(screen.getByLabelText('Số lượng'), '1.250')
  await userEvent.click(screen.getByLabelText('Ngày'))
  await userEvent.click(screen.getByRole('button', { name: /ngày 19 tháng 09 năm 2026/i }))
  fireEvent.change(screen.getByLabelText('Thời điểm'), { target: { value: '2026-09-19T12:00' } })
  await userEvent.click(screen.getByRole('button', { name: 'Lưu' }))
  expect(output).toEqual({
    money: '999999999999999999',
    qty: '1.250',
    date: '2026-09-19',
    datetime: new Date('2026-09-19T12:00').toISOString(),
  })
  expect(formatQty('999999999999999999.120')).toBe('999.999.999.999.999.999,12')
})
it('confirm requires a reason and resolves cancellation', async () => {
  let result: unknown
  function Example() {
    const { confirm, dialog } = useConfirm()
    return (
      <>
        <button
          onClick={async () => {
            result = await confirm({ title: 'Huỷ phiếu', requireReason: true })
          }}
        >
          Mở
        </button>
        {dialog}
      </>
    )
  }
  renderWithProviders(<Example />)
  await userEvent.click(screen.getByText('Mở'))
  expect(screen.getByRole('button', { name: 'Xác nhận' })).toBeDisabled()
  await userEvent.type(screen.getByLabelText('Lý do (bắt buộc)'), 'Sai thông tin')
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
  expect(result).toBe('Sai thông tin')
  await userEvent.click(screen.getByText('Mở'))
  await userEvent.click(screen.getByRole('button', { name: 'Huỷ' }))
  expect(result).toBe(false)
})
function uploadHandlers(fail = false) {
  return [
    http.post('/v1/files/presign', () =>
      HttpResponse.json({
        fileId: 'f1',
        uploadUrl: 'http://storage.test/upload',
        headers: { 'Content-Type': 'image/png' },
      }),
    ),
    http.put('http://storage.test/upload', ({ request }) => {
      expect(request.headers.has('Authorization')).toBe(false)
      expect(request.headers.has('X-Tenant-Id')).toBe(false)
      return new HttpResponse(null, { status: fail ? 500 : 200 })
    }),
    http.post('/v1/files/f1/complete', () => HttpResponse.json({ id: 'f1' })),
  ]
}
it('uploads a file through presign, PUT and complete and returns fileId', async () => {
  useAuthStore.getState().setSession(fakeSession())
  server.use(...uploadHandlers())
  const changed = vi.fn()
  renderWithProviders(<FileField label="Ảnh" value={null} onChange={changed} />)
  await userEvent.upload(
    screen.getByLabelText('Ảnh'),
    new NativeFile(['image'], 'a.png', { type: 'image/png' }) as unknown as File,
  )
  await waitFor(() => expect(changed).toHaveBeenCalledWith('f1'))
})
it('does not complete or publish a failed upload', async () => {
  server.use(...uploadHandlers(true))
  const changed = vi.fn()
  renderWithProviders(<FileField label="Ảnh" value={null} onChange={changed} />)
  await userEvent.upload(
    screen.getByLabelText('Ảnh'),
    new NativeFile(['image'], 'a.png', { type: 'image/png' }) as unknown as File,
  )
  expect(await screen.findByRole('alert')).toHaveTextContent('Không tải được tệp')
  expect(changed).not.toHaveBeenCalled()
})
it('lists attachment groups, opens image lightbox, uploads and removes with confirmation', async () => {
  useAuthStore.getState().setSession(fakeSession())
  const removed = vi.fn(),
    attached = vi.fn()
  server.use(
    ...uploadHandlers(),
    http.get('/v1/attachments', () =>
      HttpResponse.json([{ id: 'a1', fileId: 'f1', kind: 'photo', label: 'Ảnh máy' }]),
    ),
    http.get('/v1/files/f1/url', () =>
      HttpResponse.json({ url: 'http://storage.test/a.png', expiresIn: 900 }),
    ),
    http.post('/v1/attachments', async ({ request }) => {
      attached(await request.json())
      return HttpResponse.json({ id: 'a2' })
    }),
    http.delete('/v1/attachments/a1', () => {
      removed()
      return new HttpResponse(null, { status: 204 })
    }),
  )
  renderWithProviders(
    <AttachmentsPanel
      entityType="equipment"
      entityId="e1"
      kinds={[{ value: 'photo', label: 'Ảnh' }]}
    />,
  )
  await userEvent.click(await screen.findByRole('button', { name: 'Xem ảnh Ảnh máy' }))
  expect(screen.getByRole('dialog')).toBeVisible()
  await userEvent.keyboard('{Escape}')
  await userEvent.upload(
    screen.getByLabelText('Thêm Ảnh'),
    new NativeFile(['image'], 'a.png', { type: 'image/png' }) as unknown as File,
  )
  await waitFor(() =>
    expect(attached).toHaveBeenCalledWith({
      fileId: 'f1',
      kind: 'photo',
      entityType: 'equipment',
      entityId: 'e1',
    }),
  )
  await userEvent.click(screen.getByRole('button', { name: 'Xoá' }))
  await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
  await waitFor(() => expect(removed).toHaveBeenCalled())
})
it('hides attachment mutations for department readers', async () => {
  useAuthStore.getState().setSession(fakeSession(['DEPT_USER']))
  server.use(http.get('/v1/attachments', () => HttpResponse.json([])))
  renderWithProviders(
    <AttachmentsPanel
      entityType="equipment"
      entityId="e1"
      kinds={[{ value: 'photo', label: 'Ảnh' }]}
    />,
  )
  expect(await screen.findByText('Ảnh')).toBeVisible()
  expect(screen.queryByLabelText('Thêm Ảnh')).not.toBeInTheDocument()
})
it('dismisses announcements persistently by id', async () => {
  server.use(
    http.get('/v1/announcements/active', () =>
      HttpResponse.json([{ id: 'a1', title: 'Bảo trì', body: 'Tối nay', level: 'warning' }]),
    ),
  )
  const view = renderWithProviders(<AnnouncementBanner />)
  await userEvent.click(await screen.findByRole('button', { name: 'Đóng Bảo trì' }))
  expect(screen.queryByText('Bảo trì')).not.toBeInTheDocument()
  view.unmount()
  renderWithProviders(<AnnouncementBanner />)
  expect(localStorage.getItem('labasset.dismissedAnnouncements')).toContain('a1')
})
it.each([
  ['requestId', '/requests/x'],
  ['repairTicketId', '/repairs/x'],
  ['equipmentId', '/equipment/x'],
  ['taskId', '/maintenance/tasks/x'],
  ['calibrationId', '/calibrations/x'],
  ['issueId', '/stock/issues/x'],
  ['receiptId', '/stock/receipts/x'],
  ['alertId', '/stock/alerts'],
])('links %s notifications', (key, path) => expect(notificationLink({ [key]: 'x' })).toBe(path))
it('rejects external notification paths', () =>
  expect(notificationLink({ path: '//evil.test' })).toBeNull())
