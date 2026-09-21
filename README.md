# LabAsset Web

Web quản trị của hệ thống LabAsset (quản lý máy xét nghiệm và vật tư/hoá chất cho bệnh viện,
multi-tenant). Dự án con số 4 theo `docs/superpowers/specs/2026-09-17-kien-truc-tong-the-design.md`.
Hợp đồng duy nhất với backend là **OpenAPI** của `labasset-api`.

Tài liệu thiết kế: `docs/superpowers/specs/2026-09-19-web-base-design.md`,
design system: `docs/superpowers/specs/2026-09-19-design-system.md`.

## Stack

React 19 · Vite 7 · TypeScript strict · Tailwind CSS v4 · shadcn/ui (new-york) · lucide-react ·
Inter (tự host, có tiếng Việt) · react-router 7 · TanStack Query 5 · TanStack Table 8 · Zustand ·
react-hook-form + zod 4 · i18next · sonner · openapi-typescript + openapi-fetch ·
ESLint + Prettier · Vitest + Testing Library + msw · Playwright.

## Yêu cầu

- Node.js 22, npm
- `labasset-api` chạy dev tại `http://localhost:3969` (xem README của API: `docker compose up -d postgres`,
  `npm run migrate:master`, `npm run provision:tenant -- BVDEMO "Bệnh viện Demo"`, `npm run start:dev`)

## Chạy dev

```bash
npm ci
cp .env.example .env        # để trống VITE_API_URL → đi qua proxy Vite (API chưa bật CORS)
npm run dev                  # http://localhost:2905
```

Vite proxy các path `/v1`, `/sys`, `/health`, `/openapi.json` tới `VITE_DEV_PROXY_TARGET`
(mặc định `http://localhost:3969`).

| Biến                    | Ý nghĩa                                                                  |
| ----------------------- | ------------------------------------------------------------------------ |
| `VITE_API_URL`          | URL API khi khác origin (production thường để trống và dùng nginx proxy) |
| `VITE_TENANT_MODE`      | `multi` \| `single`; để trống thì đọc `GET /health` → `mode`             |
| `VITE_SHOW_SYS`         | `true` để hiện nhóm menu Hệ thống (SYS) — luồng đăng nhập SYS chưa có    |
| `VITE_DEV_PROXY_TARGET` | Đích proxy khi chạy `npm run dev`                                        |

Tài khoản: `admin` của tenant `BVDEMO` (mật khẩu in ra console lúc `provision:tenant`).
Lần đầu đăng nhập `mustChangePassword=true` → web bắt buộc vào `/change-password`.

## Scripts

| Lệnh                                | Việc                                                                                                                                      |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev` / `build` / `preview` | Vite                                                                                                                                      |
| `npm run lint`                      | ESLint + Prettier check (`npm run format` để sửa)                                                                                         |
| `npm run typecheck`                 | `tsc -b --noEmit`                                                                                                                         |
| `npm test` / `test:watch`           | Vitest (jsdom, msw)                                                                                                                       |
| `npm run api:gen [url\|file]`       | Sinh `src/api/schema.d.ts` từ OpenAPI. Mặc định `http://localhost:3969/openapi.json`; hoặc `npm run api:gen ../labasset-api/openapi.json` |
| `npm run e2e`                       | Playwright smoke trên API thật (xem dưới)                                                                                                 |

`src/api/schema.d.ts` được commit để CI không cần API. Sau khi API đổi, chạy lại `api:gen` và commit.

## Cấu trúc

