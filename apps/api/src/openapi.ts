// Tài liệu API (OpenAPI 3.1) và trang /docs (Swagger UI).
// Mỗi dòng trong ENDPOINTS mô tả một API; thêm API mới thì thêm một dòng ở đây.

type Ep = {
  method: "get" | "post" | "put" | "patch" | "delete";
  path: string;
  tag: string;
  summary: string;
  /** "user": cần token · "optional": có token thì dùng · "none": công khai */
  auth: "user" | "optional" | "none";
  /** Ví dụ body JSON (hoặc "multipart" cho tải ảnh) */
  body?: Record<string, unknown> | "multipart";
  query?: { name: string; description: string }[];
  status?: number;
};

const ENDPOINTS: Ep[] = [
  // Tài khoản
  { method: "post", path: "/v1/auth/register", tag: "Tài khoản", summary: "Đăng ký, trả token", auth: "none", status: 201, body: { name: "Nguyễn Văn An", email: "an@example.com", password: "matkhau123" } },
  { method: "post", path: "/v1/auth/login", tag: "Tài khoản", summary: "Đăng nhập, trả token", auth: "none", body: { email: "an@example.com", password: "matkhau123" } },
  { method: "post", path: "/v1/auth/logout", tag: "Tài khoản", summary: "Đăng xuất (client tự xóa token)", auth: "none", status: 204 },
  { method: "get", path: "/v1/me", tag: "Tài khoản", summary: "Thông tin tài khoản của tôi", auth: "user" },
  { method: "patch", path: "/v1/me", tag: "Tài khoản", summary: "Đổi họ tên", auth: "user", body: { name: "Nguyễn Văn An" } },
  { method: "put", path: "/v1/me/avatar", tag: "Tài khoản", summary: "Tải ảnh đại diện (multipart, trường avatar; JPEG/PNG/WebP ≤ 600KB)", auth: "user", body: "multipart" },
  { method: "delete", path: "/v1/me/avatar", tag: "Tài khoản", summary: "Xóa ảnh đại diện", auth: "user", status: 204 },
  { method: "post", path: "/v1/me/password", tag: "Tài khoản", summary: "Đổi mật khẩu, trả token mới (mọi token cũ hết hiệu lực)", auth: "user", body: { current: "matkhau123", next: "matkhaumoi456" } },
  { method: "get", path: "/v1/users/{id}/avatar", tag: "Tài khoản", summary: "Ảnh đại diện (công khai, thêm ?v=avatarVersion)", auth: "none" },

  // Nhóm
  { method: "get", path: "/v1/groups", tag: "Nhóm", summary: "Cây các nhóm tôi quản lý", auth: "user" },
  { method: "post", path: "/v1/groups", tag: "Nhóm", summary: "Tạo nhóm (có parentId là nhóm con)", auth: "user", status: 201, body: { name: "Lớp 10A1", parentId: null } },
  { method: "get", path: "/v1/groups/{id}", tag: "Nhóm", summary: "Chi tiết nhóm: nhóm cha, nhóm con kèm thống kê, chuyên cần cả nhánh", auth: "user" },
  { method: "patch", path: "/v1/groups/{id}", tag: "Nhóm", summary: "Đổi tên nhóm", auth: "user", body: { name: "Lớp 10A2" } },
  { method: "delete", path: "/v1/groups/{id}", tag: "Nhóm", summary: "Xóa nhóm (409 nếu còn nhóm con)", auth: "user", status: 204 },
  { method: "get", path: "/v1/groups/{id}/invite", tag: "Nhóm", summary: "Link tham gia nhóm đang bật (null nếu tắt)", auth: "user" },
  { method: "post", path: "/v1/groups/{id}/invite", tag: "Nhóm", summary: "Bật link tham gia / tạo link mới", auth: "user", status: 201 },
  { method: "delete", path: "/v1/groups/{id}/invite", tag: "Nhóm", summary: "Tắt link tham gia", auth: "user", status: 204 },
  { method: "get", path: "/v1/groups/{id}/requests", tag: "Nhóm", summary: "Yêu cầu liên kết đang chờ duyệt", auth: "user" },
  { method: "post", path: "/v1/requests/{id}/approve", tag: "Nhóm", summary: "Duyệt yêu cầu liên kết", auth: "user" },
  { method: "post", path: "/v1/requests/{id}/reject", tag: "Nhóm", summary: "Từ chối yêu cầu liên kết", auth: "user" },

  // Thành viên
  { method: "get", path: "/v1/groups/{id}/members", tag: "Thành viên", summary: "Danh sách thành viên kèm tỷ lệ chuyên cần", auth: "user", query: [{ name: "sort", description: "rate = chuyên cần thấp lên đầu" }] },
  { method: "post", path: "/v1/groups/{id}/members", tag: "Thành viên", summary: "Thêm nhiều thành viên (text nhiều dòng hoặc mảng members)", auth: "user", status: 201, body: { members: [{ name: "Nguyễn Văn An" }, { code: "HS002", name: "Trần Thị Bình" }] } },
  { method: "get", path: "/v1/members/{id}", tag: "Thành viên", summary: "Một thành viên: chuyên cần và lịch sử từng buổi", auth: "user" },
  { method: "patch", path: "/v1/members/{id}", tag: "Thành viên", summary: "Sửa họ tên, mã số (mã rỗng = xóa mã)", auth: "user", body: { name: "Nguyễn Văn An", code: "HS001" } },
  { method: "delete", path: "/v1/members/{id}", tag: "Thành viên", summary: "Xóa thành viên cùng lịch sử điểm danh", auth: "user", status: 204 },
  { method: "post", path: "/v1/members/{id}/invite", tag: "Thành viên", summary: "Tạo link mời riêng (1 lần, 7 ngày)", auth: "user", status: 201 },
  { method: "delete", path: "/v1/members/{id}/link", tag: "Thành viên", summary: "Hủy liên kết tài khoản", auth: "user", status: 204 },

  // Buổi điểm danh
  { method: "get", path: "/v1/groups/{id}/sessions", tag: "Điểm danh", summary: "Các buổi điểm danh của nhóm kèm số Có mặt/Muộn/Vắng", auth: "user" },
  { method: "post", path: "/v1/groups/{id}/sessions", tag: "Điểm danh", summary: "Tạo buổi điểm danh", auth: "user", status: 201, body: { title: "Tiết 1", date: "2026-10-29" } },
  { method: "get", path: "/v1/sessions/{id}", tag: "Điểm danh", summary: "Buổi điểm danh kèm kết quả từng thành viên", auth: "user" },
  { method: "patch", path: "/v1/sessions/{id}", tag: "Điểm danh", summary: "Sửa tên, ngày", auth: "user", body: { title: "Tiết 2", date: "2026-10-30" } },
  { method: "delete", path: "/v1/sessions/{id}", tag: "Điểm danh", summary: "Xóa buổi cùng kết quả", auth: "user", status: 204 },
  { method: "put", path: "/v1/sessions/{id}/records", tag: "Điểm danh", summary: "Lưu kết quả (chỉ gửi dòng thay đổi)", auth: "user", body: { records: [{ memberId: "<id>", status: "present", note: "" }] } },
  { method: "post", path: "/v1/sessions/{id}/self-checkin/open", tag: "Điểm danh", summary: "Mở tự điểm danh bằng QR", auth: "user" },
  { method: "post", path: "/v1/sessions/{id}/self-checkin/close", tag: "Điểm danh", summary: "Đóng tự điểm danh", auth: "user" },
  { method: "get", path: "/v1/sessions/{id}/qr", tag: "Điểm danh", summary: "Mã QR hiện tại (đổi mỗi 30 giây) và số người đã điểm danh", auth: "user" },

  // Tự điểm danh
  { method: "get", path: "/v1/checkin/{sessionId}", tag: "Tự điểm danh", summary: "Danh sách tên để chọn sau khi quét QR", auth: "optional", query: [{ name: "t", description: "Token trong mã QR" }] },
  { method: "post", path: "/v1/checkin/{sessionId}", tag: "Tự điểm danh", summary: "Tự điểm danh (tên đã liên kết phải đăng nhập đúng tài khoản)", auth: "optional", body: { token: "<token trong mã QR>", memberId: "<id>" } },

  // Liên kết tài khoản (phía thành viên)
  { method: "get", path: "/v1/invites/{token}", tag: "Liên kết tài khoản", summary: "Xem link mời riêng", auth: "user" },
  { method: "post", path: "/v1/invites/{token}/accept", tag: "Liên kết tài khoản", summary: "Xác nhận đúng là tôi", auth: "user" },
  { method: "get", path: "/v1/join/{token}", tag: "Liên kết tài khoản", summary: "Mở link chung: tên chưa liên kết, yêu cầu đang chờ của tôi", auth: "user" },
  { method: "post", path: "/v1/join/{token}/request", tag: "Liên kết tài khoản", summary: "Xin nhận một tên (chờ chủ nhóm duyệt)", auth: "user", status: 201, body: { memberId: "<id>" } },
  { method: "delete", path: "/v1/join/{token}/request", tag: "Liên kết tài khoản", summary: "Hủy yêu cầu đang chờ", auth: "user", status: 204 },
  { method: "get", path: "/v1/memberships", tag: "Liên kết tài khoản", summary: "Các nhóm tôi tham gia", auth: "user" },
  { method: "get", path: "/v1/memberships/{memberId}", tag: "Liên kết tài khoản", summary: "Chuyên cần, lịch sử của tôi và danh sách thành viên nhóm", auth: "user" },
];

