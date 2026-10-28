import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/components/auth-forms";
import { safeNext } from "@/lib/url";

export const metadata = { title: "Đăng ký · Điểm danh" };

type Props = { searchParams: Promise<{ next?: string }> };

export default async function Page({ searchParams }: Props) {
  const { next } = await searchParams;
  const target = next ? safeNext(next, "") : "";
  return (
    <AuthShell
      title="Tạo tài khoản"
      subtitle={target ? "Đăng nhập hoặc tạo tài khoản để tiếp tục." : "Miễn phí, chỉ mất vài giây."}
    >
      <RegisterForm next={target || undefined} />
    </AuthShell>
  );
}
