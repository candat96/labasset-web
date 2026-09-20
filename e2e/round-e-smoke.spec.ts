import { expect, test } from '@playwright/test'
import { e2ePass, login } from './helpers'

test.skip(!e2ePass, 'E2E_PASSWORD chưa đặt — xem README mục Smoke test')

test('08+09: dashboard, báo cáo fallback và trạng thái AI trên API dev thật', async ({ page }) => {
  await login(page)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Tổng quan' })).toBeVisible()
  await expect(page.getByText('Giá trị tồn kho')).toBeVisible()

  await page.goto('/reports')
  await expect(page.getByRole('heading', { name: 'Báo cáo' })).toBeVisible()
  await expect(page.getByText('Dữ liệu mẫu')).toBeVisible()
  await expect(page.locator('aside button')).toHaveCount(18)

  await page.goto('/assistant')
  await expect(page.getByRole('heading', { name: 'Trợ lý AI' })).toBeVisible()
  await expect(page.getByText(/Chưa bật/)).toBeVisible()
})
