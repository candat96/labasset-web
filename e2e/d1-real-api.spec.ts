import { test, expect } from '@playwright/test'
import { e2eCode, e2ePass, e2eUser, login } from './helpers'

test.skip(!e2ePass, 'E2E_PASSWORD chưa đặt — xem README mục Smoke test')

test.beforeAll(async ({ request }) => {
  const response = await request.post('/v1/auth/login', {
    data: { hospitalCode: e2eCode, username: e2eUser, password: e2ePass },
  })
  expect(response.ok()).toBe(true)
})

test('D1 dashboard lấy thẻ KPI từ API thật', async ({ page }) => {
  await login(page)
  await expect(page.getByTestId('kpi-card').first()).toBeVisible()
  await expect(page.getByText('Tổng thiết bị')).toBeVisible()
  await expect(page.getByText('Giá trị tồn')).toBeVisible()
})

test('D18 việc của tôi lấy bộ đếm tổng hợp từ API thật', async ({ page }) => {
  await login(page)
  await page.goto('/my-tasks')
  await expect(page.getByRole('heading', { name: 'Việc của tôi' })).toBeVisible()
  await expect(page.getByText('Phiếu chờ duyệt')).toBeVisible()
  await expect(page.getByText('Kiểm kê đang đếm')).toBeVisible()
})

test('D1 chạy báo cáo cố định và tải Excel', async ({ page }) => {
  await login(page)
  await page.goto('/reports')
  await expect(page.locator('aside button')).toHaveCount(18)
  await page.getByRole('button', { name: 'Hiện trạng thiết bị' }).click()
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/v1/reports/equipment.byStatus') &&
      response.url().includes('format=xlsx'),
  )
  await page.getByRole('button', { name: 'Xuất Excel' }).click()
  const response = await responsePromise
  expect(response.ok()).toBe(true)
  expect(response.headers()['content-type']).toContain(
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  )
})

test('D1 tạo, xem trước và chạy báo cáo tuỳ chỉnh', async ({ page }) => {
  await login(page)
  await page.goto('/reports/custom/new')
  await expect(page.getByRole('heading', { name: 'Báo cáo tuỳ chỉnh' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Tên', exact: true }).fill(`E2E D1 ${Date.now()}`)
  await page.getByRole('button', { name: 'Xem trước' }).click()
  await expect(page.getByText(/dòng/)).toBeVisible()
  await page.getByRole('button', { name: 'Lưu' }).click()
  await expect(page.getByText('Đã lưu báo cáo tuỳ chỉnh')).toBeVisible()
  await page.getByRole('button', { name: 'Chạy Excel' }).click()
  await expect(page.getByText('Đã tạo báo cáo nền')).toBeVisible()
})
