import { RegisterForm } from "@/components/auth-forms";
import { ui } from "@/components/ui";

export const metadata = { title: "Đăng ký · Điểm danh" };

export default function RegisterPage() {
  return (
    <div className="mx-auto mt-10 max-w-sm">
      <h1 className="mb-1 text-2xl font-semibold">Tạo tài khoản</h1>
      <p className={`${ui.muted} mb-6`}>Miễn phí, chỉ mất vài giây.</p>
      <div className={ui.card}>
        <RegisterForm />
      </div>
    </div>
  );
}
