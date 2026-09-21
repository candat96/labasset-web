import { expect, test } from '@playwright/test'
import { e2ePass, login } from './helpers'

test.skip(!e2ePass, 'E2E_PASSWORD chưa đặt — xem README mục Smoke test')

test('08+09: dashboard, báo cáo fallback và trạng thái AI trên API dev thật', async ({ page }) => {
  await login(page)
  await page.goto('/')
  // 12 UI rollout: hero dashboard thay heading "Tổng quan".
  await expect(page.getByTestId('dashboard-hero')).toBeVisible()
  await expect(page.getByText('Giá trị tồn').first()).toBeVisible()

  await page.goto('/reports')
  await expect(page.getByRole('heading', { name: 'Báo cáo', exact: true })).toBeVisible()
  // 5763706: báo cáo chạy API D1 thật — không còn badge "Dữ liệu mẫu";
  // registry động (14: 19 báo cáo) nên đếm nút trong data-testid="report-list".
  const listItems = page.getByTestId('report-list').getByRole('button')
  await expect(listItems.first()).toBeVisible()
  expect(await listItems.count()).toBeGreaterThanOrEqual(18)

  await page.goto('/assistant')
  // 13: chat mới — dev API đã bật AI (không rơi vào EmptyState "chưa bật").
  await expect(page.getByRole('region', { name: 'Trợ lý AI' })).toBeVisible({ timeout: 10_000 })
  await expect(page.getByPlaceholder('Hỏi về máy, lỗi, vật tư, kiểm định…')).toBeVisible()
})
