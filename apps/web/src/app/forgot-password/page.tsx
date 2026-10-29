import Alert from "@mui/material/Alert";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { AuthShell } from "@check-attendance/ui/auth-shell";
import { ForgotPasswordForm } from "@/components/auth-forms";
import { AppLink } from "@check-attendance/ui/links";
import { getFeatures } from "@/lib/features";

export const dynamic = "force-dynamic";
export const metadata = { title: "Quên mật khẩu · Điểm danh" };

export default async function Page() {
  const { email } = await getFeatures();
  return (
    <AuthShell title="Quên mật khẩu" subtitle="Nhập email đã đăng ký, chúng tôi sẽ gửi link để đặt mật khẩu mới.">
      {email ? (
        <ForgotPasswordForm />
      ) : (
        // Máy chủ chưa cấu hình gửi email (mở thẳng địa chỉ trang khi link đã ẩn)
        <Stack spacing={2}>
          <Alert severity="info">Chức năng quên mật khẩu tạm thời chưa dùng được. Vui lòng liên hệ quản trị viên.</Alert>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            <AppLink href="/login" fontWeight={600}>Quay lại đăng nhập</AppLink>
          </Typography>
        </Stack>
      )}
    </AuthShell>
  );
}
