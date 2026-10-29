import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin-shell";
import { requireAdmin, WEB_URL } from "@/lib/session";

/** Mọi trang quản trị: kiểm tra quyền quản trị rồi bọc khung (menu + nội dung) */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const me = await requireAdmin();
  return (
    <AdminShell user={{ id: me.id, name: me.name, email: me.email, avatarVersion: me.avatarVersion }} webUrl={WEB_URL}>
      {children}
    </AdminShell>
  );
}
