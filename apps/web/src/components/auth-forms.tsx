"use client";

import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useActionState } from "react";
import { loginAction, registerAction } from "@/modules/auth/auth.actions";
import { AppLink } from "./links";
import { PasswordInput } from "./password-input";
import { SubmitButton } from "./submit-button";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, undefined);
  return (
    // key: dựng lại form để giữ email đã gõ khi đăng nhập lỗi
    <form action={action} key={state?.error ?? "login"}>
      <Stack spacing={2}>
      {next && <input type="hidden" name="next" value={next} />}
      {state?.error && <Alert severity="error">{state.error}</Alert>}
      <TextField
        id="email"
        name="email"
        type="email"
        label="Email"
        required
        autoComplete="email"
        defaultValue={state?.email ?? ""}
      />
      <PasswordInput id="password" name="password" label="Mật khẩu" required autoComplete="current-password" />
      <SubmitButton fullWidth size="large" pendingText="Đang đăng nhập...">
        Đăng nhập
      </SubmitButton>
      <Typography variant="body2" color="text.secondary" textAlign="center">
        Chưa có tài khoản? <AppLink href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} fontWeight={600}>Đăng ký</AppLink>
      </Typography>
      </Stack>
    </form>
  );
}

export function RegisterForm({ next }: { next?: string }) {
  const [state, action] = useActionState(registerAction, undefined);
  return (
    <form action={action} key={state?.error ?? "register"}>
      <Stack spacing={2}>
      {next && <input type="hidden" name="next" value={next} />}
      {state?.error && <Alert severity="error">{state.error}</Alert>}
      <TextField id="name" name="name" label="Họ tên" required autoComplete="name" defaultValue={state?.name ?? ""} />
      <TextField
        id="email"
        name="email"
        type="email"
        label="Email"
        required
        autoComplete="email"
        defaultValue={state?.email ?? ""}
      />
      <PasswordInput id="password" name="password" label="Mật khẩu" required minLength={6} autoComplete="new-password" />
      <PasswordInput id="confirm" name="confirm" label="Nhập lại mật khẩu" required minLength={6} autoComplete="new-password" />
      <SubmitButton fullWidth size="large" pendingText="Đang tạo tài khoản...">
        Đăng ký
      </SubmitButton>
      <Typography variant="body2" color="text.secondary" textAlign="center">
        Đã có tài khoản? <AppLink href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"} fontWeight={600}>Đăng nhập</AppLink>
      </Typography>
      </Stack>
    </form>
  );
}
