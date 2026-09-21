import { expect, test, type Page } from '@playwright/test'
import { e2eCode, e2ePass, e2eUser, login } from './helpers'

/** File 15: luồng Dự trù trên API thật (BVDEMO) — tạo kỳ → … → huỷ kỳ. */
test.skip(!e2ePass, 'E2E_PASSWORD chưa đặt — xem README mục Smoke test')
test.use({ viewport: { width: 1440, height: 900 } })

const DEPT_PASSWORD = 'Abc@1234'

/** Gọi API bằng session admin đã đăng nhập trong localStorage (mẫu round-d-flow). */
async function sessionApi(page: Page) {
  const raw = await page.evaluate(() => localStorage.getItem('labasset.auth'))
  const auth = JSON.parse(raw ?? '{}') as {
    state?: { accessToken?: string; tenantId?: string }
  }
  const headers = {
    Authorization: `Bearer ${auth.state?.accessToken ?? ''}`,
    'X-Tenant-Id': auth.state?.tenantId ?? '',
  }
  const call = async <T>(method: string, path: string, data?: unknown): Promise<T> => {
    const response = await page.request.fetch(path, { method, headers, data })
    expect(response.ok(), `${method} ${path}: ${await response.text()}`).toBeTruthy()
    return response.json() as Promise<T>
  }
  return { call }
}

/** Đăng nhập tài khoản khác: xoá session cũ rồi đi qua màn login. */
async function loginAs(page: Page, username: string, password: string) {
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login')
  const hc = page.getByLabel('Mã bệnh viện')
  await hc.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {})
  if (await hc.isVisible().catch(() => false)) await hc.fill(e2eCode)
  await page.getByLabel('Tài khoản').fill(username)
  await page.getByLabel('Mật khẩu').fill(password)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 })
}

