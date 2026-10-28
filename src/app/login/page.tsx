import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/auth-forms";
import { safeNext } from "@/lib/url";

export const metadata = { title: "Đăng nhập · Điểm danh" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function Page({ searchParams }: Props) {
  const { next } = await searchParams;
  const target = next ? safeNext(next, "") : "";
  return (
    <AuthShell
      title="Đăng nhập"
      subtitle={target ? "Đăng nhập hoặc tạo tài khoản để tiếp tục." : "Quản lý nhóm và điểm danh thành viên."}
    >
      <LoginForm next={target || undefined} />
    </AuthShell>
  );
}
