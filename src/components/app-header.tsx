import Link from "next/link";
import { getSession } from "@/lib/session";
import { Avatar } from "./avatar";

export async function AppHeader() {
  const user = await getSession();
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href={user ? "/groups" : "/login"} className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-indigo-600 text-sm text-white">✓</span>
          Điểm danh
        </Link>
        {user && (
          <Link
            href="/account"
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 text-sm text-slate-700 hover:bg-slate-100 sm:pr-3"
            aria-label="Tài khoản của tôi"
          >
            <Avatar userId={user.userId} name={user.name} version={user.avatarVersion} size={32} />
            <span className="hidden max-w-40 truncate sm:inline">{user.name}</span>
          </Link>
        )}
      </div>
    </header>
  );
}
