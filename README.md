# Check Attendance – Phần mềm điểm danh

Web điểm danh theo nhóm nhiều cấp. Next.js (App Router) + Material UI + MongoDB, deploy tự động trên Vercel.

**Địa chỉ:** https://check-attendance-pi.vercel.app

## Chức năng

- Đăng ký, đăng nhập (email + mật khẩu)
- Mỗi người dùng tự tạo nhóm điểm danh; nhóm có thể chia nhiều cấp (nhóm con)
- Nhóm ở cấp nào cũng có thể có thành viên; thêm nhanh nhiều người (mỗi dòng một người, dán được từ Excel)
- Tạo buổi điểm danh, chấm Có mặt / Muộn / Vắng kèm ghi chú, xem lại lịch sử
- Tự điểm danh bằng mã QR động
- Điểm danh bằng khuôn mặt: chủ nhóm mở camera trên điện thoại, đi quét từng người (xem mục bên dưới)

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

## Quy tắc viết code

Áp dụng cho **mọi thay đổi** (người hay AI viết đều vậy):

**Tổng quát, dùng lại được**
- Trước khi viết mới, tìm xem đã có thành phần dùng chung chưa: `packages/ui` (giao diện: `SearchField`, `useSearch`,
  `SearchList`, `NameWithCode`, `FeatureCard`, `FullscreenPanel`, `BottomSheetDialog`, `ConfirmDialog`, `PagedList`...),
  `packages/shared` (schema API, trạng thái, định dạng, tìm kiếm), `apps/api/src/core` (service, `rate.ts`...).
- Đoạn code giống nhau xuất hiện từ lần thứ 2 → tách thành component/hook/hàm dùng chung (dùng cho cả web và CMS thì đặt ở `packages/ui`).
- Chia nhỏ: một file làm một việc; component dài (khoảng trên 200 dòng) thì tách phần con, logic (tải dữ liệu, camera...) thì tách hook.
- Kiểu chữ/màu lặp lại → đưa vào theme (`packages/ui/src/theme.ts`) hoặc `brand.ts`, không viết lại `sx` ở từng chỗ.
- Server action gọi API dùng `apiAction` / `apiActionOk`; schema API khai báo một lần ở `packages/shared/src/api.ts`.

**Performance**
- API: để MongoDB đếm/gom (`countDocuments`, `aggregate` `$group`), không tải cả danh sách chỉ để đếm; chỉ `select` trường cần dùng; `lean()`.
- Truy vấn mới có lọc/sắp xếp thường xuyên → thêm index (khai báo trong model, trước khi tạo model; sắp xếp tiếng Việt dùng cùng `VI_COLLATION`).
- Không gọi API/DB lặp lại cùng một dữ liệu trong một lượt tải trang; các lời gọi độc lập chạy song song (`Promise.all`).
- Giao diện: danh sách dài thì từng dòng là component `memo` với hàm callback ổn định (`useCallback`);
  tính trước dữ liệu nặng bằng `useMemo` (vd. chuỗi tìm kiếm chuẩn hóa sẵn qua `useSearch`).
- Thư viện nặng (vd. face-api) nạp động (`import()`) đúng trang cần; file tĩnh lớn không đổi thì cho trình duyệt lưu đệm lâu (`next.config.mjs` `headers`).

**Kiểm tra**
- Phép tính quan trọng (tỷ lệ chuyên cần...) tách thành hàm thuần và có kiểm thử (`npm test -w @check-attendance/api`).
- Trước khi đẩy code: typecheck API, build web và CMS như CI; thay đổi giao diện thì chạy thử trên trình duyệt (cả khổ điện thoại).

## Phiên bản

Mỗi phần có **phiên bản riêng** (semver `X.Y.Z`), ghi ở trường `version` trong `package.json` của phần đó và **tăng thủ công trong mỗi PR**:

