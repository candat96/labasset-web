import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test/utils'
import { DatePicker } from './date-picker'

it('mở lịch là chọn được tháng và năm bằng ô thả xuống', async () => {
  renderWithProviders(<DatePicker value="2026-10-07" onChange={() => {}} ariaLabel="Ngày nhận" />)
  await userEvent.click(screen.getByRole('button', { name: 'Ngày nhận' }))

  // react-day-picker đặt nhãn sẵn cho hai ô: "Tháng" / "Năm".
  const dropdowns = await screen.findAllByRole('combobox')
  expect(dropdowns).toHaveLength(2)
  // Khoảng năm phải với tới các máy mua từ lâu.
  const years = [...(dropdowns[1] as HTMLSelectElement).options].map((o) => Number(o.value))
  expect(Math.min(...years)).toBeLessThanOrEqual(new Date().getFullYear() - 50)
})
