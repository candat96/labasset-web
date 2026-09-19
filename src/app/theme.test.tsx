import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider, useTheme } from './theme'

function Toggle() {
  const { theme, setTheme } = useTheme()
  return <button onClick={() => setTheme('dark')}>{theme}</button>
}

beforeAll(() => {
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: false,
    media: q,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
})

it('applies dark class and persists choice', async () => {
  render(
    <ThemeProvider>
      <Toggle />
    </ThemeProvider>,
  )
  expect(document.documentElement).not.toHaveClass('dark')
  await userEvent.click(screen.getByRole('button'))
  expect(document.documentElement).toHaveClass('dark')
  expect(localStorage.getItem('labasset.theme')).toBe('dark')
})
