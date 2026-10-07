import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { NavRail } from './NavRail'

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
  localStorage.clear()
})

it('hiện các nhóm menu theo quyền và đánh dấu nhóm đang mở', async () => {
  renderWithProviders(<NavRail />)
  const groups = await screen.findAllByTestId('rail-group')
  expect(groups.length).toBeGreaterThan(5)
  expect(groups[0]).toHaveAttribute('aria-current', 'page')
})

it('rê chuột mở bảng nhãn, rời chuột thì thu lại', async () => {
  renderWithProviders(<NavRail />)
  const rail = await screen.findByTestId('nav-rail')
  expect(screen.getByTestId('rail-flyout')).toHaveAttribute('aria-hidden', 'true')
  await userEvent.hover(rail)
  expect(screen.getByTestId('rail-flyout')).toHaveAttribute('aria-hidden', 'false')
})

it('ghim giữ bảng nhãn mở và nhớ lựa chọn', async () => {
  renderWithProviders(<NavRail />)
  await userEvent.click(await screen.findByTestId('rail-pin'))
  expect(screen.getByTestId('rail-flyout')).toHaveAttribute('aria-hidden', 'false')
  expect(localStorage.getItem('nav-rail-pinned')).toBe('1')
})

it('chỉ mục con đang xem được đánh dấu, mục cha không còn sáng theo', async () => {
  renderWithProviders(<NavRail />, { route: '/repairs/stats' })
  await userEvent.hover(await screen.findByTestId('nav-rail'))

  const stats = screen.getByRole('link', { name: /thống kê sửa chữa/i })
  const repairs = screen.getByRole('link', { name: /^phiếu sửa chữa$/i })
  expect(stats).toHaveAttribute('aria-current', 'page')
  expect(repairs).not.toHaveAttribute('aria-current')
})

it('màn chi tiết vẫn sáng mục cha vì không có mục menu nào khớp sâu hơn', async () => {
  renderWithProviders(<NavRail />, { route: '/equipment/abc-123' })
  await userEvent.hover(await screen.findByTestId('nav-rail'))

  const equipment = screen.getByRole('link', { name: /^thiết bị$/i })
  expect(equipment).toHaveAttribute('aria-current', 'page')
})

it('thu gọn thì bảng nhãn chỉ hiện nhóm đang chọn, ghim thì hiện mọi nhóm', async () => {
  renderWithProviders(<NavRail />, { route: '/repairs' })
  await userEvent.hover(await screen.findByTestId('nav-rail'))

  // Chỉ xét bảng nhãn: biểu tượng nhóm trên rail cũng mang tên nhóm.
  const flyout = () => screen.getByTestId('rail-flyout')
  const labels = () =>
    [...flyout().querySelectorAll('a')].map((a) => a.textContent?.trim().toLowerCase())

  // Thu gọn: chỉ thấy tính năng của nhóm Sửa chữa.
  expect(labels()).toContain('phiếu sửa chữa')
  expect(labels()).not.toContain('hồ sơ thiết bị')

  await userEvent.click(screen.getByTestId('rail-pin'))
  expect(labels()).toContain('hồ sơ thiết bị')
})
