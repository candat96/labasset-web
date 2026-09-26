import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** Khoá giá trị token theo Figma Medone (Z3jY6G2YHCOtXGda5fz0fD) —
 *  đổi màu phải sửa cả test này để không trôi theme. */
const css = readFileSync('src/index.css', 'utf8')
const root = css.slice(css.indexOf(':root {'), css.indexOf('.dark {'))
const dark = css.slice(css.indexOf('.dark {'), css.indexOf('@theme inline'))
const read = (block: string, name: string): string =>
  (block.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1] ?? '').trim()

describe('token Medone — chế độ sáng', () => {
  it('bảng màu vai trò', () => {
    expect(read(root, 'primary')).toBe('#006fee')
    expect(read(root, 'primary-hover')).toBe('#005bc4')
    expect(read(root, 'primary-soft')).toBe('#e6f1fe')
    expect(read(root, 'destructive')).toBe('#f31260')
    expect(read(root, 'destructive-bg')).toBe('#fee7ef')
    expect(read(root, 'success')).toBe('#17c964')
    expect(read(root, 'success-bg')).toBe('#e8faf0')
    expect(read(root, 'warning')).toBe('#f5a524')
    expect(read(root, 'warning-bg')).toBe('#fefce8')
    expect(read(root, 'accent-strong')).toBe('#7828c8')
  })
  it('thang xám và đường kẻ', () => {
    expect(read(root, 'foreground')).toBe('#11181c')
    expect(read(root, 'muted-foreground')).toBe('#71717a')
    expect(read(root, 'subtle')).toBe('#a1a1aa')
    expect(read(root, 'muted')).toBe('#f4f4f5')
    expect(read(root, 'border')).toBe('#d4d4d8')
    expect(read(root, 'surface-2')).toBe('#f4f4f5')
  })
  it('bo góc 12px và đổ bóng nhẹ theo Figma', () => {
    expect(read(root, 'radius')).toBe('12px')
    expect(read(root, 'shadow-card')).toContain('0 1px 2px')
  })
})

describe('token Medone — chế độ tối', () => {
  it('màu chính sáng hơn để nổi trên nền tối', () => {
    expect(read(dark, 'primary')).toBe('#4c9dff')
    expect(read(dark, 'primary-soft')).toBe('#0a2a52')
  })
})

describe('cấu trúc token giữ nguyên', () => {
  it('đủ cặp nền/chữ cho 5 vai trò trạng thái', () => {
    for (const name of ['success', 'warning', 'destructive', 'info', 'neutral']) {
      expect(root).toContain(`--${name}-bg:`)
      expect(root).toContain(`--${name}-fg:`)
    }
  })
  it('không còn màu thương hiệu cũ trong token', () => {
    expect(root).not.toContain('#2977ff')
    expect(root).not.toContain('#1e63e0')
  })
  it('chế độ tối giữ nền tonal và card riêng', () => {
    expect(read(dark, 'background')).toBe('#0b1220')
    expect(read(dark, 'card')).toBe('#151e2e')
    expect(read(dark, 'border')).toBe('#22304a')
  })
})

describe('chữ', () => {
  it('dùng Inter làm họ chữ chính', () => {
    expect(css).toMatch(/--font-sans:\s*'Inter Variable'/)
  })
})
