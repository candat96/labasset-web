import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterPanel, defaultPanelOpen } from './FilterPanel'

const chips = [
  { key: 'dept', label: 'Khoa: Nội', onRemove: vi.fn() },
  { key: 'status', label: 'Trạng thái: Hỏng', onRemove: vi.fn() },
]

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('FilterPanel (§UX quyết định 4)', () => {
  it('mặc định mở khi màn ≥ 1600, thu khi nhỏ hơn', () => {
    expect(defaultPanelOpen(1600)).toBe(true)
    expect(defaultPanelOpen(1366)).toBe(false)
  })

  it('màn nhỏ: panel thu, bộ lọc đang áp hiện thành chip gỡ được', async () => {
    localStorage.setItem('filter-panel:equipment', '0')
    render(
      <FilterPanel storageKey="equipment" fields={<div>trường lọc</div>} activeFilters={chips}>
        <div>bảng</div>
      </FilterPanel>,
    )
    expect(screen.queryByTestId('filter-panel')).not.toBeInTheDocument()
    expect(screen.getByTestId('filter-panel-active-chips')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Khoa: Nội' }))
    expect(chips[0]!.onRemove).toHaveBeenCalled()
  })

  it('mở panel rồi ghi nhớ trạng thái vào localStorage', async () => {
    localStorage.setItem('filter-panel:equipment', '0')
    render(
      <FilterPanel storageKey="equipment" fields={<div>trường lọc</div>}>
        <div>bảng</div>
      </FilterPanel>,
    )
    await userEvent.click(screen.getByTestId('filter-panel-open'))
    expect(screen.getByTestId('filter-panel')).toBeInTheDocument()
    expect(localStorage.getItem('filter-panel:equipment')).toBe('1')
  })

  it('panel mở thì không lặp chip lọc, và có nút Cài đặt lại / Áp dụng', () => {
    localStorage.setItem('filter-panel:equipment', '1')
    const onReset = vi.fn()
    const onApply = vi.fn()
    render(
      <FilterPanel
        storageKey="equipment"
        fields={<div>trường lọc</div>}
        activeFilters={chips}
        onReset={onReset}
        onApply={onApply}
      >
        <div>bảng</div>
      </FilterPanel>,
    )
    expect(screen.queryByTestId('filter-panel-active-chips')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cài đặt lại' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Áp dụng' })).toBeInTheDocument()
  })

  it('ô tìm kiếm truyền qua toolbar luôn hiện dù panel mở hay thu', () => {
    const { rerender } = render(
      <FilterPanel storageKey="a" fields={<div />} toolbar={<input aria-label="Tìm kiếm" />}>
        <div>bảng</div>
      </FilterPanel>,
    )
    expect(screen.getByLabelText('Tìm kiếm')).toBeInTheDocument()
    localStorage.setItem('filter-panel:a', '1')
    rerender(
      <FilterPanel storageKey="a" fields={<div />} toolbar={<input aria-label="Tìm kiếm" />}>
        <div>bảng</div>
      </FilterPanel>,
    )
    expect(screen.getByLabelText('Tìm kiếm')).toBeInTheDocument()
  })
})
