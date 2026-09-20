import { expect, test } from '@playwright/test'
import { login } from './helpers'

const screens = [
  ['/maintenance/calendar', 'Lịch'],
  ['/maintenance/plans', 'Kế hoạch bảo dưỡng'],
  ['/maintenance/tasks', 'Công việc bảo dưỡng'],
  ['/maintenance/templates', 'Checklist mẫu'],
  ['/calibrations', 'Kiểm định – hiệu chuẩn'],
] as const

test('lượt B mở đủ màn với API dev thật', async ({ page }) => {
  await login(page)
  for (const [path, heading] of screens) {
    await page.goto(path)
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible()
    await expect(page.getByText(/Không thể tải|Có lỗi xảy ra/i)).toHaveCount(0)
  }
})
