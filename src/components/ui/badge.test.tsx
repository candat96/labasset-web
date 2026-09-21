import { render, screen } from '@testing-library/react'
import { Badge } from './badge'

describe('Badge variants Clean Enterprise (handoff 10 §3)', () => {
  it.each(['success', 'warning', 'danger', 'info', 'neutral'] as const)(
    'variant %s dùng cặp bg/fg token, không viền',
    (variant) => {
      render(<Badge variant={variant} data-testid="b">{variant}</Badge>)
      const el = screen.getByTestId('b')
      expect(el.dataset.variant).toBe(variant)
      expect(el.className).not.toContain('border-border')
      expect(el.className).toContain('-bg')
      expect(el.className).toContain('-fg')
    },
  )

  it('dot 6px tuỳ chọn, mặc định không có', () => {
    const { rerender } = render(<Badge variant="success" data-testid="b">OK</Badge>)
    expect(screen.getByTestId('b').querySelector('span[aria-hidden]')).toBeNull()
    rerender(<Badge variant="success" dot data-testid="b">OK</Badge>)
    const dotEl = screen.getByTestId('b').querySelector('span[aria-hidden]')
    expect(dotEl).not.toBeNull()
    expect(dotEl!.className).toContain('size-1.5')
  })

  it('asChild vẫn slot đúng 1 element con (không chèn dot)', () => {
    render(
      <Badge asChild>
        <a href="/x">Liên kết</a>
      </Badge>,
    )
    expect(screen.getByRole('link', { name: 'Liên kết' })).toBeInTheDocument()
  })
})
