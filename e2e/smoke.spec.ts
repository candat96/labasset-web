import { test, expect } from '@playwright/test'
import { e2ePass, login } from './helpers'

test.skip(!e2ePass, 'E2E_PASSWORD chưa đặt — xem README mục Smoke test')

test('login → dashboard → departments CRUD', async ({ page }) => {
  await login(page)

  await page.goto('/admin/departments')
  await expect(page.getByRole('heading', { name: 'Khoa/Phòng ban' })).toBeVisible()

  const dept = `E2E${Date.now()}`
  await page.getByRole('button', { name: 'Thêm khoa/phòng' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Mã').fill(dept)
  await dialog.getByLabel('Tên').fill('Khoa E2E')
  await dialog.getByRole('button', { name: 'Lưu' }).click()
  await expect(dialog).toBeHidden()

  await page.getByRole('textbox', { name: 'Tìm kiếm' }).fill(dept)
  const row = page.getByRole('row', { name: new RegExp(dept) })
  await expect(row).toBeVisible()

  await row.getByRole('button', { name: 'Thao tác' }).click()
  await page.getByRole('menuitem', { name: 'Sửa' }).click()
  await dialog.getByLabel('Tên').fill('Khoa E2E đã sửa')
  await dialog.getByRole('button', { name: 'Lưu' }).click()
  await expect(dialog).toBeHidden()
  await expect(row).toContainText('Khoa E2E đã sửa')

  await row.getByRole('button', { name: 'Thao tác' }).click()
  await page.getByRole('menuitem', { name: 'Xoá' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Xoá' }).click()
  await expect(page.getByRole('alertdialog')).toBeHidden()
  await expect(row).toBeHidden()
})

test('faults and repairs lists are reachable', async ({ page }) => {
  await login(page)
  await page.goto('/faults')
  await expect(page.getByRole('heading', { name: 'Thư viện lỗi' })).toBeVisible()
  await page.goto('/repairs')
  await expect(page.getByRole('heading', { name: 'Phiếu sửa chữa' })).toBeVisible()
})

test('remaining modules are reachable', async ({ page }) => {
  await login(page)
  await page.goto('/maintenance/tasks')
  await expect(page.getByRole('heading', { name: 'Công việc bảo dưỡng' })).toBeVisible()
  await page.goto('/supplies')
  await expect(page.getByRole('heading', { name: 'Danh mục vật tư' })).toBeVisible()
  await page.goto('/requests')
  await expect(page.getByRole('heading', { name: 'Phiếu yêu cầu' })).toBeVisible()
  await page.goto('/stocktakes')
  await expect(page.getByRole('heading', { name: 'Kiểm kê' })).toBeVisible()
})

test('equipment list is reachable', async ({ page }) => {
  await login(page)
  await page.goto('/equipment')
  await expect(page.getByRole('heading', { name: 'Hồ sơ thiết bị' })).toBeVisible()
})
