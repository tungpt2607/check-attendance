import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/auth-forms";

export const metadata = { title: "Quên mật khẩu · Điểm danh" };

export default function Page() {
  return (
    <AuthShell title="Quên mật khẩu" subtitle="Nhập email đã đăng ký, chúng tôi sẽ gửi link để đặt mật khẩu mới.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
