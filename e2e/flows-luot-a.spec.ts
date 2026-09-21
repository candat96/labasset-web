import { test, expect } from '@playwright/test'
import { e2ePass, login, pickOption } from './helpers'

test.skip(!e2ePass, 'E2E_PASSWORD chưa đặt — xem README mục Smoke test')

const SUBMIT = /^(Lưu|Tạo|Xác nhận|Đồng ý|Thêm)$/

test('02 thiết bị: tạo máy → đổi trạng thái → thêm linh kiện → điều chuyển → duyệt', async ({
  page,
}) => {
  await login(page)
  const name = `Máy E2E ${Date.now()}`

  // Tạo máy (để trống mã → tự sinh)
  await page.goto('/equipment/new')
  await page.getByLabel('Tên', { exact: true }).fill(name)
  await pickOption(page, 'Khoa/Phòng ban')
  await page.getByRole('button', { name: 'Lưu' }).click()
  await page.waitForURL(/\/equipment\/[0-9a-f-]{36}/, { timeout: 15_000 })
  await expect(page.getByRole('heading', { name })).toBeVisible()
  await expect(page.getByText(/^TB-\d{4}-\d+$/).first()).toBeVisible()

  // Đổi trạng thái
  await page.getByRole('button', { name: 'Đổi trạng thái' }).click()
  const statusDialog = page.getByRole('dialog', { name: 'Đổi trạng thái' })
  await pickOption(page, 'Trạng thái mới')
  await statusDialog.getByLabel('Lý do').fill('E2E kiểm tra luồng')
  await statusDialog.getByRole('button', { name: SUBMIT }).click()
  await expect(statusDialog).toBeHidden()
  await expect(page.getByText('Đã đổi trạng thái').first()).toBeVisible()

  // Thêm linh kiện
  await page.getByRole('tab', { name: 'Linh kiện' }).click()
  await page.getByRole('button', { name: 'Thêm linh kiện' }).click()
  const compDialog = page.getByRole('dialog', { name: 'Linh kiện' })
  await compDialog.getByLabel('Tên', { exact: true }).fill('Bơm E2E')
  await compDialog.getByRole('button', { name: SUBMIT }).click()
  await expect(compDialog).toBeHidden()
  await expect(page.getByText('Bơm E2E')).toBeVisible()

  // Điều chuyển (chọn khoa đích khác khoa hiện tại)
  await page.getByRole('tab', { name: 'Điều chuyển' }).click()
  await page.getByRole('button', { name: 'Tạo điều chuyển' }).click()
  const transferDialog = page.getByRole('dialog', { name: 'Điều chuyển' })
  await pickOption(page, 'Khoa đích', undefined, { last: true })
  await transferDialog.getByLabel('Lý do').fill('E2E điều chuyển')
  await transferDialog.getByRole('button', { name: SUBMIT }).click()
  await expect(transferDialog).toBeHidden()
  await expect(page.getByText('Đã tạo điều chuyển').first()).toBeVisible()

  // ADM duyệt ngay trên trang chi tiết (tab Điều chuyển hiển thị dạng thẻ)
  await expect(page.getByText('E2E điều chuyển').first()).toBeVisible()
  await page.getByRole('button', { name: 'Duyệt' }).first().click()
  await expect(page.getByText('Đã duyệt').first()).toBeVisible()
})

