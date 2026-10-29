"use client";

import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useActionState } from "react";
import { PasswordInput } from "@check-attendance/ui/password-input";
import { SubmitButton } from "@check-attendance/ui/submit-button";
import { loginAction } from "@/modules/auth.actions";

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action] = useActionState(loginAction, undefined);
  return (
    <form action={action} key={state?.error ?? "login"}>
      <Stack spacing={2}>
        {next && <input type="hidden" name="next" value={next} />}
        {state?.error ? <Alert severity="error">{state.error}</Alert> : notice && <Alert severity="warning">{notice}</Alert>}
        <TextField
          id="email"
          name="email"
          type="email"
          label="Email"
          required
          autoComplete="email"
          defaultValue={state?.email ?? ""}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <PasswordInput id="password" name="password" label="Mật khẩu" required autoComplete="current-password" fixedLabel />
        <SubmitButton fullWidth size="large" pendingText="Đang đăng nhập...">
          Đăng nhập
        </SubmitButton>
      </Stack>
    </form>
  );
}