test('15 Dự trù: tạo kỳ → mở nhận → lập phiếu 12 tháng → gửi → duyệt → tiếp nhận → tổng hợp → sửa SL duyệt → xuất Excel → huỷ kỳ', async ({
  page,
}) => {
  test.setTimeout(300_000)
  await login(page)
  const admin = await sessionApi(page)
  const stamp = Date.now().toString().slice(-6)
  // chọn năm chưa có kỳ (môi trường không xoá được kỳ — cả kỳ đã huỷ vẫn chiếm năm)
  const existing = await admin.call<{ items: Array<{ year: number }> }>(
    'GET',
    '/v1/demand/periods?limit=100',
  )
  const usedYears = new Set(existing.items.map((p) => p.year))
  let year = 2050
  while (usedYears.has(year)) year += 1

  // ==== Chuẩn bị: user khoa (DEPT_USER) của Khoa Xét nghiệm, đổi mật khẩu lần đầu qua API ====
  const departmentList = await admin.call<
    Array<{ id: string; name: string }> | { items: Array<{ id: string; name: string }> }
  >('GET', '/v1/departments?all=true')
  const departments = Array.isArray(departmentList) ? departmentList : departmentList.items
  const department = departments.find((d) => /Xét nghiệm/.test(d.name)) ?? departments[0]!
  const deptUser = `e2edu${stamp}`
  const created = await admin.call<{ user: { username: string }; tempPassword: string }>(
    'POST',
    '/v1/users',
    {
      username: deptUser,
      fullName: `E2E Dự trù ${stamp}`,
      roles: ['DEPT_USER'],
      departmentId: department.id,
    },
  )
  const first = await page.request.post('/v1/auth/login', {
    data: { username: deptUser, password: created.tempPassword, hospitalCode: e2eCode },
  })
  const firstSession = (await first.json()) as { accessToken: string; tenantId: string }
  const changed = await page.request.post('/v1/auth/change-password', {
    headers: {
      Authorization: `Bearer ${firstSession.accessToken}`,
      'X-Tenant-Id': firstSession.tenantId,
    },
    data: { current: created.tempPassword, next: DEPT_PASSWORD },
  })
  expect(changed.ok(), 'đổi mật khẩu lần đầu').toBeTruthy()

  // ==== ADM: menu Mua sắm → Dự trù → Tạo kỳ qua dialog ====
  await page.getByRole('link', { name: 'Dự trù' }).click()
  await expect(page.getByRole('heading', { name: 'Dự trù', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Tạo kỳ' }).click()
  const createDialog = page.getByRole('dialog')
  await createDialog.getByLabel('Tên kỳ').fill(`E2E Dự trù ${stamp}`)
  await createDialog.getByLabel('Năm (yyyy)').fill(String(year))
  await createDialog.getByRole('button', { name: 'Lưu' }).click()
  await page.waitForURL(/\/procurement\/demand\/periods\/[0-9a-f-]{36}/)
  const periodUrl = page.url()
  await expect(page.getByText('Nháp').first()).toBeVisible()

  // ==== ADM: Mở nhận kỳ (confirm) ====
  await page.getByRole('button', { name: 'Mở nhận' }).click()
  await page.getByRole('button', { name: 'Xác nhận' }).click()
  await expect(page.getByText('Đang nhận').first()).toBeVisible()

  // ==== Khoa: đăng nhập → Dự trù → mở phiếu → thêm dòng vật tư (SL 12 tháng) ====
  await loginAs(page, deptUser, DEPT_PASSWORD)
  await page.getByRole('link', { name: 'Dự trù' }).click()
  // card phiếu của khoa mình: SectionCard (bg-card) có tiêu đề = tên kỳ + nút "Mở"
  const ourCard = page
    .locator('.bg-card.shadow-card')
    .filter({ has: page.getByRole('heading', { name: `E2E Dự trù ${stamp}` }) })
    .first()
  await expect(ourCard).toBeVisible()
  await ourCard.getByRole('link', { name: 'Mở' }).click()
  await page.waitForURL(/\/procurement\/demand\/requests\/[0-9a-f-]{36}/)

  await page.getByRole('button', { name: 'Thêm dòng' }).click()
  // dòng nháp cục bộ (chưa gọi API) — phải chọn vật tư / nhập tên mới lưu được
  await expect(page.getByText('Chọn vật tư / nhập tên để lưu').first()).toBeVisible()

  // chọn vật tư → POST dòng + tự gợi ý số lượng + đơn giá
  await page.getByRole('combobox', { name: 'Tên hàng / vật tư' }).last().click()
  await page.getByPlaceholder('Tìm theo mã hoặc tên').fill('Băng keo')
  await page
    .getByRole('option', { name: /Băng keo/ })
    .first()
    .click()
  await expect(page.getByText('Đã thêm dòng').first()).toBeVisible()

  // chia đều tổng 12 vào 12 tháng (window.prompt)
  page.once('dialog', (d) => d.accept('12'))
  await page.getByRole('button', { name: 'Chia đều' }).click()
  await expect(page.getByText('Σ 12', { exact: true })).toBeVisible()

  // gửi phiếu (khoa chỉ DEPT_USER → kỳ vọng "Đã gửi")
  await page.getByRole('button', { name: 'Gửi', exact: true }).click()
  await page.getByRole('button', { name: 'Xác nhận' }).click()
  await expect(page.getByText('Đã gửi').first()).toBeVisible()

  // ==== ADM: vào kỳ → Tiếp nhận phiếu (dept-approve đã qua) ====
  await loginAs(page, e2eUser, e2ePass)
  await page.goto('/procurement/demand')
  const periodRow = page.getByRole('row', { name: new RegExp(`E2E Dự trù ${stamp}`) })
  await expect(periodRow).toBeVisible()
  await periodRow.click()
  await page.waitForURL(/\/procurement\/demand\/periods\/[0-9a-f-]{36}/)

  const deptRow = page.getByRole('row', { name: new RegExp(department.name) })
  await expect(deptRow.getByText('Đã gửi')).toBeVisible()

  // PTVT duyệt thay trưởng khoa: mở phiếu → "Duyệt (trưởng khoa)"
  await deptRow.getByRole('button', { name: 'Xem' }).click()
  await page.waitForURL(/\/procurement\/demand\/requests\/[0-9a-f-]{36}/)
  await page.getByRole('button', { name: 'Duyệt (trưởng khoa)' }).click()
  await page.getByRole('button', { name: 'Xác nhận' }).click()
  await expect(page.getByText('Trưởng khoa đã duyệt').first()).toBeVisible()
  // VT/ADM thấy cột SL duyệt trên dòng
  await expect(page.getByText('Băng keo y tế').first()).toBeVisible()
  await expect(page.getByRole('textbox', { name: /SL duyệt/ }).first()).toBeVisible()

  // về kỳ → Tiếp nhận phiếu
  await page.goto(periodUrl)
  const deptRow2 = page.getByRole('row', { name: new RegExp(department.name) })
  await expect(deptRow2.getByText('Trưởng khoa đã duyệt')).toBeVisible()
  await deptRow2.getByRole('button', { name: 'Tiếp nhận' }).click()
  await page.getByRole('button', { name: 'Xác nhận' }).click()
  await expect(deptRow2.getByText('Đã tiếp nhận')).toBeVisible()

  // ==== ADM: Tổng hợp (bỏ qua khoa chưa nộp) → tab Tổng hợp ====
  await page.goto(periodUrl)
  await page.getByRole('button', { name: 'Tổng hợp', exact: true }).click()
  const consolidateDialog = page.getByRole('dialog')
  await consolidateDialog.getByRole('button', { name: 'Tổng hợp', exact: true }).click()
  // 409 DEMAND_UNSUBMITTED_DEPARTMENTS → dialog bỏ qua khoa chưa nộp
  await page.getByRole('button', { name: 'Bỏ qua khoa chưa nộp' }).click()
  await expect(page.getByText('Đang tổng hợp').first()).toBeVisible({ timeout: 30_000 })

  await page.getByRole('tab', { name: 'Tổng hợp' }).click()
  await expect(page.getByText('Băng keo y tế').first()).toBeVisible()

  // mở rộng dòng → breakdown theo khoa
  await page.getByRole('button', { name: 'Mở rộng' }).first().click()
  await expect(page.getByText(department.name).first()).toBeVisible()

  // sửa tổng SL duyệt 12 → 9 (phân bổ tỷ lệ theo khoa)
  const totalCell = page.getByRole('textbox', { name: 'Băng keo y tế — SL duyệt' })
  await totalCell.fill('9')
  await totalCell.press('Enter')
  await expect(page.getByText('Đã lưu').first()).toBeVisible()
  await expect(totalCell).toHaveValue(/^9(\.0+)?$/, { timeout: 10_000 })

  // xuất Excel + Tờ trình PDF tải được
  const excel = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Xuất Excel' }).first().click()
  expect((await excel).suggestedFilename()).toMatch(/\.xlsx$/)
  const pdf = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Tờ trình PDF' }).first().click()
  expect((await pdf).suggestedFilename()).toMatch(/\.pdf$/)

  // ==== Việc của tôi: nhóm Dự trù ====
  await page.goto('/my-tasks')
  await expect(page.getByRole('heading', { name: 'Dự trù', exact: true })).toBeVisible()
  await expect(page.getByText('Dự trù cần tiếp nhận')).toBeVisible()

  // ==== Dọn dữ liệu: huỷ kỳ cuối test (có lý do) ====
  await page.goto(periodUrl)
  await page.getByRole('button', { name: 'Huỷ', exact: true }).click()
  await page.getByLabel('Lý do (bắt buộc)').fill('E2E huỷ kỳ test')
  await page.getByRole('button', { name: 'Xác nhận' }).click()
  await expect(page.getByText('Đã huỷ').first()).toBeVisible()
})
