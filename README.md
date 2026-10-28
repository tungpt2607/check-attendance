# Check Attendance – Phần mềm điểm danh

Web điểm danh theo nhóm nhiều cấp. Next.js (App Router) + Material UI + MongoDB, deploy tự động trên Vercel.

**Địa chỉ:** https://check-attendance-pi.vercel.app

## Chức năng (v0.1)

- Đăng ký, đăng nhập (email + mật khẩu)
- Mỗi người dùng tự tạo nhóm điểm danh; nhóm có thể chia nhiều cấp (nhóm con)
- Nhóm ở cấp nào cũng có thể có thành viên; thêm nhanh nhiều người (mỗi dòng một người, dán được từ Excel)
- Tạo buổi điểm danh, chấm Có mặt / Muộn / Vắng kèm ghi chú, xem lại lịch sử

## Cấu trúc (monorepo)

Repo chứa nhiều dự án dùng npm workspaces. Mục tiêu: một **backend API** duy nhất nối DB, các giao diện (web người dùng, CMS quản trị, app điện thoại) đều gọi qua API.

```
apps/
  web/                 Web người dùng (Next.js) — dự án Vercel đặt Root Directory = apps/web
  api/                 (giai đoạn 2) Backend API (Hono) — dự án Vercel riêng
  cms/                 (sau này) Trang quản trị
  mobile/              (sau này) App điện thoại
packages/
  shared/              (giai đoạn 2) Kiểu dữ liệu và quy tắc kiểm tra dùng chung
```

Lộ trình tách API: (1) chuyển sang monorepo, (2) dựng `apps/api` + tài liệu API, (3) chuyển web sang gọi API từng phần, (4) gỡ kết nối DB khỏi web.

Bên trong `apps/web`:

```
src/
  app/                 Trang (routes)
  components/          Thành phần giao diện dùng chung (Material UI)
  theme/               Màu thương hiệu (brand.ts) và theme MUI (theme.ts)
  lib/                 Hạ tầng: kết nối DB, phiên đăng nhập, định dạng ngày
  modules/             Nghiệp vụ, mỗi module một thư mục
    users/             Tài khoản
    auth/              Đăng ký / đăng nhập / đăng xuất
    groups/            Nhóm nhiều cấp
    members/           Thành viên của nhóm
    attendance/        Buổi điểm danh, kết quả, thống kê
    invites/           Liên kết tài khoản với thành viên
```

Mỗi module gồm `*.model.ts` (dữ liệu), `*.service.ts` (nghiệp vụ) và `*.actions.ts` (server actions gọi từ giao diện, có kiểm tra quyền).

## Dữ liệu

| Collection | Ý nghĩa |
|---|---|
| `users` | Tài khoản đăng nhập |
| `groups` | Nhóm; `parentId` trỏ nhóm cha, `ancestors` lưu đường dẫn từ gốc |
| `members` | Người trong nhóm; `userId` để trống ở bản đầu, sau này liên kết tài khoản |
| `attendancesessions` | Buổi điểm danh; `method` để sau này thêm QR, GPS... |
| `attendancerecords` | Kết quả của từng thành viên trong một buổi |

## Giao diện

- Dùng **Material UI**; theme và màu thương hiệu OPES nằm trong `src/theme/`.
- Đổi màu toàn hệ thống: sửa `src/theme/brand.ts`.
- Logo vector: `src/components/logo.tsx`, biểu tượng web: `src/app/icon.svg`, `src/app/apple-icon.png`.

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
