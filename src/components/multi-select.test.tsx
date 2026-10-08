import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { renderWithProviders } from '@/test/utils'
import { MultiSelect } from './multi-select'

const OPTIONS = [
  { value: 'broken', label: 'Hỏng' },
  { value: 'active', label: 'Hoạt động' },
]

function Harness() {
  const [value, setValue] = useState<string[]>(['broken'])
  return (
    <>
      <MultiSelect value={value} onChange={setValue} options={OPTIONS} placeholder="Trạng thái" />
      <p data-testid="value">{value.join(',')}</p>
    </>
  )
}

it('bấm X trên chip thì bỏ chọn giá trị đó', async () => {
  renderWithProviders(<Harness />)
  expect(screen.getByTestId('value')).toHaveTextContent('broken')
  await userEvent.click(screen.getByRole('button', { name: 'Bỏ chọn Hỏng' }))
  expect(screen.getByTestId('value')).toHaveTextContent('')
})
