import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { ImportDialog } from './ImportDialog'

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
beforeEach(() => useAuthStore.getState().setSession(fakeSession()))

it('rejects files over 5 MB', async () => {
  renderWithProviders(<ImportDialog open onOpenChange={() => {}} />)
  const big = new File([new Uint8Array(1)], 'big.xlsx', { type: XLSX })
  Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 })
  await userEvent.upload(screen.getByLabelText('Tệp Excel'), big)
  expect(await screen.findByRole('alert')).toHaveTextContent('Tệp vượt quá 5 MB')
  expect(screen.getByRole('button', { name: 'Nhập' })).toBeDisabled()
})

it('uploads and shows row errors', async () => {
  server.use(
    http.post('/v1/departments/import', () =>
      HttpResponse.json({
        created: 0,
        updated: 0,
        errors: [{ row: 4, field: 'type', message: 'Loại không hợp lệ' }],
      }),
    ),
  )
  renderWithProviders(<ImportDialog open onOpenChange={() => {}} />)
  await userEvent.upload(
    screen.getByLabelText('Tệp Excel'),
    new File(['x'], 'khoa.xlsx', { type: XLSX }),
  )
  await userEvent.click(screen.getByRole('button', { name: 'Nhập' }))
  expect(await screen.findByText('Loại không hợp lệ')).toBeInTheDocument()
  expect(screen.getByText('4')).toBeInTheDocument()
})
