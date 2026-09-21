import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ColumnDef } from '@tanstack/react-table'
import { renderWithProviders } from '@/test/utils'
import { DataTable } from './DataTable'
import type { ServerTableParams } from './useServerTable'

type Row = { id: string; code: string; name: string }
const columns: ColumnDef<Row>[] = [
  { accessorKey: 'code', header: 'Mã', meta: { label: 'Mã' } },
  { accessorKey: 'name', header: 'Tên', meta: { label: 'Tên' } },
]
const params: ServerTableParams = { page: 1, limit: 20, q: '', filters: {} }
const base = {
  tableId: 't',
  columns,
  params,
  onPageChange: vi.fn(),
  onLimitChange: vi.fn(),
}

it('shows skeleton while loading', () => {
  renderWithProviders(<DataTable {...base} data={undefined} total={0} isLoading />)
  expect(screen.getAllByRole('row', { busy: true }).length).toBe(10)
})

it('shows error with retry', async () => {
  const onRetry = vi.fn()
  renderWithProviders(
    <DataTable
      {...base}
      data={undefined}
      total={0}
      isLoading={false}
      error={new Error('boom')}
      onRetry={onRetry}
    />,
  )
  expect(screen.getByText('boom')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(onRetry).toHaveBeenCalled()
})

it('shows empty state', () => {
  renderWithProviders(<DataTable {...base} data={[]} total={0} isLoading={false} />)
  expect(screen.getByText('Chưa có dữ liệu')).toBeInTheDocument()
})

it('renders rows and pagination text', () => {
  renderWithProviders(
    <DataTable
      {...base}
      data={[
        { id: '1', code: 'A', name: 'Khoa A' },
        { id: '2', code: 'B', name: 'Khoa B' },
      ]}
      total={42}
      isLoading={false}
    />,
  )
  expect(screen.getByText('Khoa A')).toBeInTheDocument()
  expect(screen.getByText('Hiển thị 1–20 / 42')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Trang trước' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Trang sau' })).toBeEnabled()
})

it('hides a column via toggle and persists', async () => {
  renderWithProviders(
    <DataTable
      {...base}
      data={[{ id: '1', code: 'A', name: 'Khoa A' }]}
      total={1}
      isLoading={false}
    />,
  )
  expect(screen.getByRole('columnheader', { name: 'Tên' })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Cột' }))
  await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Tên' }))
  expect(screen.queryByRole('columnheader', { name: 'Tên' })).not.toBeInTheDocument()
  expect(JSON.parse(localStorage.getItem('labasset.table.t') ?? '{}')).toEqual({ name: false })
})
