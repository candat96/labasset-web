import { expect, type Page } from '@playwright/test'

export const e2eCode = process.env.E2E_HOSPITAL_CODE ?? 'BVDEMO'
export const e2eUser = process.env.E2E_USERNAME ?? 'admin'
export const e2ePass = process.env.E2E_PASSWORD ?? ''

/** Đăng nhập; chờ ô "Mã bệnh viện" (chỉ hiện ở chế độ multi) rồi mới điền tiếp. */
export async function login(page: Page) {
  await page.goto('/login')
  const hc = page.getByLabel('Mã bệnh viện')
  await hc.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {})
  if (await hc.isVisible().catch(() => false)) await hc.fill(e2eCode)
  await page.getByLabel('Tài khoản').fill(e2eUser)
  await page.getByLabel('Mật khẩu').fill(e2ePass)
  // Dashboard hero (12 UI rollout) không còn heading "Tổng quan" — chờ rời /login.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.getByRole('button', { name: 'Đăng nhập' }).click()
    await page
      .waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 })
      .catch(() => {})
    if (!page.url().includes('/login')) return
  }
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
}

/** Mở AsyncSelect/Select theo nhãn (khớp chính xác) và chọn option khớp (mặc định đầu tiên). */
export async function pickOption(
  page: Page,
  label: string,
  option?: string | RegExp,
  { last = false }: { last?: boolean } = {},
) {
  await page.getByRole('combobox', { name: label, exact: true }).click()
  const matches = page.getByRole('option', { name: option ?? /./ })
  await (last ? matches.last() : matches.first()).click()
}
