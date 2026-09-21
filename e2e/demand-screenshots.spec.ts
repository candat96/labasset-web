import { expect, test } from '@playwright/test'
import { e2eCode, e2ePass, e2eUser } from './helpers'

/**
 * Chụp màn file 15 (Dự trù) 1440×900 với dữ liệu thật tenant dev.
 * Chạy: E2E_PASSWORD=… npx playwright test e2e/demand-screenshots.spec.ts
 */
const dir = process.env.SHOT_DIR ?? '../docs/superpowers/handoff/web/screenshots'
const only = (process.env.SHOT_PAGES ?? '').split(',').filter(Boolean)
const ids: Record<string, string> = JSON.parse(process.env.SHOT_IDS ?? '{}')

// Mặc định: kỳ DT-2027 đang tổng hợp + phiếu Khoa Xét nghiệm của kỳ đó
const PERIOD_ID = ids.period ?? '83b9195c-75fd-4c44-bc36-84eaa4d9d816'
const REQUEST_ID = ids.request ?? '4b41e325-7f14-44da-a774-fdd919e064d4'

const targets: { name: string; path: string; act?: string }[] = [
  // lọc theo kỳ năm 2027 đang tổng hợp — card kỳ DT-2027
  { name: '15-1', path: '/procurement/demand?year=2027&status=consolidating' },
  {
    name: '15-2',
    path: `/procurement/demand/periods/${PERIOD_ID}?tab=consolidation`,
    act: 'consolidation',
  },
  { name: '15-3', path: `/procurement/demand/requests/${REQUEST_ID}` },
  { name: '15-4', path: '/my-tasks', act: 'myTasks' },
  { name: '15-5', path: '/help', act: 'help' },
]

test.use({ viewport: { width: 1440, height: 900 } })
test.skip(!process.env.E2E_PASSWORD, 'cần E2E_PASSWORD')

test('chụp màn Dự trù', async ({ page }) => {
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
    await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {})
    await page.waitForTimeout(1_200)
    if (target.act === 'myTasks') {
      // nhóm "Dự trù" nằm cuối trang — cuộn tới rồi chụp khung nhìn
      await page.getByRole('heading', { name: 'Dự trù', exact: true }).scrollIntoViewIfNeeded()
      await page.waitForTimeout(500)
    }
    if (target.act === 'consolidation') {
      // mở rộng dòng tổng hợp đầu tiên để thấy breakdown theo khoa
      await page
        .getByRole('button', { name: 'Mở rộng' })
        .first()
        .click()
        .catch(() => {})
      await page.waitForTimeout(600)
    }
    if (target.act === 'help') {
      // cuộn tới mục 15 "Dự trù"
      const section = page.locator('#du-tru')
      await expect(section).toBeVisible()
      await section.scrollIntoViewIfNeeded()
      await page.waitForTimeout(400)
      await section.screenshot({ path: `${dir}/${target.name}.png` })
      continue
    }
    await page.screenshot({ path: `${dir}/${target.name}.png`, fullPage: target.act === 'help' })
  }
})