| Phần | File | Hiển thị ở |
|---|---|---|
| Web người dùng | `apps/web/package.json` | Menu tài khoản (bấm avatar) và cuối trang Tài khoản: "Phiên bản 1.0.0 · API 1.0.0" |
| CMS quản trị | `apps/cms/package.json` | Cuối thanh bên của CMS |
| API | `apps/api/package.json` | `/health`, `/docs`, và cạnh phiên bản web |

- Tăng số nào: sửa lỗi → số cuối (`1.0.0` → `1.0.1`); tính năng mới → số giữa (`1.0.1` → `1.1.0`); thay đổi lớn → số đầu (`2.0.0`).
- Chỉ tăng phần **có thay đổi**. Sửa `packages/shared` → tăng cả web, CMS, API; sửa `packages/ui` → tăng web và CMS. Chỉ sửa tài liệu `*.md` thì không cần.
- CI kiểm tra mỗi PR (`scripts/check-versions.mjs`): phần có thay đổi mà chưa tăng phiên bản thì báo đỏ. Chạy thử trên máy: `node scripts/check-versions.mjs origin/main`.
- Merge vào `main`: workflow `.github/workflows/release.yml` tự tạo tag `web-v1.0.1`, `cms-v…`, `api-v…` và GitHub Release (ghi chú = các commit chạm vào phần đó kể từ tag trước) cho phần có phiên bản mới.
- Web và CMS đọc phiên bản lúc build (`next.config.mjs` → `NEXT_PUBLIC_APP_VERSION`); API đọc qua `apps/api/src/version.ts`.

## Kiểm tra tự động (CI)

GitHub Actions (`.github/workflows/ci.yml`) chạy mỗi lần đẩy code. Lỗi hiện ở tab **Actions** trên GitHub (và trong chú thích của lần chạy).

| Bước | Lệnh | Kiểm tra gì |
|---|---|---|
| Phiên bản (chỉ PR) | `node scripts/check-versions.mjs origin/main` | Phần có thay đổi đã tăng phiên bản |
| Kiểu dữ liệu | `npm run typecheck -w @check-attendance/api` | TypeScript của API, gói dùng chung |
| Kiểm thử API | `npm test -w @check-attendance/api` | Phép tính (`test/rate.test.ts`) và **API với MongoDB thật** (`test/api.int.test.ts`) |
| Build | `npm run build -w @check-attendance/web` / `cms` | Web và CMS build được |
| Đầu-cuối | `npm run test:e2e` | **Trình duyệt thật** (`e2e/`): đăng ký, trang nhóm, bảng điểm danh, tự điểm danh QR, điểm danh bằng khuôn mặt với camera giả |

- CI chạy kèm một **MongoDB riêng cho kiểm thử** (không phải database của web); mỗi lần chạy dùng database mới và xóa khi xong.
- Trên máy: kiểm thử tích hợp và đầu-cuối cần MongoDB: đặt `MONGODB_TEST_URI=mongodb://localhost:27017/`
  (không có thì kiểm thử tích hợp tự bỏ qua). Đầu-cuối cần thêm: build web với `NEXT_PUBLIC_API_URL=http://localhost:8787`,
  `ffmpeg` (tạo video camera giả từ `e2e/fixtures/*.jpg`), `npx -w @check-attendance/e2e playwright install chromium`.
- API chạy như máy chủ Node thường (không cần Vercel): `npx tsx apps/api/scripts/serve.ts`.
- Kiểm thử đầu-cuối lỗi: CI lưu ảnh chụp + trace ở mục **Artifacts** của lần chạy (`playwright-report`).

## Dữ liệu

| Collection | Ý nghĩa |
|---|---|
| `users` | Tài khoản đăng nhập |
| `groups` | Nhóm; `parentId` trỏ nhóm cha, `ancestors` lưu đường dẫn từ gốc |
| `members` | Người trong nhóm; `userId` để trống ở bản đầu, sau này liên kết tài khoản |
| `attendancesessions` | Buổi điểm danh; `method` để sau này thêm QR, GPS... |
| `attendancerecords` | Kết quả của từng thành viên trong một buổi; `source`: `manual` (chủ nhóm chấm), `self` (tự quét QR), `face` (quét khuôn mặt) |
| `faceprofiles` | Dữ liệu khuôn mặt: chỉ vector đặc trưng 128 số, **không lưu ảnh**. Thuộc về một tài khoản (`userId`, dùng chung mọi nhóm) hoặc một thành viên chưa liên kết (`memberId`, tối đa 5 mẫu) |

