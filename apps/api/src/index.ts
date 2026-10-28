// Backend API dùng chung cho web người dùng, CMS quản trị và app điện thoại.
// Chạy trên Vercel (Hono, không cần cấu hình): file này export default app.
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { loadUser, type AppEnv } from "./auth.js";
import { DOCS_HTML, openApiSpec } from "./openapi.js";
import { account } from "./routes/account.js";
import { groups } from "./routes/groups.js";
import { members } from "./routes/members.js";
import { sessions } from "./routes/sessions.js";

const app = new Hono<AppEnv>();

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
app.get("/openapi.json", (c) => c.json(openApiSpec(new URL(c.req.url).origin)));
app.get("/docs", (c) => c.html(DOCS_HTML));

const v1 = new Hono<AppEnv>();
v1.use("*", loadUser);
v1.route("/", account);
v1.route("/", groups);
v1.route("/", members);
v1.route("/", sessions);
app.route("/v1", v1);

app.notFound((c) => c.json({ error: { code: "route_not_found", message: "Không có API này." } }, 404));

app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse();
  console.error(err);
  return c.json({ error: { code: "server_error", message: "Có lỗi xảy ra ở máy chủ. Vui lòng thử lại." } }, 500);
});

export default app;
