import { test, expect } from '@playwright/test'

const code = process.env.E2E_HOSPITAL_CODE ?? 'BVDEMO'
const user = process.env.E2E_USERNAME ?? 'admin'
const pass = process.env.E2E_PASSWORD ?? ''

test.skip(!pass, 'E2E_PASSWORD chưa đặt — xem README mục Smoke test')

test('login → dashboard → departments CRUD', async ({ page }) => {
  await page.goto('/login')
  const hc = page.getByLabel('Mã bệnh viện')
  if (await hc.isVisible().catch(() => false)) await hc.fill(code)
  await page.getByLabel('Tài khoản').fill(user)
  await page.getByLabel('Mật khẩu').fill(pass)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await expect(page.getByRole('heading', { name: 'Tổng quan' })).toBeVisible()

  await page.goto('/admin/departments')
  await expect(page.getByRole('heading', { name: 'Khoa/phòng' })).toBeVisible()

  const dept = `E2E${Date.now()}`
  await page.getByRole('button', { name: 'Thêm khoa/phòng' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Mã').fill(dept)
  await dialog.getByLabel('Tên').fill('Khoa E2E')
  await dialog.getByRole('button', { name: 'Lưu' }).click()
  await expect(dialog).toBeHidden()

  await page.getByLabel('Tìm kiếm').fill(dept)
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
