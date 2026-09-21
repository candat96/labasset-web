import { test, expect } from '@playwright/test'
import { e2eCode, e2ePass, e2eUser, pickOption } from './helpers'

/** File 14: tạo máy có Phòng trên API thật (BVDEMO), rồi dọn máy vừa tạo. */
test.skip(!e2ePass, 'E2E_PASSWORD chưa đặt — xem README mục Smoke test')
test.use({ viewport: { width: 1440, height: 900 } })

async function loginUi(page: Parameters<typeof pickOption>[0]) {
  await page.goto('/login')
  const hc = page.getByLabel('Mã bệnh viện')
  await hc.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {})
  if (await hc.isVisible().catch(() => false)) await hc.fill(e2eCode)
  await page.getByLabel('Tài khoản').fill(e2eUser)
  await page.getByLabel('Mật khẩu').fill(e2ePass)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 })
}

test('14 tạo máy: chọn Khoa/Phòng ban → Phòng → Vị trí, chi tiết hiện phòng', async ({
  page,
  request,
}) => {
  await loginUi(page)
  await page.goto('/equipment/new')
  const room = page.getByRole('combobox', { name: 'Phòng', exact: true })
  await expect(room).toBeDisabled()
  await page.getByLabel('Tên', { exact: true }).fill(`E2E máy có phòng ${Date.now()}`)
  await pickOption(page, 'Khoa/Phòng ban', /Khoa Xét nghiệm/)
  await expect(room).toBeEnabled()
  // thiếu phòng → báo lỗi, không gửi
  await page.getByRole('button', { name: 'Lưu' }).click()
  await expect(page.getByText('Bắt buộc').first()).toBeVisible()
  await pickOption(page, 'Phòng', /Phòng Huyết học/)
  await page.getByLabel('Vị trí trong phòng').fill('Bàn E2E')
  const created = page.waitForResponse(
    (r) => r.url().includes('/v1/equipment') && r.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Lưu' }).click()
  const response = await created
  expect(response.status()).toBe(201)
  const body = (await response.json()) as { id: string }
  await page.waitForURL(`**/equipment/${body.id}`)
  await expect(page.getByText('Phòng Huyết học').first()).toBeVisible()
  await expect(page.getByText('Bàn E2E').first()).toBeVisible()

  // dọn: xoá máy vừa tạo bằng API (token từ localStorage của app)
  const auth = await page.evaluate(() => {
    const raw = localStorage.getItem('labasset.auth')
    try {
      const parsed = raw
        ? (JSON.parse(raw) as { state?: { accessToken?: string; tenantId?: string } })
        : null
      return parsed?.state ?? null
    } catch {
      return null
    }
  })
  if (auth?.accessToken) {
    const headers = {
      Authorization: `Bearer ${auth.accessToken}`,
      ...(auth.tenantId ? { 'X-Tenant-Id': auth.tenantId } : {}),
    }
    // chỉ xoá được máy retired/disposed
    for (const status of ['retired', 'disposed'])
      await request.post(`/v1/equipment/${body.id}/status`, {
        headers,
        data: { status, reason: 'dọn E2E' },
      })
    const del = await request.delete(`/v1/equipment/${body.id}`, { headers })
    expect(del.ok()).toBe(true)
  }
})