test('03 sửa chữa: báo hỏng (gợi ý lỗi) → tiếp nhận → chẩn đoán → hoàn thành + đề xuất lỗi → nghiệm thu', async ({
  page,
}) => {
  await login(page)

  // Báo hỏng
  await page.goto('/repairs/new')
  await pickOption(page, 'Máy')
  await page.getByLabel('Mô tả').fill('E2E: máy báo lỗi nguồn')
  await page.getByRole('button', { name: 'Tạo phiếu' }).click()
  await page.waitForURL(/\/repairs\/[0-9a-f-]{36}/, { timeout: 15_000 })
  await expect(page.getByText(/^SC-\d/).first()).toBeVisible()

  // Tiếp nhận
  await page.getByRole('button', { name: 'Tiếp nhận' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Xác nhận' }).click()
  await expect(page.getByText('Đã tiếp nhận').first()).toBeVisible()

  // Phân công cho chính admin (nút Hoàn thành chỉ hiện với người được phân công)
  await page.getByRole('button', { name: 'Phân công' }).click()
  const assignDialog = page.getByRole('dialog', { name: 'Phân công' })
  await pickOption(page, 'Người xử lý chính', /Quản trị viên/)
  await assignDialog.getByRole('button', { name: SUBMIT }).click()
  await expect(assignDialog).toBeHidden()

  // Chuyển sang Đang xử lý (accepted → in_progress theo repair-rules)
  await page.getByRole('button', { name: 'Đổi trạng thái' }).click()
  const repairStatusDialog = page.getByRole('dialog', { name: 'Đổi trạng thái' })
  await pickOption(page, 'Trạng thái', 'Đang xử lý')
  await repairStatusDialog.getByLabel('Ghi chú').fill('E2E bắt đầu xử lý')
  await repairStatusDialog.getByRole('button', { name: SUBMIT }).click()
  await expect(repairStatusDialog).toBeHidden()

  // Chẩn đoán
  await page.getByRole('button', { name: 'Chẩn đoán' }).click()
  const diagDialog = page.getByRole('dialog', { name: 'Chẩn đoán' })
  await diagDialog.getByLabel('Chẩn đoán').fill('E2E chẩn đoán: lỗi nguồn')
  await diagDialog.getByRole('button', { name: SUBMIT }).click()
  await expect(diagDialog).toBeHidden()

  // Hoàn thành + đề xuất vào thư viện lỗi
  await page.getByRole('button', { name: 'Hoàn thành' }).click()
  const doneDialog = page.getByRole('dialog', { name: 'Hoàn thành' })
  await doneDialog.getByLabel('Tóm tắt xử lý').fill('E2E đã xử lý xong')
  await doneDialog.getByRole('switch', { name: 'Đề xuất vào thư viện lỗi' }).click()
  await doneDialog.getByLabel('Tiêu đề lỗi').fill(`E2E lỗi ${Date.now()}`)
  await doneDialog.getByRole('button', { name: 'Thêm bước' }).click()
  await doneDialog.getByLabel('Hướng dẫn').fill('E2E: kiểm tra nguồn')
  // Dialog dài, nút Lưu bị cuộn khỏi vùng nhìn → submit bằng Enter trong form.
  await doneDialog.getByLabel('Hướng dẫn').press('Enter')
  await expect(doneDialog).toBeHidden()
  await expect(page.getByText('Đã hoàn thành phiếu').first()).toBeVisible()

  // Nghiệm thu (đạt + 5 sao)
  await page.getByRole('button', { name: 'Nghiệm thu' }).click()
  const acceptanceDialog = page.getByRole('dialog', { name: 'Nghiệm thu' })
  await acceptanceDialog.getByRole('radio', { name: 'Đạt', exact: true }).click()
  await acceptanceDialog.getByRole('radio', { name: 'Xếp hạng 5/5' }).click()
  await acceptanceDialog.getByRole('button', { name: SUBMIT }).click()
  await expect(acceptanceDialog).toBeHidden()
  await expect(page.getByText('Đã nghiệm thu').first()).toBeVisible()

  // Đề xuất lỗi xuất hiện cho ADM
  await page.goto('/faults/suggestions')
  await expect(page.getByRole('heading', { name: 'Đề xuất thư viện lỗi' })).toBeVisible()
  await expect(
    page
      .getByRole('row')
      .filter({ hasText: /E2E lỗi/ })
      .first(),
  ).toBeVisible()
})
