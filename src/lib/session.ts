import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getAccount } from "@/modules/users/user.service";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession, type SessionPayload } from "./auth-token";

export type CurrentUser = {
  userId: string;
  name: string;
  email: string;
  avatarVersion: number | null;
  tv: number;
};

export async function createSession(payload: SessionPayload) {
  const token = await signSession(payload);
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
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

type SessionCheck = { status: "none" } | { status: "invalid" } | { status: "ok"; user: CurrentUser };

/**
 * Kiểm tra phiên đăng nhập, đối chiếu với tài khoản trong database
 * (tài khoản còn tồn tại, chưa đổi mật khẩu sau khi phiên được tạo).
 * Dùng cache để mỗi lượt tải trang chỉ truy vấn một lần.
 */
const checkSession = cache(async (): Promise<SessionCheck> => {
  const store = await cookies();
  const payload = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!payload) return { status: "none" };

  const account = await getAccount(payload.userId);
  if (!account || account.tokenVersion !== payload.tv) return { status: "invalid" };

  return {
    status: "ok",
    user: {
      userId: account.id,
      name: account.name,
      email: account.email,
      avatarVersion: account.avatarVersion,
      tv: account.tokenVersion,
    },
  };
});

export async function getSession(): Promise<CurrentUser | null> {
  const result = await checkSession();
  return result.status === "ok" ? result.user : null;
}

/** Dùng trong trang/action cần đăng nhập. Chưa đăng nhập thì chuyển về /login. */
export async function requireUser(): Promise<CurrentUser> {
  const result = await checkSession();
  if (result.status === "ok") return result.user;
  // Phiên hết hiệu lực (vd. đã đổi mật khẩu ở thiết bị khác): xóa cookie rồi mới về /login,
  // nếu không middleware sẽ thấy cookie và đẩy ngược về trong.
  redirect(result.status === "invalid" ? "/logout" : "/login");
}
