import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { endOfDay } from 'date-fns'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { dayRangeToIso } from '@/lib/format/date-range'
import { listRow } from './fixtures'
import { Component } from './EquipmentPage'

let urls: string[] = []

const plusDays = (days: number) => {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

beforeEach(() => {
  urls = []
  // Panel lọc mặc định thu khi màn < 1600 (jsdom rộng 1024) → mở sẵn cho các test dùng Select.
  localStorage.setItem('filter-panel:equipment', '1')
  useAuthStore.getState().setSession(fakeSession())
  server.use(
    http.get('/v1/equipment', ({ request }) => {
      urls.push(request.url)
      return HttpResponse.json({ items: [listRow], total: 1, page: 1, limit: 20 })
    }),
    http.get('/v1/departments', () =>
      HttpResponse.json([{ id: 'd1', code: 'HH', name: 'Huyết học' }]),
    ),
    http.get('/v1/departments/:id', () =>
      HttpResponse.json({ id: 'd1', code: 'HH', name: 'Huyết học' }),
    ),
    http.get('/v1/catalogs/rooms', ({ request }) => {
      urls.push(request.url)
      return HttpResponse.json({
        items: [{ id: 'r1', code: 'HH-P101', name: 'Phòng Huyết học', departmentId: 'd1' }],
        total: 1,
      })
    }),
    http.get('/v1/catalogs/rooms/:id', () =>
      HttpResponse.json({ id: 'r1', code: 'HH-P101', name: 'Phòng Huyết học', departmentId: 'd1' }),
    ),
    http.get('/v1/catalogs/equipment-groups', () => HttpResponse.json([])),
    http.get('/v1/catalogs/manufacturers', () => HttpResponse.json([])),
    http.get('/v1/users', () => HttpResponse.json({ items: [], total: 0, page: 1, limit: 200 })),
  )
})

it('lists equipment and keeps filters on the URL', async () => {
  renderWithProviders(<Component />)
  expect(await screen.findByRole('link', { name: 'TB-2026-00001' })).toHaveAttribute(
    'href',
    '/equipment/e1',
  )
  expect(screen.getByText('Máy huyết học')).toBeVisible()
  await userEvent.type(screen.getByLabelText('Tìm máy'), 'huyet')
  await waitFor(() => expect(urls.some((u) => u.includes('q=huyet'))).toBe(true))
})

it('cột Phòng sau Khoa, sort=room; lọc Phòng theo khoa đang lọc và reset khi đổi khoa', async () => {
  const { router } = renderWithProviders(<Component />)
  await screen.findByRole('link', { name: 'TB-2026-00001' })
  const headers = screen.getAllByRole('columnheader').map((h) => h.textContent ?? '')
  expect(headers.indexOf('Phòng')).toBe(headers.indexOf('Khoa') + 1)
  expect(screen.getByRole('cell', { name: 'Phòng Huyết học' })).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Sắp xếp: Phòng' }))
  await waitFor(() => expect(urls.at(-1)).toContain('sort=room'))

  await userEvent.click(screen.getByRole('combobox', { name: 'Khoa' }))
  await userEvent.click(await screen.findByRole('option', { name: /Huyết học/ }))
  await waitFor(() => expect(router.state.location.search).toContain('departmentId=d1'))
  await userEvent.click(screen.getByRole('combobox', { name: 'Phòng' }))
  await userEvent.click(await screen.findByRole('option', { name: /Phòng Huyết học/ }))
  await waitFor(() => expect(router.state.location.search).toContain('roomId=r1'))
  expect(urls.some((u) => u.includes('/v1/catalogs/rooms') && u.includes('departmentId=d1'))).toBe(
    true,
  )
  await waitFor(() =>
    expect(urls.some((u) => u.includes('/v1/equipment') && u.includes('roomId=r1'))).toBe(true),
  )
  // đổi/bỏ khoa → roomId bị xoá
  await userEvent.click(screen.getByRole('button', { name: 'Bỏ HH — Huyết học' }))
  await waitFor(() => expect(router.state.location.search).not.toContain('roomId=r1'))
})

it('chỉ sort các cột API cho phép và cột khoa gửi departmentId', async () => {
  const { router } = renderWithProviders(<Component />)
  await screen.findByRole('link', { name: 'TB-2026-00001' })
  expect(screen.queryByRole('button', { name: 'Sắp xếp: Model' })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Sắp xếp: Khoa' }))
  await waitFor(() => expect(urls.at(-1)).toContain('sort=departmentId'))
  expect(router.state.location.search).toContain('sort=departmentId')

  await userEvent.click(screen.getByRole('button', { name: 'Sắp xếp: Trạng thái' }))
  await waitFor(() => expect(urls.at(-1)).toContain('sort=status'))
})

it('preset đến hạn kiểm định 30 ngày dùng dayRangeToIso', async () => {
  const { router } = renderWithProviders(<Component />)
  await screen.findByRole('link', { name: 'TB-2026-00001' })
  await userEvent.click(screen.getByRole('button', { name: 'Đến hạn kiểm định 30 ngày' }))
  await waitFor(() => expect(router.state.location.search).toContain('calibrationDueBefore='))
  // URL giữ ngày `yyyy-MM-dd`, còn request gửi ISO cuối ngày do `dayRangeToIso`.
  const expected = dayRangeToIso(undefined, plusDays(30)).to
  await waitFor(() => {
    const param = new URL(urls.at(-1) ?? '', 'http://x').searchParams.get('calibrationDueBefore')
    expect(param).toBe(expected)
  })
  expect(new Date(expected ?? '').getTime()).toBe(
    endOfDay(new Date(`${plusDays(30)}T00:00:00`)).getTime(),
  )
})

it('bỏ chọn khi đổi trang', async () => {
  server.use(
    http.get('/v1/equipment', () =>
      HttpResponse.json({ items: [listRow], total: 21, page: 1, limit: 20 }),
    ),
  )
  renderWithProviders(<Component />)
  await userEvent.click(await screen.findByRole('checkbox', { name: 'Chọn TB-2026-00001' }))
  expect(screen.getByRole('region', { name: 'Thao tác hàng loạt' })).toHaveTextContent(
    'Đã chọn 1 máy',
  )
  expect(screen.getByRole('button', { name: 'In tem QR' })).toBeEnabled()
  await userEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
  await waitFor(() =>
    expect(screen.queryByRole('region', { name: 'Thao tác hàng loạt' })).not.toBeInTheDocument(),
  )
})

it('chọn cả trang và bỏ chọn qua thanh hành động hàng loạt', async () => {
  renderWithProviders(<Component />)
  await screen.findByRole('link', { name: 'TB-2026-00001' })
  expect(screen.queryByRole('button', { name: 'In tem QR' })).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('checkbox', { name: 'Chọn cả trang' }))
  expect(screen.getByRole('checkbox', { name: 'Chọn TB-2026-00001' })).toBeChecked()
  expect(screen.getByRole('button', { name: 'So sánh' })).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: 'Bỏ chọn' }))
  expect(screen.getByRole('checkbox', { name: 'Chọn TB-2026-00001' })).not.toBeChecked()
})

