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

describe('theme tokens (handoff 10 — Clean Enterprise)', () => {
  it('dùng primary #0369a1 và không còn #0284c7', () => {
    expect(css).not.toContain('#0284c7')
    expect(tokenBlock(':root')).toContain('--primary: #0369a1')
    expect(tokenBlock(':root')).toContain('--ring: #0369a1')
  })

  it('nền xám rõ + card trắng, có bóng card', () => {
    const root = tokenBlock(':root')
    expect(root).toContain('--background: #f1f5f9')
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
    expect(root).toContain('--sidebar: #0f172a')
    expect(root).toContain('--sidebar-foreground: #cbd5e1')
    expect(root).toContain('--sidebar-accent: #1e293b')
    expect(root).toContain('--sidebar-primary: #38bdf8')
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

  it('radius 0.5rem (card 12px, control 8px)', () => {
    expect(tokenBlock(':root')).toContain('--radius: 0.5rem')
  })
})
