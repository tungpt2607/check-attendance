"use client";

import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useActionState } from "react";
import Box from "@mui/material/Box";
import { forgotPasswordAction, loginAction, registerAction, resetPasswordAction } from "@/modules/auth/auth.actions";
import { AppLink } from "@check-attendance/ui/links";
import { PasswordInput } from "@check-attendance/ui/password-input";
import { SubmitButton } from "@check-attendance/ui/submit-button";

type LoginProps = {
  next?: string;
  notice?: string;
  defaultEmail?: string;
  /** Máy chủ đã bật gửi email: hiện link "Quên mật khẩu?" */
  canResetPassword?: boolean;
};

/**
 * Ô nhập ở trang đăng nhập/đăng ký/quên mật khẩu: nhãn luôn nằm trên viền.
 * Safari tự điền email/mật khẩu làm nhãn nổi lệch với viền (viền hở mà nhãn vẫn nằm giữa ô).
 */
const FIXED_LABEL = { inputLabel: { shrink: true } } as const;

export function LoginForm({ next, notice, defaultEmail, canResetPassword }: LoginProps) {
  const [state, action] = useActionState(loginAction, undefined);
  return (
    // key: dựng lại form để giữ email đã gõ khi đăng nhập lỗi
    <form action={action} key={state?.error ?? "login"}>
      <Stack spacing={2}>
      {next && <input type="hidden" name="next" value={next} />}
      {state?.error ? <Alert severity="error">{state.error}</Alert> : notice && <Alert severity="success">{notice}</Alert>}
      <TextField
        id="email"
        name="email"
        type="email"
        label="Email"
        required
        autoComplete="email"
        defaultValue={state?.email ?? defaultEmail ?? ""}
        slotProps={FIXED_LABEL}
      />
      <PasswordInput id="password" name="password" label="Mật khẩu" required autoComplete="current-password" fixedLabel />
      {canResetPassword && (
        <Box sx={{ textAlign: "right", mt: "8px !important" }}>
          <AppLink href="/forgot-password" variant="body2" fontWeight={500}>
            Quên mật khẩu?
          </AppLink>
        </Box>
      )}
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
      <TextField id="name" name="name" label="Họ tên" required autoComplete="name" defaultValue={state?.name ?? ""} slotProps={FIXED_LABEL} />
      <TextField
        id="email"
        name="email"
        type="email"
        label="Email"
        required
        autoComplete="email"
        defaultValue={state?.email ?? ""}
        slotProps={FIXED_LABEL}
      />
      <PasswordInput id="password" name="password" label="Mật khẩu" required minLength={6} autoComplete="new-password" fixedLabel />
      <PasswordInput id="confirm" name="confirm" label="Nhập lại mật khẩu" required minLength={6} autoComplete="new-password" fixedLabel />
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

export function ForgotPasswordForm() {
  const [state, action] = useActionState(forgotPasswordAction, undefined);
  if (state?.sent) {
    return (
      <Stack spacing={2}>
        <Alert severity="success">
          Nếu <b>{state.email}</b> đã đăng ký tài khoản, chúng tôi đã gửi link đặt lại mật khẩu tới email này. Link hết hạn sau 30 phút.
        </Alert>
        <Typography variant="body2" color="text.secondary">
          Không thấy email? Kiểm tra thư mục <b>Spam</b> hoặc <b>Quảng cáo</b>, đợi vài phút rồi thử gửi lại.
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          <AppLink href="/login" fontWeight={600}>Quay lại đăng nhập</AppLink>
        </Typography>
      </Stack>
    );
  }
  return (
    <form action={action} key={state?.error ?? "forgot"}>
      <Stack spacing={2}>
        {state?.error && <Alert severity="error">{state.error}</Alert>}
        <TextField
          id="email"
          name="email"
          type="email"
          label="Email"
          required
          autoComplete="email"
          defaultValue={state?.email ?? ""}
          slotProps={FIXED_LABEL}
        />
        <SubmitButton fullWidth size="large" pendingText="Đang gửi...">
          Gửi link đặt lại mật khẩu
        </SubmitButton>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Nhớ ra rồi? <AppLink href="/login" fontWeight={600}>Đăng nhập</AppLink>
        </Typography>
      </Stack>
    </form>
  );
}

export function ResetPasswordForm({ token, email }: { token: string; email: string }) {
  const [state, action] = useActionState(resetPasswordAction, undefined);
  return (
    <form action={action}>
      <Stack spacing={2}>
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="email" value={email} />
        {/* Giúp trình quản lý mật khẩu lưu đúng tài khoản */}
        <input type="text" name="username" value={email} autoComplete="username" readOnly hidden />
        {state?.error && <Alert severity="error">{state.error}</Alert>}
        <PasswordInput id="password" name="password" label="Mật khẩu mới" required minLength={6} autoComplete="new-password" fixedLabel />
        <PasswordInput id="confirm" name="confirm" label="Nhập lại mật khẩu mới" required minLength={6} autoComplete="new-password" fixedLabel />
        <SubmitButton fullWidth size="large" pendingText="Đang lưu...">
          Đặt mật khẩu mới
        </SubmitButton>
      </Stack>
    </form>
  );
}