const ERROR_SCHEMA = {
  type: "object",
  properties: {
    error: {
      type: "object",
      properties: { code: { type: "string", example: "not_found" }, message: { type: "string", example: "Không tìm thấy nhóm." } },
    },
  },
};

export function openApiSpec(serverUrl: string) {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const ep of ENDPOINTS) {
    const params = [...ep.path.matchAll(/\{(\w+)\}/g)].map((m) => ({ name: m[1], in: "path", required: true, schema: { type: "string" } }));
    const query = (ep.query ?? []).map((q) => ({ name: q.name, in: "query", required: false, description: q.description, schema: { type: "string" } }));
    const status = String(ep.status ?? 200);
    const op: Record<string, unknown> = {
      tags: [ep.tag],
      summary: ep.summary,
      parameters: [...params, ...query],
      responses: {
        [status]: { description: status === "204" ? "Thành công, không có nội dung" : "Thành công" },
        default: { description: "Lỗi", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
      },
    };
    if (ep.auth === "user") op.security = [{ bearer: [] }];
    if (ep.auth === "optional") op.security = [{}, { bearer: [] }];
    if (ep.auth === "none") op.security = [];
    if (ep.body === "multipart") {
      op.requestBody = {
        required: true,
        content: { "multipart/form-data": { schema: { type: "object", properties: { avatar: { type: "string", format: "binary" } } } } },
      };
    } else if (ep.body) {
      op.requestBody = { required: true, content: { "application/json": { example: ep.body } } };
    }
    (paths[ep.path] ??= {})[ep.method] = op;
  }
  return {
    openapi: "3.1.0",
    info: {
      title: "Điểm danh API",
      version: "1.0.0",
      description:
        "API dùng chung cho web người dùng, CMS quản trị và app. Đăng nhập qua /v1/auth/login để nhận token, " +
        "rồi gửi kèm header `Authorization: Bearer <token>`. Lỗi luôn có dạng `{ error: { code, message } }`. " +
        "Ngày gửi lên dạng YYYY-MM-DD; thời gian trả về dạng ISO 8601.",
    },
    servers: [{ url: serverUrl }],
    security: [{ bearer: [] }],
    components: {
      securitySchemes: { bearer: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
      schemas: { Error: ERROR_SCHEMA },
    },
    paths,
  };
}

/** Trang /docs: Swagger UI tải từ CDN, đọc /openapi.json */
export const DOCS_HTML = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Điểm danh API</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css" />
  <style>body { margin: 0; background: #fafafa; } .topbar { display: none; }</style>
</head>
<body>
  <div id="ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({ url: "/openapi.json", dom_id: "#ui", persistAuthorization: true, docExpansion: "list" });
  </script>
</body>
</html>`;
