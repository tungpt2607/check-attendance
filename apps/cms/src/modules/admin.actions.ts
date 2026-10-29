"use server";

// Thao tác quản trị: gọi /v1/admin/* và trả kết quả { ok, message } cho ActionButton / form.
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@check-attendance/ui/action-button";
import type { AnnouncementRow, DeletedGroup } from "@check-attendance/shared/admin";
import { api, ApiError, enc } from "@/lib/api";
import { requireAdmin } from "@/lib/session";

async function run(fn: () => Promise<unknown>, message: string, revalidate: string[] = []): Promise<ActionResult> {
  await requireAdmin();
  try {
    await fn();
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, message: err.message };
    throw err;
  }
  for (const p of revalidate) revalidatePath(p);
  return { ok: true, message };
}

// ---------- Tài khoản ----------

export async function disableUserAction(userId: string) {
  return run(() => api(`/v1/admin/users/${enc(userId)}/disable`, { method: "POST" }), "Đã khoá tài khoản", ["/users"]);
}

export async function enableUserAction(userId: string) {
  return run(() => api(`/v1/admin/users/${enc(userId)}/enable`, { method: "POST" }), "Đã mở khoá tài khoản", ["/users"]);
}

export async function setRoleAction(userId: string, role: "user" | "admin") {
  return run(
    () => api(`/v1/admin/users/${enc(userId)}/role`, { method: "PUT", body: { role } }),
    role === "admin" ? "Đã cấp quyền quản trị" : "Đã bỏ quyền quản trị",
    ["/users"],
  );
}

export async function revokeSessionsAction(userId: string) {
  return run(() => api(`/v1/admin/users/${enc(userId)}/revoke-sessions`, { method: "POST" }), "Đã đăng xuất mọi thiết bị");
}

export async function sendPasswordResetAction(userId: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    const { sent } = await api<{ sent: boolean }>(`/v1/admin/users/${enc(userId)}/password-reset`, { method: "POST" });
    return sent
      ? { ok: true, message: "Đã gửi email đặt lại mật khẩu" }
      : { ok: false, message: "Chưa gửi được (đã gửi quá 3 lần trong 1 giờ hoặc email lỗi). Thử lại sau." };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, message: err.message };
    throw err;
  }
}

// ---------- Nhóm ----------

export async function deleteGroupAction(groupId: string): Promise<ActionResult> {
  await requireAdmin();
  try {
    const r = await api<DeletedGroup>(`/v1/admin/groups/${enc(groupId)}`, { method: "DELETE" });
    revalidatePath("/groups");
    return { ok: true, message: `Đã xoá ${r.groups} nhóm, ${r.members} thành viên, ${r.sessions} buổi`, redirectTo: "/groups" };
  } catch (err) {
    if (err instanceof ApiError) return { ok: false, message: err.message };
    throw err;
  }
}

// ---------- Thông báo hệ thống ----------

export type AnnouncementState = { ok?: string; error?: string; values?: { title: string; message: string; href: string } } | undefined;

export async function sendAnnouncementAction(_prev: AnnouncementState, formData: FormData): Promise<AnnouncementState> {
  await requireAdmin();
  const values = {
    title: String(formData.get("title") ?? "").trim(),
    message: String(formData.get("message") ?? "").trim(),
    href: String(formData.get("href") ?? "").trim(),
  };
  const email = formData.get("email") === "on";
  if (!values.title) return { error: "Vui lòng nhập tiêu đề.", values };
  try {
    const a = await api<AnnouncementRow>("/v1/admin/announcements", {
      method: "POST",
      body: { title: values.title, message: values.message || undefined, href: values.href || undefined, email },
    });
    revalidatePath("/announcements");
    return { ok: `Đã gửi tới ${a.recipientCount} tài khoản${a.email ? `, kèm ${a.emailCount} email` : ""}.` };
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message, values };
    throw err;
  }
}

// ---------- Hệ thống ----------

export type TestEmailState = { ok?: string; error?: string } | undefined;

export async function testEmailAction(_prev: TestEmailState, formData: FormData): Promise<TestEmailState> {
  await requireAdmin();
  const to = String(formData.get("to") ?? "").trim();
  try {
    const r = await api<{ sent: boolean; to: string }>("/v1/admin/system/test-email", { method: "POST", body: to ? { to } : {} });
    revalidatePath("/audit");
    return r.sent ? { ok: `Đã gửi email thử tới ${r.to}. Kiểm tra cả thư mục Spam.` } : { error: `Gửi tới ${r.to} thất bại. Kiểm tra SMTP_USER / SMTP_PASS trên Vercel.` };
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }
}