```
src/
  app/          router.tsx (createBrowserRouter, lazy), providers.tsx, theme.tsx
                layout/ (AppShell, AppSidebar, Topbar, Breadcrumbs, UserMenu, NotificationBell, GlobalSearch)
                guards/ (RequireAuth, RequirePasswordChanged, RequireRole, useCan)
                pages/  (PlaceholderPage, ForbiddenPage, NotFoundPage)
  routes/       menu.ts — NGUỒN DUY NHẤT cho sidebar, breadcrumb, placeholder và quyền; roles.ts
  api/          schema.d.ts (sinh), client.ts (openapi-fetch + Bearer/X-Tenant-Id/refresh xoay vòng),
                errors.ts (ApiError, messageFor, applyServerErrors), download.ts, tenant-mode.ts, paths.ts
  stores/       auth.store.ts (zustand persist), ui.store.ts
  lib/          i18n/ (vi/*.json, zod.ts), format/ (date, money, number), utils.ts
  components/   ui/ (shadcn), data-table/ (DataTable, useServerTable), form/ (FormDialog, fields), page/
  features/     auth/ departments/ notifications/ dashboard/ users/
                mỗi feature: types.ts · api.ts · hooks.ts · schema.ts · pages/ · components/
  test/         setup.ts, utils.tsx (renderWithProviders), msw/
```

Không import chéo giữa `features/*`; phần dùng chung đặt ở `components/` hoặc `lib/`.

## Xác thực & tenant

- `POST /v1/auth/login` (`hospitalCode` chỉ khi multi) → `LoginResultDto` hoặc `OtpChallengeDto`
  (→ bước OTP). Access + refresh token, `tenantId`, `user` lưu trong `localStorage` (`labasset.auth`)
  qua zustand persist để giữ đăng nhập qua reload. **Chấp nhận rủi ro XSS** vì phần mềm nội bộ;
  nếu cần siết, chuyển refresh token sang cookie httpOnly phía API.
- `api/client.ts` gắn `Authorization: Bearer` + `X-Tenant-Id` cho mọi path không public. Khi 401:
  refresh **single-flight** (nhiều request đồng thời chỉ refresh một lần), lưu cặp token mới (xoay
  vòng), gửi lại request gốc một lần. Refresh thất bại (token gia đình bị thu hồi) → `logout('expired')`
  → về `/login?reason=expired`.
- `TENANT_SUSPENDED` / `TENANT_MISMATCH` → logout. `mustChangePassword` → guard ép `/change-password`.
- Lỗi API `{ code, message, details? }` → `ApiError`; `messageFor()` dịch theo `errors:<CODE>`;
  `applyServerErrors(form, e)` gắn `VALIDATION_ERROR.details` (mảng chuỗi class-validator) theo field.

## Quy ước thêm module mới

1. **Route + menu:** thêm mục vào `src/routes/menu.ts` (path, `labelKey`, icon, `roles`) và khoá
   `menu:items.*` trong `src/lib/i18n/vi/menu.json`. Mục chưa có trang tự thành `PlaceholderPage`.
2. **Feature folder:** `src/features/<module>/` gồm `types.ts` (nếu OpenAPI thiếu schema, ghi
   `// TODO(api)`), `api.ts` (gọi `api` + `unwrap`/`unwrapAs`, `pageQuery()` cho page/limit),
   `hooks.ts` (query keys `['<module>', ...]`, mutation invalidate), `schema.ts` (zod, thông điệp vi).
3. **Trang danh sách:** `PageHeader` + `useServerTable({ filterKeys })` + `DataTable` (skeleton/rỗng/lỗi,
   ẩn cột, phân trang, xuất qua `downloadFile`). Sort chỉ bật khi API hỗ trợ (`onSortChange`).
4. **Form:** `FormDialog` + `TextField/SelectField/SwitchField/NumberField`; `onError` gọi
   `applyServerErrors(form, e) || toast.error(messageFor(e))`. Sửa thì gửi diff.
5. **Quyền:** route thật lấy roles từ `menu.ts` (bọc `RequireRole` tự động trong `router.tsx`);
   ẩn nút ghi bằng `useCan(ADM)` v.v.
6. **Đăng ký trang:** thêm `lazy: () => import('@/features/<module>/pages/<Page>')` vào mảng
   `implemented` trong `src/app/router.tsx` (export `Component`).
