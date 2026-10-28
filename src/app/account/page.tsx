import Link from "next/link";
import { AvatarForm, NameForm, PasswordForm } from "@/components/account-forms";
import { SubmitButton } from "@/components/submit-button";
import { ui } from "@/components/ui";
import { requireUser } from "@/lib/session";
import { logoutAction } from "@/modules/auth/auth.actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tài khoản · Điểm danh" };

export default async function AccountPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href="/groups" className="text-sm text-slate-500 hover:text-brand-600">← Nhóm của tôi</Link>
        <h1 className="mt-2 text-2xl font-semibold">Tài khoản của tôi</h1>
        <p className={ui.muted}>{user.email}</p>
      </div>

      <section className={ui.card}>
        <h2 className={`${ui.h2} mb-3`}>Ảnh đại diện</h2>
        <AvatarForm userId={user.userId} name={user.name} version={user.avatarVersion} />
      </section>

      <section className={ui.card}>
        <NameForm name={user.name} />
      </section>

      <section className={ui.card}>
        <h2 className={`${ui.h2} mb-3`}>Đổi mật khẩu</h2>
        <PasswordForm />
      </section>

      <form action={logoutAction}>
        <SubmitButton variant="ghost" className="w-full" pendingText="Đang đăng xuất...">Đăng xuất</SubmitButton>
      </form>
    </div>
  );
}
