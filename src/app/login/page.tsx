import { LoginForm } from "@/components/auth-forms";
import { ui } from "@/components/ui";

export const metadata = { title: "Đăng nhập · Điểm danh" };

export default function LoginPage() {
  return (
    <div className="mx-auto mt-10 max-w-sm">
      <h1 className="mb-1 text-2xl font-semibold">Đăng nhập</h1>
      <p className={`${ui.muted} mb-6`}>Quản lý nhóm và điểm danh thành viên.</p>
      <div className={ui.card}>
        <LoginForm />
      </div>
    </div>
  );
}
