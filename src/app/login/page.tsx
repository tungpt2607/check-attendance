import { LoginForm } from "@/components/auth-forms";
import { Logo } from "@/components/logo";
import { ui } from "@/components/ui";

export const metadata = { title: "Đăng nhập · Điểm danh" };

export default function LoginPage() {
  return (
    <div className="mx-auto mt-6 max-w-sm">
      <Logo size={56} className="mb-4" />
      <h1 className="mb-1 text-2xl font-semibold">Đăng nhập</h1>
      <p className={`${ui.muted} mb-6`}>Quản lý nhóm và điểm danh thành viên.</p>
      <div className={ui.card}>
        <LoginForm />
      </div>
    </div>
  );
}