7. **i18n:** tạo `src/lib/i18n/vi/<module>.json`, đăng ký trong `src/lib/i18n/index.ts`.
8. **Test:** unit cho schema/hook/page với msw (`renderWithProviders`); thêm bước vào `e2e/smoke.spec.ts`
   nếu là luồng chính.

Màn mẫu chuẩn để copy: `src/features/departments/`.

## Test

```bash
npm test                      # unit: client (refresh/tenant/lỗi), format, guards, DataTable, auth, departments
npm run e2e                   # smoke Playwright trên API dev thật
```

Smoke cần API dev đang chạy và tài khoản admin BVDEMO đã đổi mật khẩu lần đầu:

```bash
cp e2e/.env.example e2e/.env   # điền E2E_PASSWORD
E2E_PASSWORD=... npm run e2e   # hoặc export biến từ e2e/.env
```

Không đặt `E2E_PASSWORD` thì test tự skip. CI chỉ chạy lint/typecheck/unit/build.

## Triển khai on-prem

```bash
docker build -t labasset-web .
docker run -p 8080:80 -e API_UPSTREAM=http://api:3969 labasset-web
# hoặc ghép với compose của API:
docker compose -p labasset-onprem \
  -f ../labasset-api/docker-compose.onprem.yml -f docker-compose.web.yml up -d --build
```

nginx phục vụ tĩnh (SPA fallback) và proxy `/v1 /sys /health /openapi.json` → `API_UPSTREAM`
(`proxy_buffering off` cho SSE thông báo). Build args `VITE_TENANT_MODE=single` khi on-prem.

## Thông báo trong web

`GET /v1/notifications` (badge = `unreadCount`), đánh dấu đọc từng cái / tất cả. Realtime qua
`GET /v1/notifications/stream` (SSE) bằng fetch streaming vì cần header xác thực; 401 → refresh và
nối lại; lỗi 3 lần liên tiếp → chuyển sang polling 60 s.

## API còn thiếu / cần backend bổ sung

1. **CORS** chưa bật — web dựa vào proxy (Vite dev, nginx prod). Nếu web/API khác origin cần `enableCors`.
2. **OpenAPI thiếu response schema** cho nhiều endpoint: `GET /v1/departments` (list/get), `PATCH`,
   `DELETE` (`{deactivated}`), `GET /v1/users`, `/v1/catalogs/*`, `GET /v1/settings/public`, `GET /health`.
   Web phải khai type tay (`types.ts`, đánh dấu `TODO(api)`).
3. **`page`/`limit` trong OpenAPI khai là `Object`** (`Record<string, never>`) — cần `@ApiPropertyOptional({ type: Number })`
   trong `PageQueryDto`; web tạm cast qua `pageQuery()`.
4. **`VALIDATION_ERROR.details` là `string[]`** — nên trả `{ field, message }[]` để gắn lỗi theo field chắc chắn.
5. Chưa có **`GET /v1/dashboard`** (KPI theo vai trò) — dashboard dùng mock có nhãn "Dữ liệu mẫu".
6. `GET /v1/departments` chưa hỗ trợ `sort/order`; `GET /v1/users` chưa có `all=true` (web lấy `limit=200`).
7. Chưa có **tìm kiếm toàn cục** (mã máy, vật tư, số phiếu, serial) — ô ⌘K chỉ là placeholder.
8. Chưa có **"Việc của tôi"** tổng hợp (repairs/maintenance được phân công + quá hạn).
9. `GET /v1/auth/me` nên trả `departmentName`; `GET /v1/settings/public` nên có `hospitalName` chuẩn.
10. SSE cần header nên không dùng `EventSource` native; cân nhắc ticket ngắn hạn qua query.
11. Luồng đăng nhập System Admin (`/sys/auth/login`) chưa làm ở web — menu SYS chỉ placeholder.
