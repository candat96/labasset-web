import { test, expect } from '@playwright/test'
import { e2eCode, e2ePass, login } from './helpers'

/**
 * Handoff 16 — mã tự sinh khi thêm mới (API dev thật, tenant BVDEMO).
 * Tạo Nhà cung cấp KHÔNG nhập Mã → server tự sinh NCC-…, toast + bảng hiển thị mã.
 * Chạy: E2E_PASSWORD=… npx playwright test e2e/16-ma-tu-sinh-real-api.spec.ts
 */
test.skip(!e2ePass, 'E2E_PASSWORD chưa đặt — xem README mục Smoke test')
test.use({ viewport: { width: 1440, height: 900 } })

test('16 tạo NCC không nhập Mã: server tự sinh NCC-…, toast và bảng hiển thị mã', async ({
  page,
}) => {
  await login(page)
  await page.goto('/admin/catalogs/suppliers')
  await page.getByRole('button', { name: 'Thêm mới' }).click()
  const dialog = page.getByRole('dialog')
  // ô Mã không bắt buộc, placeholder gợi ý tự sinh
  await expect(dialog.getByLabel('Mã', { exact: true })).toHaveAttribute(
    'placeholder',
    'Để trống sẽ tự sinh (vd NCC-0001)',
  )
  await dialog.getByLabel('Tên').fill(`E2E NCC tự sinh ${Date.now()}`)
  const created = page.waitForResponse(
    (r) => r.url().includes('/v1/catalogs/suppliers') && r.request().method() === 'POST',
  )
  await dialog.getByRole('button', { name: 'Lưu' }).click()
  // toast hiển thị mã server đã sinh
  const toast = page.getByText(/Đã tạo Nhà cung cấp — mã NCC-\d+/)
  await expect(toast).toBeVisible({ timeout: 15_000 })
  const code = (await toast.textContent())?.match(/NCC-\d+/)?.[0]
  expect(code, 'server phải trả mã NCC-…').toBeTruthy()
  const response = await created
  expect(response.status()).toBe(201)
  const body = (await response.json()) as { id: string }

  // bảng danh sách hiển thị mã vừa sinh (ô Mã render dạng <code>)
  await expect(
    page.getByRole('cell').filter({ has: page.getByText(code!, { exact: true }) }),
  ).toBeVisible({ timeout: 15_000 })

  // dọn: xoá NCC vừa tạo bằng API (token từ localStorage của app)
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
  expect(e2eCode).toBeTruthy()
  if (auth?.accessToken) {
    const deleted = await page.request.delete(`/v1/catalogs/suppliers/${body.id}`, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        'X-Tenant-Id': auth.tenantId ?? '',
      },
    })
    expect([200, 204]).toContain(deleted.status())
  }
})
