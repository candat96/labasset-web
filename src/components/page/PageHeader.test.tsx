import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils'
import { PageHeader } from './PageHeader'

it('trang cấp 2 tự có nút quay lại về trang danh sách', async () => {
  renderWithProviders(<PageHeader title="Chi tiết" />, { route: '/equipment/abc-123' })
  expect(await screen.findByTestId('page-back')).toHaveAttribute('href', '/equipment')
})

it('trang danh sách không có nút quay lại, và `back={false}` tắt được nút', () => {
  const { unmount } = renderWithProviders(<PageHeader title="Thiết bị" />, { route: '/equipment' })
  expect(screen.queryByTestId('page-back')).not.toBeInTheDocument()
  unmount()

  renderWithProviders(<PageHeader title="Chi tiết" back={false} />, {
    route: '/equipment/abc-123',
  })
  expect(screen.queryByTestId('page-back')).not.toBeInTheDocument()
})
