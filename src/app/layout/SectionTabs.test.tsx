import { screen } from '@testing-library/react'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { SectionTabs } from './SectionTabs'

beforeEach(() => useAuthStore.getState().setSession(fakeSession()))

it('chỉ tab đang xem được chọn, tab cha không sáng theo tiền tố', async () => {
  renderWithProviders(<SectionTabs />, { route: '/repairs/stats' })
  const tabs = await screen.findByTestId('section-tabs')
  const selected = [...tabs.querySelectorAll('a')].filter(
    (a) => a.getAttribute('aria-current') === 'page',
  )
  expect(selected).toHaveLength(1)
  expect(selected[0]).toHaveAttribute('href', '/repairs/stats')
})
