import { test } from '@playwright/test'
import { e2eCode, e2ePass, e2eUser } from './helpers'

/**
 * Chụp màn hình rà thiết kế (file 12). Không assert — chỉ chụp.
 * Chạy: SHOT_DIR=<thư mục> SHOT_IDS='{"equipment":"..."}' SHOT_PAGES='a,b' npx playwright test e2e/ui-rollout-screenshots.spec.ts
 */
const dir = process.env.SHOT_DIR ?? '../docs/superpowers/handoff/web/screenshots'
const ids: Record<string, string> = JSON.parse(process.env.SHOT_IDS ?? '{}')
const only = (process.env.SHOT_PAGES ?? '').split(',').filter(Boolean)

const targets: { name: string; path: string; dark?: boolean; full?: boolean }[] = [
  { name: '12-tong-quan', path: '/' },
  { name: '12-thiet-bi', path: '/equipment' },
  { name: '12-thiet-bi-chi-tiet', path: `/equipment/${ids.equipment}` },
  { name: '12-sua-chua-chi-tiet', path: `/repairs/${ids.repairs}` },
  { name: '12-form-them-may', path: '/equipment/new' },
  { name: '12-cau-hinh', path: '/admin/settings' },
  { name: '12-tro-ly-ai', path: '/assistant' },
  { name: '12-tong-quan-dark', path: '/', dark: true },
  // kiểm tra nội bộ
  { name: 'chk-request', path: `/requests/${ids.requests}` },
  { name: 'chk-fault', path: `/faults/${ids.faults}` },
  { name: 'chk-supply', path: `/supplies/${ids.supplies}` },
  { name: 'chk-receipt', path: `/stock/receipts/${ids['stock/receipts']}` },
  { name: 'chk-issue', path: `/stock/issues/${ids['stock/issues']}` },
  { name: 'chk-stocktake', path: `/stocktakes/${ids.stocktakes}` },
  { name: 'chk-task', path: `/maintenance/tasks/${ids['maintenance/tasks']}` },
  { name: 'chk-plan', path: `/maintenance/plans/${ids['maintenance/plans']}` },
  { name: 'chk-calibration', path: `/calibrations/${ids.calibrations}` },
  { name: 'chk-user', path: `/admin/users/${ids.users}` },
  { name: 'chk-department', path: `/admin/departments/${ids.departments}` },
  { name: 'chk-my-tasks', path: '/my-tasks' },
  { name: 'chk-repair-stats', path: '/repairs/stats' },
  { name: 'chk-reports', path: '/reports' },
  { name: 'chk-stock', path: '/stock' },
  { name: 'chk-notifications', path: '/notifications' },
  { name: 'chk-form-repair', path: '/repairs/new' },
  { name: 'chk-form-request', path: '/requests/new' },
  { name: 'chk-form-receipt', path: '/stock/receipts/new' },
  { name: 'chk-thiet-bi-dark', path: '/equipment', dark: true },
  { name: 'chk-chi-tiet-dark', path: `/equipment/${ids.equipment}`, dark: true },
]

test('chụp màn hình 1440', async ({ page }) => {
  test.setTimeout(300_000)
  await page.goto('/login')
  const hc = page.getByLabel('Mã bệnh viện')
  await hc.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {})
  if (await hc.isVisible().catch(() => false)) await hc.fill(e2eCode)
  await page.getByLabel('Tài khoản').fill(e2eUser)
  await page.getByLabel('Mật khẩu').fill(e2ePass)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 })
  await page.setViewportSize({ width: 1440, height: 900 })
  for (const target of targets) {
    if (only.length && !only.includes(target.name)) continue
    if (target.path.includes('undefined')) continue
    await page.goto(target.path)
    await page.evaluate((dark) => {
      document.documentElement.classList.toggle('dark', !!dark)
    }, target.dark ?? false)
    await page.waitForTimeout(1500)
    await page.evaluate(() => document.fonts?.ready)
    await page.screenshot({ path: `${dir}/${target.name}.png`, fullPage: !!target.full })
  }
})
