# Check Attendance – Phần mềm điểm danh

Web điểm danh theo nhóm nhiều cấp. Next.js (App Router) + MongoDB, deploy tự động trên Vercel.

**Địa chỉ:** https://check-attendance-pi.vercel.app

## Chức năng (v0.1)

- Đăng ký, đăng nhập (email + mật khẩu)
- Mỗi người dùng tự tạo nhóm điểm danh; nhóm có thể chia nhiều cấp (nhóm con)
- Nhóm ở cấp nào cũng có thể có thành viên; thêm nhanh nhiều người (mỗi dòng một người, dán được từ Excel)
- Tạo buổi điểm danh, chấm Có mặt / Muộn / Vắng kèm ghi chú, xem lại lịch sử

## Cấu trúc

```
src/
  app/                 Trang (routes)
  components/          Thành phần giao diện dùng chung
  lib/                 Hạ tầng: kết nối DB, phiên đăng nhập, định dạng ngày
  modules/             Nghiệp vụ, mỗi module một thư mục
    users/             Tài khoản
    auth/              Đăng ký / đăng nhập / đăng xuất
    groups/            Nhóm nhiều cấp
    members/           Thành viên của nhóm
    attendance/        Buổi điểm danh và kết quả
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

## Mở rộng sau này

- Thêm trạng thái điểm danh: sửa `src/modules/attendance/attendance.statuses.ts`
- Thêm cách điểm danh (QR, GPS...): thêm vào `ATTENDANCE_METHODS` và xử lý tương ứng
- Cho thành viên tự đăng nhập: liên kết `members.userId` với `users`

## Biến môi trường

Xem `.env.example`: `MONGODB_URI`, `AUTH_SECRET`.

## Chạy trên máy

```bash
npm install
cp .env.example .env.local   # điền giá trị thật
npm run dev
```
