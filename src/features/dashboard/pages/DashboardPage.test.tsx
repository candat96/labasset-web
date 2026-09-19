import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/utils'
import { Component as DashboardPage } from './DashboardPage'

it('renders 7 mock KPI cards with a mock badge', async () => {
  renderWithProviders(<DashboardPage />)
  expect(await screen.findAllByTestId('kpi-card')).toHaveLength(7)
  expect(screen.getByText('Dữ liệu mẫu')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Phiếu chờ duyệt/ })).toHaveAttribute('href', '/requests')
})
