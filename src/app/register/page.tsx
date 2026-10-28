import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/auth-forms";

export const metadata = { title: "Đăng ký · Điểm danh" };

export default function RegisterPage() {
  return (
    <AuthShell title="Tạo tài khoản" subtitle="Miễn phí, chỉ mất vài giây.">
      <RegisterForm />
    </AuthShell>
  );
}
