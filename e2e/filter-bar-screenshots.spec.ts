import { test, expect } from '@playwright/test'
import { login } from './helpers'

const targets = [
  { path: '/equipment', heading: 'Hồ sơ thiết bị', name: 'thiet-bi' },
  { path: '/faults', heading: 'Thư viện lỗi', name: 'thu-vien-loi' },
  { path: '/stock/receipts', heading: 'Phiếu nhập', name: 'phieu-nhap' },
]

test('chụp FilterBar ở 1280 và 1920 với API dev', async ({ page }) => {
  await login(page)
  for (const width of [1280, 1920]) {
    await page.setViewportSize({ width, height: 1080 })
    for (const target of targets) {
      await page.goto(target.path)
      await expect(page.getByRole('heading', { name: target.heading })).toBeVisible()
      await page.screenshot({
        path: `../docs/superpowers/handoff/web/screenshots/${target.name}-${width}.png`,
        fullPage: true,
      })
    }
  }
})
