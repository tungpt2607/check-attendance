// Quyền quản trị: role trong DB hoặc email trong biến môi trường ADMIN_EMAILS (quản trị cố định).

export function adminEmails(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Vai trò thực tế của một tài khoản: admin nếu được đánh dấu trong DB hoặc có email trong ADMIN_EMAILS.
 *  Mọi chỗ (đăng nhập, đăng ký, đổi mật khẩu, các API cần token, CMS) đều dùng hàm này. */
export function resolveRole(acc: { role?: "user" | "admin" | null; email: string }): "user" | "admin" {
  return acc.role === "admin" || adminEmails().has(acc.email.toLowerCase()) ? "admin" : "user";
}

/** Quyền đến từ đâu: env = cố định do ADMIN_EMAILS (không bỏ được trong CMS) */
export function roleSource(email: string): "db" | "env" {
  return adminEmails().has(email.toLowerCase()) ? "env" : "db";
}