## Điểm danh bằng khuôn mặt

- Trang `/groups/:groupId/sessions/:sessionId/face` (nút **Mở camera** ở trang buổi điểm danh). Chủ nhóm đưa camera vào từng người.
- Model nhận diện ([`@vladmandic/face-api`](https://github.com/vladmandic/face-api)) chạy **trên trình duyệt**; file model để trong
  `apps/web/public/models/face` (tiny_face_detector, face_landmark_68, face_recognition, khoảng 7MB, tải một lần rồi trình duyệt lưu đệm).
  Ảnh camera không gửi đi; chỉ gửi 128 con số lên API.
- API so khớp phía máy chủ (`src/core/modules/faces/face.service.ts`, ngưỡng `MATCH_THRESHOLD`), vector của người khác không bao giờ trả ra ngoài:
  - `POST /v1/sessions/:id/face/scan`: nhận ra thì ghi Có mặt ngay; không thì trả `unknown`
  - `POST /v1/sessions/:id/face/assign`: chủ nhóm chọn tên cho khuôn mặt chưa nhận ra → ghi Có mặt và lưu khuôn mặt:
    thành viên đã liên kết tài khoản → lưu vào tài khoản nếu tài khoản **chưa có** khuôn mặt (có rồi thì giữ nguyên);
    chưa liên kết → thêm mẫu cho thành viên
  - `POST /v1/sessions/:id/face/undo`: nút **Sai người** (trả kết quả về như trước lượt quét)
  - `GET/DELETE /v1/me/face`: người dùng xem/xóa khuôn mặt của mình (trang Tài khoản)
  - `DELETE /v1/members/:id/face`: chủ nhóm xóa khuôn mặt lưu riêng của thành viên (trang thành viên)
- Khi so khớp, mỗi thành viên dùng khuôn mặt của tài khoản đã liên kết nếu có, không thì khuôn mặt lưu riêng ở thành viên.
- Xóa thành viên/nhóm thì khuôn mặt lưu riêng của thành viên bị xóa theo; khuôn mặt của tài khoản thuộc về người dùng.
- Đổi model: đổi `FACE_MODEL` trong `face.service.ts` (vector của model cũ không được so nữa) và đặt file model vào **thư mục mới**
  (vd. `public/models/face-v2`, sửa `MODEL_URL`), vì `/models/*` được trình duyệt lưu đệm 1 năm (`next.config.mjs`).
- Dữ liệu khuôn mặt là dữ liệu cá nhân nhạy cảm: cần thông báo và có sự đồng ý của người được quét trước khi dùng.

## Giao diện

- Dùng **Material UI**; theme và màu thương hiệu OPES nằm trong `apps/web/src/theme/`.
- Đổi màu toàn hệ thống: sửa `apps/web/src/theme/brand.ts`.
- Logo vector: `apps/web/src/components/logo.tsx`, biểu tượng web: `apps/web/src/app/icon.svg`, `apps/web/src/app/apple-icon.png`.

## Mở rộng sau này

- Thêm trạng thái điểm danh: sửa `src/modules/attendance/attendance.statuses.ts`
- Thêm cách điểm danh (GPS...): thêm vào `RECORD_SOURCES` (`packages/shared/src/statuses.ts`) và xử lý tương ứng
- Cho thành viên tự đăng nhập: liên kết `members.userId` với `users`

## Biến môi trường

Xem `.env.example`: `MONGODB_URI`, `AUTH_SECRET`.

## Chạy trên máy

```bash
npm install                                        # cài cho cả repo (workspaces)
cp apps/web/.env.example apps/web/.env.local       # điền giá trị thật
npm run dev:web
```
