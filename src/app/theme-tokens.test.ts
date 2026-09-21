import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const css = readFileSync(resolve(__dirname, '../index.css'), 'utf8')

function tokenBlock(selector: string): string {
  // Tìm block khai báo thật: ":root {" (không khớp "@custom-variant .dark *")
  const start = css.indexOf(`${selector} {`)
  expect(start).toBeGreaterThan(-1)
  const end = css.indexOf('}', start)
  return css.slice(start, end)
}

describe('theme tokens (BRAND-COLOR #2977FF, nền trắng)', () => {
  it('dùng primary #2977ff (BRAND-COLOR) và không còn màu sky cũ', () => {
    expect(css).not.toContain('#0284c7')
    expect(css).not.toContain('#0369a1')
    expect(tokenBlock(':root')).toContain('--primary: #2977ff')
    expect(tokenBlock(':root')).toContain('--primary-hover: #1e63e0')
    expect(tokenBlock(':root')).toContain('--ring: #2977ff')
  })

  it('nền trắng (người dùng chốt) + surface-2 + card trắng có bóng/viền', () => {
    const root = tokenBlock(':root')
    expect(root).toContain('--background: #ffffff')
    expect(root).toContain('--surface-2: #f6f8fc')
    expect(root).toContain('--card: #ffffff')
    expect(root).toContain('--shadow-card:')
  })

  it('có đủ cặp bg/fg cho 4 trạng thái + neutral', () => {
    const root = tokenBlock(':root')
    for (const name of ['success', 'warning', 'destructive', 'info', 'neutral']) {
      expect(root).toContain(`--${name}-bg:`)
      expect(root).toContain(`--${name}-fg:`)
    }
  })

  it('sidebar tối và có màu accent item active', () => {
    const root = tokenBlock(':root')
    expect(root).toContain('--sidebar: #0b1530')
    expect(root).toContain('--sidebar-accent: #16234a')
    expect(root).toContain('--sidebar-primary: #5c9bff')
  })

  it('dark dùng nền tonal #0b1220, card #151e2e viền #22304a', () => {
    const dark = tokenBlock('.dark')
    expect(dark).toContain('--background: #0b1220')
    expect(dark).toContain('--card: #151e2e')
    expect(dark).toContain('--border: #22304a')
  })

  it('map Tailwind theme để dùng bg-success-bg / text-success-fg…', () => {
    const theme = tokenBlock('@theme inline')
    for (const name of ['success', 'warning', 'info', 'destructive', 'neutral']) {
      expect(theme).toContain(`--color-${name}-bg:`)
      expect(theme).toContain(`--color-${name}-fg:`)
    }
    expect(theme).toContain('--color-divider:')
  })

  it('radius 0.625rem (control 10px, card 14px)', () => {
    expect(tokenBlock(':root')).toContain('--radius: 0.625rem')
  })
})
