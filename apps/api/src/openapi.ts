// Tài liệu API: đặc tả OpenAPI sinh tự động từ các route (createRoute + schema zod ở @check-attendance/shared/api).
// Thêm API mới bằng .openapi(createRoute(...)) là tự có trong /docs.

export const DOC_INFO = {
  title: "Điểm danh API",
  version: "1.1.0",
  description:
    "API dùng chung cho web người dùng, CMS quản trị và app. Đăng nhập qua /v1/auth/login để nhận token, " +
    "rồi gửi kèm header `Authorization: Bearer <token>`. Lỗi luôn có dạng `{ error: { code, message } }` " +
    "(message tiếng Việt để hiện cho người dùng). Ngày gửi lên dạng YYYY-MM-DD; thời gian trả về dạng ISO 8601.",
};

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
