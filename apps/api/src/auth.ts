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

type AuthProblem = { code: "invalid_token" | "session_revoked"; message: string } | null;

export type AppEnv = { Variables: { user: AuthUser | null; authProblem: AuthProblem } };

function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Vai trò thực tế của một tài khoản: admin nếu được đánh dấu trong DB hoặc có email trong ADMIN_EMAILS.
 *  Mọi chỗ (đăng nhập, đăng ký, đổi mật khẩu, các API cần token) đều dùng hàm này. */
export function resolveRole(acc: { role: "user" | "admin"; email: string }): "user" | "admin" {
  return acc.role === "admin" || adminEmails().has(acc.email.toLowerCase()) ? "admin" : "user";
}

function bearer(c: Context): string | undefined {
  const h = c.req.header("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m ? m[1].trim() : undefined;
}

/**
 * Đọc token (nếu có) và gắn người dùng vào c.var.user.
 * Token hỏng hoặc đã cũ (đổi mật khẩu ở thiết bị khác, tài khoản bị xóa): coi như chưa đăng nhập;
 * API cần đăng nhập sẽ báo 401 kèm lý do, API công khai (tự điểm danh) vẫn dùng được.
 */
export const loadUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  c.set("user", null);
  c.set("authProblem", null);
  const token = bearer(c);
  if (!token) return next();

  const payload = await verifySession(token);
  if (!payload) {
    c.set("authProblem", { code: "invalid_token", message: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Hãy đăng nhập lại." });
    return next();
  }
  const acc = await getAccount(payload.userId);
  if (!acc || acc.tokenVersion !== payload.tv) {
    c.set("authProblem", { code: "session_revoked", message: "Phiên đăng nhập đã hết hiệu lực. Hãy đăng nhập lại." });
    return next();
  }
  c.set("user", {
    userId: acc.id,
    name: acc.name,
    email: acc.email,
    avatarVersion: acc.avatarVersion,
    tokenVersion: acc.tokenVersion,
    role: resolveRole(acc),
  });
  return next();
};

/** Bắt buộc đã đăng nhập */
export function requireUser(c: Context<AppEnv>): AuthUser {
  const user = c.get("user");
  if (user) return user;
  const problem = c.get("authProblem");
  if (problem) return fail(401, problem.code, problem.message);
  return fail(401, "unauthenticated", "Bạn cần đăng nhập.");
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
