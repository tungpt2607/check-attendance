"use server";

import { redirect } from "next/navigation";
import type { AuthResult } from "@check-attendance/shared/api";
import { api, ApiError } from "@/lib/api";
import { deleteSession, setSessionCookie } from "@/lib/session";

export type LoginState = { error?: string; email?: string } | undefined;

/** Chỉ nhận đường dẫn nội bộ cho ?next= */
function safeNext(v: FormDataEntryValue | null): string {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Vui lòng nhập email và mật khẩu.", email };
  try {
    const res = await api<AuthResult>("/v1/auth/login", { method: "POST", body: { email, password }, auth: false });
    if (res.user.role !== "admin") return { error: "Tài khoản này không có quyền quản trị.", email };
    await setSessionCookie(res.token);
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message, email };
    throw err;
  }
  redirect(safeNext(formData.get("next")));
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}
