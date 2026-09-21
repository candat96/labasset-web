import { test, expect } from '@playwright/test'
import { login } from './helpers'

const targets = [
  { path: '/equipment', heading: 'Hồ sơ thiết bị', name: 'thiet-bi' },
  { path: '/faults', heading: 'Thư viện lỗi', name: 'thu-vien-loi' },
  { path: '/admin/audit-logs', heading: 'Nhật ký hệ thống', name: 'nhat-ky-he-thong' },
]

test('chụp FilterBar 1280px (thiết bị, thư viện lỗi, nhật ký hệ thống)', async ({ page }) => {
  await login(page)
  await page.setViewportSize({ width: 1280, height: 1080 })
  for (const target of targets) {
    await page.goto(target.path)
    await expect(page.getByRole('heading', { name: target.heading })).toBeVisible()
    await page.screenshot({
      path: `../docs/superpowers/handoff/web/screenshots/${target.name}-1280.png`,
      fullPage: true,
    })
  }
})
