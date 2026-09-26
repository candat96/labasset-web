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
