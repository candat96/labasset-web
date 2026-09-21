import { test } from '@playwright/test'
import { e2eCode, e2ePass, e2eUser } from './helpers'

/**
 * Chụp màn file 14 (Phòng) 1440×900, dữ liệu thật tenant dev. Không assert.
 * Chạy: E2E_PASSWORD=… SHOT_DIR=../docs/superpowers/handoff/web/screenshots SHOT_PAGES=a,b npx playwright test e2e/rooms-screenshots.spec.ts
 */
const dir = process.env.SHOT_DIR ?? '../docs/superpowers/handoff/web/screenshots'
const ids: Record<string, string> = JSON.parse(process.env.SHOT_IDS ?? '{}')
const only = (process.env.SHOT_PAGES ?? '').split(',').filter(Boolean)

const targets: { name: string; path: string; full?: boolean; act?: string }[] = [
  { name: '14-rooms', path: '/admin/rooms' },
  { name: '14-rooms-form', path: '/admin/rooms', act: 'add' },
  { name: '14-form-them-may', path: '/equipment/new', act: 'pick-dept' },
  { name: '14-thiet-bi', path: '/equipment' },
  { name: '14-thiet-bi-chi-tiet', path: `/equipment/${ids.equipment}` },
  { name: '14-dieu-chuyen', path: `/equipment/${ids.equipment}?tab=history`, act: 'transfer' },
  { name: '14-khoa-tab-phong', path: `/admin/departments/${ids.department}?tab=rooms` },
  { name: '14-bao-cao-theo-phong', path: '/reports?key=equipment.byRoom', act: 'run-report' },
]

test.use({ viewport: { width: 1440, height: 900 } })
test.skip(!process.env.E2E_PASSWORD, 'cần E2E_PASSWORD')

test.setTimeout(180_000)
test('chụp màn Phòng', async ({ page }) => {
  await page.goto('/login')
  const hc = page.getByLabel('Mã bệnh viện')
  await hc.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {})
  if (await hc.isVisible().catch(() => false)) await hc.fill(e2eCode)
  await page.getByLabel('Tài khoản').fill(e2eUser)
  await page.getByLabel('Mật khẩu').fill(e2ePass)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 })
  for (const target of targets) {
    if (only.length && !only.includes(target.name)) continue
    await page.goto(target.path)
    await page.waitForLoadState('networkidle', { timeout: 4_000 }).catch(() => {})
    await page.waitForTimeout(800)
    if (target.act === 'add') {
      await page.getByRole('button', { name: 'Thêm phòng' }).click()
      await page.waitForTimeout(500)
    }
    if (target.act === 'pick-dept') {
      await page.getByRole('combobox', { name: 'Khoa/Phòng ban' }).click()
      await page.getByRole('option').first().click()
      await page.getByRole('combobox', { name: 'Phòng', exact: true }).click()
      await page.waitForTimeout(800)
    }
    if (target.act === 'transfer') {
      await page.getByRole('button', { name: 'Điều chuyển' }).first().click()
      await page.getByRole('combobox', { name: 'Khoa đích' }).click()
      await page.getByRole('option').first().click()
      await page.waitForTimeout(300)
      await page.getByRole('combobox', { name: 'Phòng đích' }).click()
      await page.waitForTimeout(800)
    }
    if (target.act === 'run-report') {
      await page.getByRole('button', { name: 'Xem' }).first().click()
      await page.waitForTimeout(1500)
    }
    await page.screenshot({ path: `${dir}/${target.name}.png`, fullPage: target.full })
  }
})