it('đổi bộ lọc trong panel gọi API đúng tham số', async () => {
  renderWithProviders(<Component />)
  await screen.findByRole('link', { name: 'TB-2026-00001' })
  expect(screen.getByTestId('filter-panel')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('combobox', { name: 'Khoa' }))
  await userEvent.click(await screen.findByRole('option', { name: /Huyết học/ }))
  await waitFor(() => {
    const last = new URL(urls.filter((u) => u.includes('/v1/equipment')).at(-1) ?? '', 'http://x')
    expect(last.searchParams.get('departmentId')).toBe('d1')
  })
})

it('chip lọc nhanh "Quá hạn kiểm định" bật/tắt', async () => {
  renderWithProviders(<Component />)
  await screen.findByRole('link', { name: 'TB-2026-00001' })
  const chip = screen.getByRole('button', { name: 'Quá hạn kiểm định' })
  await userEvent.click(chip)
  await waitFor(() => expect(urls.at(-1)).toContain('calibrationOverdue=true'))
  await userEvent.click(screen.getByRole('button', { name: 'Quá hạn kiểm định' }))
  await waitFor(() => expect(urls.at(-1)).not.toContain('calibrationOverdue'))
})

it('panel thu: bộ lọc đang áp hiện thành chip gỡ được', async () => {
  localStorage.setItem('filter-panel:equipment', '0')
  const { router } = renderWithProviders(<Component />, {
    route: '/equipment?departmentId=d1&calibrationOverdue=true',
  })
  await screen.findByRole('link', { name: 'TB-2026-00001' })
  expect(screen.queryByTestId('filter-panel')).not.toBeInTheDocument()
  const chips = screen.getByTestId('filter-panel-active-chips')
  expect(await within(chips).findByRole('button', { name: /Khoa: Huyết học/ })).toBeVisible()
  await userEvent.click(within(chips).getByRole('button', { name: /Quá hạn kiểm định/ }))
  await waitFor(() => expect(router.state.location.search).not.toContain('calibrationOverdue'))
  expect(router.state.location.search).toContain('departmentId=d1')
  await userEvent.click(within(chips).getByRole('button', { name: 'Xoá lọc' }))
  await waitFor(() => expect(router.state.location.search).not.toContain('departmentId'))
  expect(screen.queryByTestId('filter-panel-active-chips')).not.toBeInTheDocument()
})

