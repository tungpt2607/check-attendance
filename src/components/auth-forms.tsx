"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction } from "@/modules/auth/auth.actions";
import type { AuthFormState } from "@/modules/auth/auth.types";
import { SubmitButton } from "./submit-button";
import { ui } from "./ui";

function ErrorBox({ state }: { state: AuthFormState }) {
  if (!state?.error) return null;
  return <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p>;
}

export function LoginForm() {
  const [state, action] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <ErrorBox state={state} />
      <div>
        <label className={ui.label} htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={ui.input} />
      </div>
      <div>
        <label className={ui.label} htmlFor="password">Mật khẩu</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className={ui.input} />
      </div>
      <SubmitButton className="w-full" pendingText="Đang đăng nhập...">Đăng nhập</SubmitButton>
      <p className="text-center text-sm text-slate-600">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="font-medium text-indigo-600 hover:underline">Đăng ký</Link>
      </p>
    </form>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState(registerAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <ErrorBox state={state} />
      <div>
        <label className={ui.label} htmlFor="name">Họ tên</label>
        <input id="name" name="name" required autoComplete="name" className={ui.input} />
      </div>
      <div>
        <label className={ui.label} htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" className={ui.input} />
      </div>
      <div>
        <label className={ui.label} htmlFor="password">Mật khẩu</label>
        <input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" className={ui.input} />
      </div>
      <div>
        <label className={ui.label} htmlFor="confirm">Nhập lại mật khẩu</label>
        <input id="confirm" name="confirm" type="password" required minLength={6} autoComplete="new-password" className={ui.input} />
      </div>
      <SubmitButton className="w-full" pendingText="Đang tạo tài khoản...">Đăng ký</SubmitButton>
      <p className="text-center text-sm text-slate-600">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-medium text-indigo-600 hover:underline">Đăng nhập</Link>
      </p>
    </form>
  );
}
