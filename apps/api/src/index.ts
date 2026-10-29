// Backend API dùng chung cho web người dùng, CMS quản trị và app điện thoại.
// Chạy trên Vercel (Hono, không cần cấu hình): file này export default app.
import { OpenAPIHono } from "@hono/zod-openapi";
// Vercel nhận ra file khởi động nhờ dòng nạp "hono" này — đừng xóa (OpenAPIHono là lớp con của Hono).
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { loadUser, type AppEnv } from "./auth.js";
import { DOC_INFO, DOCS_HTML } from "./openapi.js";
import { account } from "./routes/account.js";
import { admin } from "./routes/admin.js";
import { groups } from "./routes/groups.js";
import { members } from "./routes/members.js";
import { notifications } from "./routes/notifications.js";
import { sessions } from "./routes/sessions.js";

const app = new OpenAPIHono<AppEnv>();

// Trình duyệt chỉ được gọi API từ các trang trong danh sách CORS_ORIGINS (app và máy chủ thì không bị giới hạn này)
const origins = (process.env.CORS_ORIGINS ?? "https://check-attendance-pi.vercel.app")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  "*",
  cors({
    origin: (origin) => (origins.includes(origin) ? origin : null),
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    maxAge: 86400,
  }),
);

app.get("/", (c) => c.redirect("/docs"));
app.get("/health", (c) => c.json({ ok: true }));
app.get("/docs", (c) => c.html(DOCS_HTML));

// Mọi API dưới /v1: đọc token (nếu có) trước khi vào route
app.use("/v1/*", loadUser);
app.route("/v1", account);
app.route("/v1", groups);
app.route("/v1", members);
app.route("/v1", sessions);
app.route("/v1", notifications);
app.route("/v1", admin);

// Đặc tả OpenAPI sinh từ các route
app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", { type: "http", scheme: "bearer", bearerFormat: "JWT" });
app.doc31("/openapi.json", (c) => ({ openapi: "3.1.0", info: DOC_INFO, servers: [{ url: new URL(c.req.url).origin }] }));

app.notFound((c) => c.json({ error: { code: "route_not_found", message: "Không có API này." } }, 404));

app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  console.error(err);
  return c.json({ error: { code: "server_error", message: "Có lỗi xảy ra ở máy chủ. Vui lòng thử lại." } }, 500);
});

if (!(app instanceof Hono)) throw new Error("app phải là Hono");

export default app;
