import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/auth-forms";

export const metadata = { title: "Đăng nhập · Điểm danh" };

export default function LoginPage() {
  return (
    <AuthShell title="Đăng nhập" subtitle="Quản lý nhóm và điểm danh thành viên.">
      <LoginForm />
    </AuthShell>
  );
}