it('in tem QR gửi danh sách id đã chọn', async () => {
  let called = ''
  server.use(
    http.get('/v1/equipment/qr/labels.pdf', ({ request }) => {
      called = request.url
      return new HttpResponse('pdf')
    }),
  )
  const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:tem')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  renderWithProviders(<Component />)
  await userEvent.click(await screen.findByRole('checkbox', { name: 'Chọn TB-2026-00001' }))
  await userEvent.click(screen.getByRole('button', { name: 'In tem QR' }))
  await waitFor(() => expect(called).toContain('ids=e1'))
  const frame = await waitFor(() => {
    const el = document.querySelector<HTMLIFrameElement>('iframe[aria-hidden="true"]')
    expect(el).not.toBeNull()
    return el!
  })
  expect(create).toHaveBeenCalledOnce()
  expect(frame.getAttribute('aria-hidden')).toBe('true')
  frame.remove()
})

it('DEPT_USER không có nút ghi', async () => {
  useAuthStore.getState().setSession(fakeSession(['DEPT_USER']))
  renderWithProviders(<Component />)
  await screen.findByRole('link', { name: 'TB-2026-00001' })
  expect(screen.queryByRole('link', { name: 'Thêm máy' })).not.toBeInTheDocument()
  expect(screen.queryByRole('combobox', { name: 'Phụ trách VT' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Xuất Excel' })).toBeVisible()
})

it('mode "Theo phòng": danh sách phòng kèm số máy, bấm phòng → máy theo phòng', async () => {
  server.use(
    http.get('/v1/reports/equipment.byRoom', () =>
      HttpResponse.json({ rows: [{ roomCode: 'HH-P101', total: 3 }] }),
    ),
  )
  const { router } = renderWithProviders(<Component />)
  await screen.findByRole('link', { name: 'TB-2026-00001' })

  await userEvent.click(screen.getByRole('tab', { name: 'Theo phòng' }))
  await waitFor(() => expect(router.state.location.search).toContain('view=rooms'))

  // Danh sách phòng (kèm khoa, toà/tầng) và tổng số máy theo phòng.
  expect(await screen.findByRole('cell', { name: 'Phòng Huyết học' })).toBeVisible()
  expect(screen.getByRole('cell', { name: 'Huyết học' })).toBeVisible()
  expect(screen.getByRole('cell', { name: '3' })).toBeVisible()
  expect(screen.queryByRole('link', { name: 'TB-2026-00001' })).not.toBeInTheDocument()

  // Bấm phòng → quay lại danh sách máy, lọc theo phòng đó.
  await userEvent.click(screen.getByRole('cell', { name: 'Phòng Huyết học' }))
  await waitFor(() => expect(router.state.location.search).toContain('roomId=r1'))
  await waitFor(() =>
    expect(urls.some((u) => u.includes('/v1/equipment') && u.includes('roomId=r1'))).toBe(true),
  )
  expect(await screen.findByRole('link', { name: 'TB-2026-00001' })).toBeVisible()
})
