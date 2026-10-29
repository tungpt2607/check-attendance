import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { AuthShell } from "@check-attendance/ui/auth-shell";
import { ResetPasswordForm } from "@/components/auth-forms";
import { AppLink, LinkButton } from "@check-attendance/ui/links";
import { api, ApiError, enc } from "@/lib/api";

export const dynamic = "force-dynamic";
export const metadata = { title: "Đặt lại mật khẩu · Điểm danh" };

type Props = { params: Promise<{ token: string }> };

export default async function Page({ params }: Props) {
  const { token } = await params;
  let email: string | null = null;
  try {
    email = (await api<{ email: string }>(`/v1/auth/password-reset/${enc(token)}`, { auth: false })).email;
  } catch (err) {
    if (!(err instanceof ApiError) || err.status >= 500) throw err;
  }

  if (!email) {
    return (
      <AuthShell title="Link không còn hiệu lực" subtitle="Link đặt lại mật khẩu đã hết hạn (sau 30 phút) hoặc đã được dùng.">
        <Stack spacing={2}>
          <LinkButton href="/forgot-password" variant="contained" fullWidth size="large">
            Gửi lại link mới
          </LinkButton>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Nhớ mật khẩu rồi? <AppLink href="/login" fontWeight={600}>Đăng nhập</AppLink>
          </Typography>
        </Stack>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Đặt mật khẩu mới" subtitle={`Tài khoản: ${email}`}>
      <ResetPasswordForm token={token} email={email} />
    </AuthShell>
  );
}
