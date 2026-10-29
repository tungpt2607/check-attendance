import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { User } from "@check-attendance/shared/api";
import { api } from "./api";
import { SESSION_COOKIE, SESSION_MAX_AGE, verifySession } from "./auth-token";

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * Quản trị viên đang đăng nhập (đối chiếu qua API mỗi lượt tải trang, dùng cache để chỉ hỏi một lần).
 * Chưa đăng nhập → /login; không còn quyền quản trị → /logout?reason=forbidden.
 */
export const requireAdmin = cache(async (): Promise<User> => {
  const payload = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!payload) redirect("/login");
  const me = await api<User>("/v1/me");
  if (me.role !== "admin") redirect("/logout?reason=forbidden");
  return me;
});

/** Địa chỉ web người dùng (link mở trang của người dùng / nhóm) */
export const WEB_URL = (process.env.NEXT_PUBLIC_WEB_URL || "https://check-attendance-pi.vercel.app").replace(/\/+$/, "");
