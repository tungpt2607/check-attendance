import { AuthShell } from "@check-attendance/ui/auth-shell";
import { LoginForm } from "@/components/auth-forms";
import { getFeatures } from "@/lib/features";
import { safeNext } from "@/lib/url";

export const metadata = { title: "Đăng nhập · Điểm danh" };

type Props = { searchParams: Promise<{ next?: string; reset?: string; email?: string }> };

export default async function Page({ searchParams }: Props) {
  const [{ next, reset, email }, features] = await Promise.all([searchParams, getFeatures()]);
  const target = next ? safeNext(next, "") : "";
  return (
    <AuthShell
      title="Đăng nhập"
      subtitle={target ? "Đăng nhập hoặc tạo tài khoản để tiếp tục." : "Quản lý nhóm và điểm danh thành viên."}
    >
      <LoginForm
        next={target || undefined}
        notice={reset ? "Đã đặt mật khẩu mới. Hãy đăng nhập bằng mật khẩu mới." : undefined}
        defaultEmail={email}
        canResetPassword={features.email}
      />
    </AuthShell>
  );
}
