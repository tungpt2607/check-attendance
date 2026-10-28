import Link from "next/link";
import { getSession } from "@/lib/session";
import { logoutAction } from "@/modules/auth/auth.actions";

export async function AppHeader() {
  const session = await getSession();
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href={session ? "/groups" : "/login"} className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-indigo-600 text-sm text-white">✓</span>
          Điểm danh
        </Link>
        {session && (
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-600 sm:inline">{session.name}</span>
            <form action={logoutAction}>
              <button type="submit" className="rounded-lg px-2 py-1 text-slate-600 hover:bg-slate-100">
                Đăng xuất
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
