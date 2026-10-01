import { screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { renderWithProviders, fakeSession } from '@/test/utils'
import { useAuthStore } from '@/stores/auth.store'
import { LotsOfBalanceDialog } from './LotsOfBalanceDialog'

const open = () =>
  renderWithProviders(
    <LotsOfBalanceDialog
      supplyId="s1"
      supplyName="Cồn 70 độ"
      warehouseId="w1"
      warehouseName="Kho trung tâm"
      onClose={vi.fn()}
    />,
  )

beforeEach(() => {
  useAuthStore.getState().setSession(fakeSession())
})

it('một vật tư nhiều lô: hiện đủ từng lô kèm hạn dùng và tồn', async () => {
  server.use(
    http.get('/v1/stock/lots', () =>
      HttpResponse.json({
        items: [
          {
            id: 'l1',
            lotNo: 'LOT-A',
            expiresAt: '2027-03-31',
            qtyOnHand: '120.000',
            qtyReserved: '0.000',
            status: 'available',
          },
          {
            id: 'l2',
            lotNo: 'LOT-B',
            expiresAt: '2026-12-31',
            qtyOnHand: '30.500',
            qtyReserved: '5.000',
            status: 'quarantine',
          },
        ],
        total: 2,
      }),
    ),
  )
  open()

  await waitFor(() => expect(screen.getByText('LOT-A')).toBeVisible())
  expect(screen.getByText('LOT-B')).toBeVisible()
  expect(screen.getByText('31/03/2027')).toBeVisible()
  // Số lượng cắt đuôi 0, không hiện "120.000" kiểu numeric.
  expect(screen.getByText('120')).toBeVisible()
  expect(screen.getByText('30,5')).toBeVisible()
})

it('kho chưa có lô nào thì nói rõ, không để bảng trống trơn', async () => {
  server.use(http.get('/v1/stock/lots', () => HttpResponse.json({ items: [], total: 0 })))
  open()
  await waitFor(() => expect(screen.getByText(/chưa có lô/i)).toBeVisible())
})
