import { expect, test, type Page } from '@playwright/test'
import { e2ePass, login } from './helpers'

/**
 * File 18 (KPI hiệu suất kỹ thuật): chạy thật trên API dev (BVDEMO/admin) —
 * xếp hạng + huy hiệu, chi tiết người, chốt/bỏ chốt kỳ, xuất Excel, tab Cài đặt KPI,
 * Help mục Hiệu suất kỹ thuật. Chụp 18-1..4.
 *
 * Chạy: E2E_PASSWORD=… npx playwright test e2e/18-kpi-hieu-suat.spec.ts
 */
test.skip(!e2ePass, 'E2E_PASSWORD chưa đặt — xem README mục Smoke test')
test.use({ viewport: { width: 1440, height: 900 } })

const dir = process.env.SHOT_DIR ?? '../docs/superpowers/handoff/web/screenshots'
const PAST_MONTH = '2026-08-01'

async function sessionApi(page: Page) {
  const raw = await page.evaluate(() => localStorage.getItem('labasset.auth'))
  const auth = JSON.parse(raw ?? '{}') as { state?: { accessToken?: string; tenantId?: string } }
  const headers = {
    Authorization: `Bearer ${auth.state?.accessToken ?? ''}`,
    'X-Tenant-Id': auth.state?.tenantId ?? '',
  }
  const call = async <T>(method: string, path: string, data?: unknown): Promise<T> => {
    const response = await page.request.fetch(path, { method, headers, data })
    expect(response.ok(), `${method} ${path}: ${await response.text()}`).toBeTruthy()
    if (response.status() === 204) return undefined as T
    return response.json() as Promise<T>
  }
  return { call }
}

test('18: Hiệu suất kỹ thuật — xếp hạng, chi tiết, chốt kỳ, cài đặt, Help', async ({ page }) => {
  test.setTimeout(300_000)
  await login(page)
  const admin = await sessionApi(page)

  // 18-1: tổng quan xếp hạng (mặc định tháng hiện tại)
  await page.goto('/performance')
  await expect(page.getByText('Bảng xếp hạng')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByTestId('rank-1')).toBeVisible()
  await page.screenshot({ path: `${dir}/18-1.png` })

  // đổi loại kỳ Tuần/Tháng/Quý/Năm
  for (const [name, type] of [
    ['Tuần', 'week'],
    ['Quý', 'quarter'],
    ['Năm', 'year'],
  ] as const) {
    await page.getByRole('tab', { name, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`type=${type}`))
    await page.waitForTimeout(600)
  }
  await page.getByRole('tab', { name: 'Tháng', exact: true }).click()
  await expect(page).toHaveURL(/type=month/)

  // 18-2: chi tiết một kỹ thuật viên
  await page.getByTestId('rank-1').getByRole('link').click()
  await expect(page).toHaveURL(/\/performance\/users\//)
  await expect(page.getByText('Điểm tổng 6 kỳ gần nhất')).toBeVisible({ timeout: 20_000 })
  await page.screenshot({ path: `${dir}/18-2.png` })

  // chốt rồi bỏ chốt một kỳ đã kết thúc
  await admin.call('DELETE', `/v1/performance/periods/month/${PAST_MONTH}/lock`).catch(() => {})
  await page.goto(`/performance?type=month&start=${PAST_MONTH}`)
  await expect(page.getByText('Bảng xếp hạng')).toBeVisible({ timeout: 20_000 })
  await page.getByRole('button', { name: 'Chốt kỳ' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Chốt kỳ' }).click()
  await expect(page.getByText(/Đã chốt \d{2}\/\d{2}/).first()).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('button', { name: 'Chốt kỳ' })).toHaveCount(0)
  await expect(page.getByText('Bản chốt không lưu thời gian xử lý')).toBeVisible()
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${dir}/18-3.png` })
  await page.getByRole('button', { name: 'Bỏ chốt' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Bỏ chốt' }).click()
  await expect(page.getByText(/Đang diễn ra/)).toBeVisible({ timeout: 20_000 })

  // xuất Excel tải được
  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 })
  await page.getByRole('button', { name: 'Xuất Excel' }).click()
  const download = await downloadPromise
  expect(await download.path()).toBeTruthy()

  // tab Cài đặt KPI sửa được trọng số
  await page.goto('/admin/settings?tab=kpi')
  const repair = page.getByLabel('Sửa chữa', { exact: true }).first()
  await expect(repair).toBeVisible({ timeout: 20_000 })
  const beforeSettings = await admin.call<Record<string, unknown>>('GET', '/v1/settings')
  const originalWeights = beforeSettings['kpi.areaWeights']
  const before = await repair.inputValue()
  await repair.fill(String(Number(before) + 1))
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click()
  await expect(page.getByText('Đã lưu cấu hình').first()).toBeVisible({ timeout: 20_000 })
  // khôi phục cấu hình gốc qua API (tránh toast che nút Lưu)
  await admin.call('PUT', '/v1/settings', { 'kpi.areaWeights': originalWeights })

  // 18-4: Help mục Hiệu suất kỹ thuật
  await page.goto('/help')
  const section = page.locator('#hieu-suat-ky-thuat')
  await expect(section).toBeVisible({ timeout: 20_000 })
  await section.scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  await section.screenshot({ path: `${dir}/18-4.png` })
})
