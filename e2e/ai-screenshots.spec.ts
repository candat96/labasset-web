import { test } from '@playwright/test'
import { e2eCode, e2ePass, e2eUser } from './helpers'

/**
 * Chụp màn Trợ lý AI + tab AI Cấu hình (1440×900, dữ liệu thật của tenant dev).
 * Chạy: E2E_PASSWORD=… SHOT_DIR=../docs/superpowers/handoff/web/screenshots npx playwright test e2e/ai-screenshots.spec.ts
 */
const dir = process.env.SHOT_DIR ?? 'e2e/shots'
const conversation = process.env.SHOT_CONVERSATION

test.use({ viewport: { width: 1440, height: 900 } })

test.skip(!process.env.E2E_PASSWORD, 'cần E2E_PASSWORD')

test('trợ lý AI + tab AI', async ({ page }) => {
  await page.goto('/login')
  const hc = page.getByLabel('Mã bệnh viện')
  await hc.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {})
  if (await hc.isVisible().catch(() => false)) await hc.fill(e2eCode)
  await page.getByLabel('Tài khoản').fill(e2eUser)
  await page.getByLabel('Mật khẩu').fill(e2ePass)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 })
  await page.evaluate(() => localStorage.setItem('labasset.assistant.panel', 'closed'))
  await page.goto('/assistant')
  await page.getByRole('textbox', { name: 'Câu hỏi' }).waitFor()
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${dir}/13-ai-chat-empty.png` })

  await page.getByRole('button', { name: 'Hiện danh sách hội thoại' }).click()
  const panel = page.getByRole('complementary', { name: 'Hội thoại' })
  await panel.waitFor()
  const first = conversation
    ? panel.getByRole('button', { name: conversation, exact: true })
    : panel.locator('li button[aria-label]').first()
  await first.waitFor({ timeout: 10_000 })
  await first.click()
  await page.locator('[data-role="assistant"]').first().waitFor({ timeout: 10_000 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${dir}/13-ai-chat-panel.png` })
  await page.getByRole('button', { name: 'Ẩn danh sách hội thoại' }).click()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${dir}/13-ai-chat.png` })

  await page.goto('/admin/settings?tab=ai')
  await page.getByLabel('Base URL', { exact: true }).waitFor()
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${dir}/13-ai-settings.png`, fullPage: true })
})
