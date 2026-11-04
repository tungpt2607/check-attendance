// Tiện ích cho kiểm thử tích hợp: gọi thẳng app Hono (không cần mở cổng) với MongoDB thật.
// - Cần biến môi trường MONGODB_TEST_URI (CI chạy sẵn một MongoDB, xem .github/workflows/ci.yml).
//   Không có thì các kiểm thử tích hợp tự bỏ qua (npm test trên máy vẫn chạy kiểm thử thuần).
// - Mỗi lần chạy dùng một database riêng, xóa khi xong: không bao giờ đụng dữ liệu thật.
import { after } from "node:test";
import { randomBytes } from "node:crypto";

const base = process.env.MONGODB_TEST_URI;
export const hasDb = !!base;
/** Dùng cho test(..., { skip }) */
export const skipWithoutDb = hasDb ? false : "Không có MONGODB_TEST_URI (chỉ chạy trong CI)";

const dbName = `ca_test_${Date.now()}_${randomBytes(3).toString("hex")}`;
if (base) {
  const u = new URL(base);
  u.pathname = `/${dbName}`;
  process.env.MONGODB_URI = u.toString();
}
process.env.AUTH_SECRET ??= "test-secret-khong-dung-that";
process.env.WEB_URL ??= "http://web.test";

type App = { request: (path: string, init?: RequestInit) => Response | Promise<Response> };
let appPromise: Promise<App> | null = null;
function getApp(): Promise<App> {
  appPromise ??= import("../src/index.ts").then((m) => m.default as App);
  return appPromise;
}

export type Res<T = any> = { status: number; body: T };

/** Gọi API: call("POST", "/v1/groups", { token, body }) */
export async function call<T = any>(method: string, path: string, opts: { token?: string; body?: unknown } = {}): Promise<Res<T>> {
  const app = await getApp();
  const headers: Record<string, string> = {};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await app.request(path, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

let seq = 0;
/** Tạo một tài khoản mới, trả về token và id */
export async function newUser(name = "Người dùng") {
  seq++;
  const email = `u${seq}_${randomBytes(3).toString("hex")}@test.local`;
  const r = await call<{ token: string; user: { id: string } }>("POST", "/v1/auth/register", {
    body: { name, email, password: "matkhau123" },
  });
  if (r.status !== 201 && r.status !== 200) throw new Error(`Đăng ký lỗi ${r.status}: ${JSON.stringify(r.body)}`);
  return { token: r.body.token, id: r.body.user.id, email };
}

/** Vector khuôn mặt giả: mỗi "người" một hướng riêng; noise nhỏ = cùng người chụp lần khác */
export function faceOf(person: number, noise = 0): number[] {
  return Array.from({ length: 128 }, (_, i) => (i === person ? 1 : 0) + (noise ? Math.sin(i * 7 + person) * noise : 0));
}

if (hasDb) {
  after(async () => {
    const { default: mongoose } = await import("mongoose");
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
  });
}
