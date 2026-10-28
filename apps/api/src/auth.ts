// Xác thực cho API: token gửi trong header "Authorization: Bearer <token>".
// Token chính là JWT phiên của web (ký bằng AUTH_SECRET), nên web và API dùng chung một phiên.
import type { Context, MiddlewareHandler } from "hono";
import { verifySession } from "./core/lib/auth-token.js";
import { getAccount } from "./core/modules/users/user.service.js";
import { fail } from "./http.js";

export type AuthUser = {
  userId: string;
  name: string;
  email: string;
  avatarVersion: number | null;
  tokenVersion: number;
  role: "user" | "admin";
};

export type AppEnv = { Variables: { user: AuthUser | null } };

function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

function bearer(c: Context): string | undefined {
  const h = c.req.header("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : undefined;
}

/**
 * Đọc token (nếu có) và gắn người dùng vào c.var.user.
 * Token hợp lệ nhưng đã cũ (đổi mật khẩu ở thiết bị khác, tài khoản bị xóa) thì báo 401 ngay.
 */
export const loadUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = bearer(c);
  if (!token) {
    c.set("user", null);
    return next();
  }
  const payload = await verifySession(token);
  if (!payload) fail(401, "invalid_token", "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Hãy đăng nhập lại.");
  const account = await getAccount(payload!.userId);
  if (!account || account.tokenVersion !== payload!.tv) {
    fail(401, "session_revoked", "Phiên đăng nhập đã hết hiệu lực. Hãy đăng nhập lại.");
  }
  const acc = account!;
  c.set("user", {
    userId: acc.id,
    name: acc.name,
    email: acc.email,
    avatarVersion: acc.avatarVersion,
    tokenVersion: acc.tokenVersion,
    role: acc.role === "admin" || adminEmails().has(acc.email.toLowerCase()) ? "admin" : "user",
  });
  return next();
};

/** Bắt buộc đã đăng nhập */
export function requireUser(c: Context<AppEnv>): AuthUser {
  const user = c.get("user");
  if (!user) return fail(401, "unauthenticated", "Bạn cần đăng nhập.");
  return user;
}

/** Bắt buộc là quản trị viên (dùng cho CMS) */
export function requireAdmin(c: Context<AppEnv>): AuthUser {
  const user = requireUser(c);
  if (user.role !== "admin") fail(403, "forbidden", "Bạn không có quyền quản trị.");
  return user;
}

/** Thông tin tài khoản trả về cho client (không có dữ liệu nhạy cảm) */
export function publicUser(u: AuthUser) {
  return { id: u.userId, name: u.name, email: u.email, avatarVersion: u.avatarVersion, role: u.role };
}
