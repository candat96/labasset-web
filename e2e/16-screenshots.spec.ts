import { test, expect } from '@playwright/test'
import { e2ePass, login } from './helpers'

/**
 * Chụp màn hình handoff 16 — mã tự sinh. Không assert nghiêm ngoài luồng chính.
 * Chạy: E2E_PASSWORD=… npx playwright test e2e/16-screenshots.spec.ts
 */
const dir = process.env.SHOT_DIR ?? '../docs/superpowers/handoff/web/screenshots'

test.skip(!e2ePass, 'E2E_PASSWORD chưa đặt — xem README mục Smoke test')
test.use({ viewport: { width: 1440, height: 900 } })

test('chụp ảnh 16: form NCC, toast mã sinh, màn Đánh số', async ({ page }) => {
  await login(page)

  // 1) Dialog thêm Nhà cung cấp — ô Mã placeholder "Để trống sẽ tự sinh (vd NCC-0001)"
  await page.goto('/admin/catalogs/suppliers')
  await page.getByRole('button', { name: 'Thêm mới' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Tên').fill('NCC demo tự sinh')
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${dir}/16-ncc-form.png` })

  // 2) Lưu → toast "Đã tạo Nhà cung cấp — mã NCC-…"
  const created = page.waitForResponse(
    (r) => r.url().includes('/v1/catalogs/suppliers') && r.request().method() === 'POST',
  )
  await dialog.getByRole('button', { name: 'Lưu' }).click()
  const toast = page.getByText(/Đã tạo Nhà cung cấp — mã NCC-\d+/)
  await expect(toast).toBeVisible({ timeout: 15_000 })
  const response = await created
  const body = (await response.json()) as { id: string }
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${dir}/16-ncc-toast.png` })

  // dọn NCC vừa tạo
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
    await page.request.delete(`/v1/catalogs/suppliers/${body.id}`, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        'X-Tenant-Id': auth.tenantId ?? '',
      },
    })
  }

  // 3) Cấu hình → Đánh số: các loại mới (Khoa/Phòng ban, Nhà cung cấp…)
  await page.goto('/admin/settings?tab=numbering')
  await page.getByLabel('Khoa/Phòng ban').waitFor({ state: 'visible', timeout: 15_000 })
  await page.evaluate(() => document.fonts?.ready)
  await page.screenshot({ path: `${dir}/16-danh-so.png` })
  // kéo tới nhóm loại mới (khoa/phòng, vật tư, catalog.*) rồi chụp ảnh phụ
  await page.locator('#number-catalog\\.suppliers').scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${dir}/16-danh-so-loai-moi.png` })
})
