"use server";

import { redirect } from "next/navigation";
import { createSession, deleteSession } from "@/lib/session";
import { createUser, findUserByEmail, verifyPassword } from "@/modules/users/user.service";
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

  if (await findUserByEmail(email)) return { error: "Email này đã được đăng ký.", name, email };

  const user = await createUser({ name, email, password });
  await createSession({ userId: user.id, name: user.name, tv: user.tokenVersion });
  redirect("/groups");
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Vui lòng nhập email và mật khẩu.", email };

  const user = await findUserByEmail(email);
  if (!user || !(await verifyPassword(user, password))) {
    return { error: "Email hoặc mật khẩu không đúng.", email };
  }

  await createSession({ userId: String(user._id), name: user.name, tv: user.tokenVersion ?? 0 });
  redirect("/groups");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}
