import { render, screen } from '@testing-library/react'
import { KpiCard } from './kpi-card'
import { statusVariantMap, statusVariant } from '@/lib/status-variant'

describe('KpiCard (handoff 10 §4)', () => {
  it('render nhãn 13 muted, số 26/700 tabular', () => {
    render(<KpiCard title="Số máy" value={12} tone="info" />)
    expect(screen.getByText('Số máy')).toHaveClass('text-[13px]')
    expect(screen.getByText('12')).toHaveClass('text-[24px]', 'font-bold', 'tabular-nums')
  })

  it('giá trị 0 → neutral, kể cả khi tone là success', () => {
    render(<KpiCard title="Cảnh báo" value={0} tone="success" />)
    expect(screen.getByTestId('kpi-card').dataset.tone).toBe('neutral')
  })

  it('giá trị > 0 giữ tone truyền vào', () => {
    render(<KpiCard title="Quá hạn" value={3} tone="danger" />)
    expect(screen.getByTestId('kpi-card').dataset.tone).toBe('danger')
  })

  it('xu hướng ±% dạng badge có mũi tên; 0% hiển thị neutral', () => {
    const { rerender } = render(<KpiCard title="Tồn" value={5} trend={12} />)
    expect(screen.getByText('+12%')).toBeInTheDocument()
    rerender(<KpiCard title="Tồn" value={5} trend={-4} />)
    expect(screen.getByText('-4%')).toBeInTheDocument()
    rerender(<KpiCard title="Tồn" value={5} trend={0} />)
    expect(screen.getByTestId('kpi-trend').className).toContain('bg-neutral-bg')
  })
})

describe('status-variant map (một chỗ duy nhất)', () => {
  it('map đủ 5 tone → variant Badge', () => {
    expect(statusVariantMap).toEqual({
      success: 'success',
      warning: 'warning',
      danger: 'danger',
      info: 'info',
      muted: 'neutral',
    })
  })
  it('statusVariant trả về variant hợp lệ', () => {
    expect(statusVariant('muted')).toBe('neutral')
    expect(statusVariant('danger')).toBe('danger')
  })
})
