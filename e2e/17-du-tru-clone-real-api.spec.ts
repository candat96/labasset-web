import { expect, test, type Page } from '@playwright/test'
import { e2ePass, login } from './helpers'

/**
 * File 17 (review E1a phần B): kiểm chứng nút "Sao chép sang kỳ mới" chạy thật
 * trên API dev (BVDEMO) — ADM + kỳ `approved`.
 *
 * Chạy: E2E_PASSWORD=… npx playwright test e2e/17-du-tru-clone-real-api.spec.ts
 */
test.skip(!e2ePass, 'E2E_PASSWORD chưa đặt — xem README mục Smoke test')
test.use({ viewport: { width: 1440, height: 900 } })

const dir = process.env.SHOT_DIR ?? '../docs/superpowers/handoff/web/screenshots'

/** Gọi API bằng session admin đã đăng nhập trong localStorage (mẫu demand.spec). */
async function sessionApi(page: Page) {
  const raw = await page.evaluate(() => localStorage.getItem('labasset.auth'))
  const auth = JSON.parse(raw ?? '{}') as {
    state?: { accessToken?: string; tenantId?: string }
  }
  const headers = {
    Authorization: `Bearer ${auth.state?.accessToken ?? ''}`,
    'X-Tenant-Id': auth.state?.tenantId ?? '',
  }
  const call = async <T>(method: string, path: string, data?: unknown): Promise<T> => {
    const response = await page.request.fetch(path, { method, headers, data })
    expect(response.ok(), `${method} ${path}: ${await response.text()}`).toBeTruthy()
    return response.json() as Promise<T>
  }
  return { call }
}

test('17 B1: tạo kỳ đã chốt → UI Sao chép sang kỳ mới chạy thật trên API dev', async ({ page }) => {
  test.setTimeout(240_000)
  await login(page)
  const admin = await sessionApi(page)

  // Dựng kỳ nguồn ở trạng thái approved (không xoá được kỳ nên dùng năm chưa chiếm).
  const existing = await admin.call<{ items: Array<{ year: number }> }>(
    'GET',
    '/v1/demand/periods?limit=100',
  )
  const used = new Set(existing.items.map((p) => p.year))
  let year = 2070
  while (used.has(year)) year += 1
  const created = await admin.call<{ id: string; code: string }>('POST', '/v1/demand/periods', {
    name: `Dự trù kiểm thử B1 ${year}`,
    kind: 'annual',
    year,
  })
  await admin.call('POST', `/v1/demand/periods/${created.id}/open`)
  await admin.call('POST', `/v1/demand/periods/${created.id}/consolidate?skipUnsubmitted=true`)
  const approved = await admin.call<{ status: string }>(
    'POST',
    `/v1/demand/periods/${created.id}/approve`,
  )
  expect(approved.status).toBe('approved')

  await page.goto(`/procurement/demand/periods/${created.id}`)
  await expect(page.getByText(`Dự trù kiểm thử B1 ${year}`)).toBeVisible()

  // Chỉ ADM + approved|closed mới có nút.
  await page.getByRole('button', { name: 'Sao chép sang kỳ mới' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  // Mặc định = kỳ hiện tại + 1 năm (ô Tên + ô Năm).
  expect(await dialog.locator('input').first().inputValue()).toBe(`Dự trù năm ${year + 1}`)
  expect(await dialog.locator('input').nth(1).inputValue()).toBe(String(year + 1))
  await page.screenshot({ path: `${dir}/17-clone-dialog.png` })

  await page.getByRole('button', { name: 'Tạo kỳ mới' }).click()
  await expect(page.getByText('Đã sao chép sang kỳ mới')).toBeVisible({ timeout: 20_000 })
  await expect(page).toHaveURL(
    new RegExp(`/procurement/demand/periods/(?!${created.id})[0-9a-f-]{8,}`),
  )
  await page.screenshot({ path: `${dir}/17-clone-done.png` })
})
