# Check Attendance – Phần mềm điểm danh

Web điểm danh theo nhóm nhiều cấp. Next.js (App Router) + Material UI + MongoDB, deploy tự động trên Vercel.

**Địa chỉ:** https://check-attendance-pi.vercel.app

## Chức năng (v0.1)

- Đăng ký, đăng nhập (email + mật khẩu)
- Mỗi người dùng tự tạo nhóm điểm danh; nhóm có thể chia nhiều cấp (nhóm con)
- Nhóm ở cấp nào cũng có thể có thành viên; thêm nhanh nhiều người (mỗi dòng một người, dán được từ Excel)
- Tạo buổi điểm danh, chấm Có mặt / Muộn / Vắng kèm ghi chú, xem lại lịch sử

## Cấu trúc (monorepo)

Repo chứa nhiều dự án dùng npm workspaces: một **backend API** duy nhất nối DB, các giao diện (web người dùng, sau này CMS quản trị, app điện thoại) đều gọi qua API.

```
apps/
  api/                 Backend API (Hono + zod-openapi) — dự án Vercel riêng, Root Directory = apps/api
  web/                 Web người dùng (Next.js) — dự án Vercel, Root Directory = apps/web
  cms/                 (sau này) Trang quản trị
  mobile/              (sau này) App điện thoại
packages/
  shared/              Code dùng chung (TypeScript, không build sẵn)
    src/api.ts         Schema zod của mọi dữ liệu API gửi/nhận + kiểu dữ liệu (z.infer) + buildGroupTree
    src/statuses.ts    Trạng thái Có mặt / Muộn / Vắng
    src/format.ts      Định dạng ngày giờ (giờ Việt Nam)
    src/search.ts      Chuẩn hóa chuỗi để tìm kiếm không dấu
    src/short-code.ts  Mã QR rút gọn, cookie "điện thoại đã điểm danh"
```

Dùng gói chung: `import { ... } from "@check-attendance/shared/<tên file>"`. Web khai báo `transpilePackages` trong `next.config.mjs`.

### Web (`apps/web/src`)

```
app/                   Trang (routes). Trang lớn tách phần con vào thư mục _components cạnh page.tsx
components/            Thành phần giao diện dùng chung (Material UI)
theme/                 Màu thương hiệu (brand.ts) và theme MUI (theme.ts)
lib/
  api.ts               api() gọi backend (tự gửi phiên đăng nhập), ApiError, apiOrNull, ignoreApiError, enc
  api-url.ts           Địa chỉ API, avatarUrl() (dùng được cả phía trình duyệt)
  session.ts           requireUser() (kiểm tra token tại chỗ), requireAccount()/getSession() (đủ thông tin qua /v1/me)
  auth-token.ts        Kiểm tra chữ ký token phiên (dùng cả trong middleware)
modules/<tên>/         *.actions.ts: server actions gọi API; group.api.ts: đọc dữ liệu nhóm
```

Web **không nối DB**; mọi dữ liệu đi qua API. Phiên đăng nhập hết hiệu lực (API báo 401) thì tự chuyển `/logout`.

## Backend API (`apps/api`)

- Tài liệu và bấm thử: `/docs` (Swagger UI), đặc tả sinh tự động: `/openapi.json`, kiểm tra sống: `/health`.
- Mọi API nằm dưới `/v1`. Đăng nhập `POST /v1/auth/login` nhận `token`, gửi kèm `Authorization: Bearer <token>`.
  Token chính là phiên đăng nhập của web (ký bằng `AUTH_SECRET`), đổi mật khẩu thì mọi token cũ hết hiệu lực.
- Lỗi luôn có dạng `{ "error": { "code": "...", "message": "..." } }` (message tiếng Việt để hiện cho người dùng).
  Dữ liệu gửi lên sai schema: 422; mã trên đường dẫn sai: 404.
- Quyền: chỉ chủ nhóm xem/sửa nhóm, thành viên, buổi điểm danh của nhóm đó (không thuộc quyền thì trả 404).
  Vai trò `admin` (cho CMS) lấy từ trường `users.role` hoặc danh sách email trong `ADMIN_EMAILS`.
- Thêm API: trong `src/routes/*.ts` dùng `.openapi(createRoute({ ... request, responses }), handler)` với schema
  ở `packages/shared/src/api.ts` → tự kiểm tra dữ liệu và tự có trong `/docs`.
- `src/core/`: models + services (Mongoose). `src/http.ts`: createApp, fail/notFound, tiện ích mô tả route.
- Thư viện CommonJS (mongoose, qrcode) phải nạp kiểu mặc định (`import mongoose from "mongoose"`).
- Biến môi trường: xem `apps/api/.env.example`.

## Kiểm tra tự động (CI)

GitHub Actions (`.github/workflows/ci.yml`) chạy mỗi lần đẩy code: kiểm tra kiểu API và gói dùng chung, build web.
Lỗi hiện ở tab **Actions** trên GitHub (và trong chú thích của lần chạy).

## Dữ liệu

| Collection | Ý nghĩa |
|---|---|
| `users` | Tài khoản đăng nhập |
| `groups` | Nhóm; `parentId` trỏ nhóm cha, `ancestors` lưu đường dẫn từ gốc |
| `members` | Người trong nhóm; `userId` để trống ở bản đầu, sau này liên kết tài khoản |
| `attendancesessions` | Buổi điểm danh; `method` để sau này thêm QR, GPS... |
| `attendancerecords` | Kết quả của từng thành viên trong một buổi |

## Giao diện

- Dùng **Material UI**; theme và màu thương hiệu OPES nằm trong `apps/web/src/theme/`.
- Đổi màu toàn hệ thống: sửa `apps/web/src/theme/brand.ts`.
- Logo vector: `apps/web/src/components/logo.tsx`, biểu tượng web: `apps/web/src/app/icon.svg`, `apps/web/src/app/apple-icon.png`.

## Mở rộng sau này

- Thêm trạng thái điểm danh: sửa `src/modules/attendance/attendance.statuses.ts`
- Thêm cách điểm danh (QR, GPS...): thêm vào `ATTENDANCE_METHODS` và xử lý tương ứng
- Cho thành viên tự đăng nhập: liên kết `members.userId` với `users`

## Biến môi trường

Xem `.env.example`: `MONGODB_URI`, `AUTH_SECRET`.

## Chạy trên máy

```bash
npm install                                        # cài cho cả repo (workspaces)
cp apps/web/.env.example apps/web/.env.local       # điền giá trị thật
npm run dev:web
```
