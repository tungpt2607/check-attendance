"use server";

// Người quản lý nhóm: gọi backend API (API kiểm tra quyền chủ nhóm).
// Các thao tác trong hộp thoại trả về { ok } / { ok: false, error } để hiện câu báo lỗi ngay trong hộp thoại.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ShareLink } from "@check-attendance/shared/api";
import type { GroupPermission } from "@check-attendance/shared/permissions";
import { api, ApiError, enc } from "@/lib/api";
import { requireUser } from "@/lib/session";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type InviteResult = { ok: true; link: ShareLink } | { ok: false; error: string };

/** Lỗi API thì trả câu báo lỗi; lỗi khác ném tiếp */
function failed(err: unknown): { ok: false; error: string } {
  if (err instanceof ApiError) return { ok: false, error: err.message };
  throw err;
}

function refresh(groupId: string) {
  revalidatePath(`/groups/${groupId}/managers`);
  revalidatePath("/groups", "layout");
}

export async function addManagerAction(groupId: string, email: string, permissions: GroupPermission[]): Promise<ActionResult> {
  await requireUser();
  try {
    await api(`/v1/groups/${enc(groupId)}/managers`, { method: "POST", body: { email, permissions } });
  } catch (err) {
    return failed(err);
  }
  refresh(groupId);
  return { ok: true };
}

export async function updateManagerAction(groupId: string, userId: string, permissions: GroupPermission[]): Promise<ActionResult> {
  await requireUser();
  try {
    await api(`/v1/groups/${enc(groupId)}/managers/${enc(userId)}`, { method: "PATCH", body: { permissions } });
  } catch (err) {
    return failed(err);
  }
  refresh(groupId);
  return { ok: true };
}

/** Gỡ người quản lý (hoặc tự rời: userId là chính mình → về danh sách nhóm) */
export async function removeManagerAction(groupId: string, userId: string, self: boolean): Promise<ActionResult> {
  await requireUser();
  try {
    await api(`/v1/groups/${enc(groupId)}/managers/${enc(userId)}`, { method: "DELETE" });
  } catch (err) {
    return failed(err);
  }
  refresh(groupId);
  if (self) redirect("/groups");
  return { ok: true };
}

export async function createManagerInviteAction(groupId: string, permissions: GroupPermission[]): Promise<InviteResult> {
  await requireUser();
  try {
    const { link } = await api<{ link: ShareLink }>(`/v1/groups/${enc(groupId)}/manager-invite`, { method: "POST", body: { permissions } });
    return { ok: true, link };
  } catch (err) {
    return failed(err);
  }
}

export async function transferOwnerAction(groupId: string, email: string): Promise<ActionResult> {
  await requireUser();
  try {
    await api(`/v1/groups/${enc(groupId)}/transfer`, { method: "POST", body: { email } });
  } catch (err) {
    return failed(err);
  }
  refresh(groupId);
  revalidatePath(`/groups/${groupId}`);
  return { ok: true };
}

/** Nhận lời mời làm quản lý (trang /manage/[token]) */
export async function acceptManagerInviteAction(formData: FormData) {
  await requireUser();
  const token = String(formData.get("token") ?? "");
  let groupId: string;
  try {
    groupId = (await api<{ groupId: string }>(`/v1/manager-invites/${enc(token)}/accept`, { method: "POST" })).groupId;
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) redirect(`/manage/${token}?error=${encodeURIComponent(err.message)}`);
    throw err;
  }
  revalidatePath("/groups", "layout");
  redirect(`/groups/${groupId}`);
}
