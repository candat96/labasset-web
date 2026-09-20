import { expect, test } from '@playwright/test'
import { login } from './helpers'

const screens = [
  ['/supplies', 'Danh mục vật tư'],
  ['/stock', 'Tồn kho'],
  ['/stock/lots', 'Lô kho'],
  ['/stock/receipts', 'Phiếu nhập'],
  ['/stock/issues', 'Phiếu xuất'],
  ['/stock/transfers', 'Chuyển kho'],
  ['/stock/alerts', 'Cảnh báo kho'],
] as const

test('lượt C mở đủ màn kho với API dev thật', async ({ page }) => {
  await login(page)
  for (const [path, heading] of screens) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
    await expect(page.getByText(/Không thể tải|Có lỗi xảy ra/i)).toHaveCount(0)
  }
})
