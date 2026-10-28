"use server";

import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { deleteSession, setSessionCookie } from "@/lib/session";
import { safeNext } from "@/lib/url";
import type { AuthFormState } from "./auth.types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!name) return { error: "Vui lòng nhập họ tên.", name, email };
  if (!EMAIL_RE.test(email)) return { error: "Email không hợp lệ.", name, email };
  if (password.length < 6) return { error: "Mật khẩu phải có ít nhất 6 ký tự.", name, email };
  if (password !== confirm) return { error: "Mật khẩu nhập lại không khớp.", name, email };

  try {
    const { token } = await api<{ token: string }>("/v1/auth/register", {
      method: "POST",
      body: { name, email, password },
      auth: false,
    });
    await setSessionCookie(token);
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message, name, email };
    throw err;
  }
  redirect(safeNext(formData.get("next")));
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Vui lòng nhập email và mật khẩu.", email };

  try {
    const { token } = await api<{ token: string }>("/v1/auth/login", { method: "POST", body: { email, password }, auth: false });
    await setSessionCookie(token);
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
