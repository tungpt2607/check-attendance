"use server";

// Liên kết tài khoản với thành viên: gọi backend API.
// A. Link mời riêng (chủ nhóm tạo, người nhận xác nhận) · B. Link chung (người dùng xin nhận tên, chủ nhóm duyệt)
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError, enc, ignoreApiError } from "@/lib/api";
import type { ShareLink } from "@check-attendance/shared/api";
import { requireUser } from "@/lib/session";

export type ShareLinkResult = { ok: true; link: ShareLink } | { ok: false; error: string };

/** Mã lỗi API → mã lỗi trên địa chỉ trang (?error=...) mà trang link mời / link tham gia hiểu */
function errorCode(err: unknown): string {
  if (err instanceof ApiError && err.status < 500) return err.code.replace(/^invite_/, "");
  throw err;
}

// ---------- A. Link mời riêng ----------

export async function createMemberInviteAction(memberId: string): Promise<ShareLinkResult> {
  await requireUser();
  try {
    const { link } = await api<{ link: ShareLink }>(`/v1/members/${enc(memberId)}/invite`, { method: "POST" });
    return { ok: true, link };
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) return { ok: false, error: err.message };
    throw err;
  }
}

/** Người được mời xác nhận "Đúng, đây là tôi" */
export async function acceptInviteAction(formData: FormData) {
  await requireUser();
  const token = String(formData.get("token") ?? "");
  let memberId: string;
  try {
    memberId = (await api<{ memberId: string }>(`/v1/invites/${enc(token)}/accept`, { method: "POST" })).memberId;
  } catch (err) {
    redirect(`/invite/${token}?error=${errorCode(err)}`);
  }
  revalidatePath("/groups", "layout");
  redirect(`/me/${memberId}?linked=1`);
}

export async function unlinkMemberAction(formData: FormData) {
  await requireUser();
  const memberId = String(formData.get("memberId") ?? "");
  if (!memberId) return;
  try {
    await api(`/v1/members/${enc(memberId)}/link`, { method: "DELETE" });
  } catch (err) {
    return ignoreApiError(err);
  }
  revalidatePath("/groups", "layout");
}

// ---------- B. Link chung + duyệt ----------

/** Bật link chung hoặc tạo link mới thay link cũ */
export async function createGroupInviteAction(groupId: string): Promise<ShareLinkResult> {
  await requireUser();
  try {
    const { link } = await api<{ link: ShareLink }>(`/v1/groups/${enc(groupId)}/invite`, { method: "POST" });
    revalidatePath(`/groups/${groupId}`);
    revalidatePath("/groups");
    return { ok: true, link };
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) return { ok: false, error: err.message };
    throw err;
  }
}

export async function disableGroupInviteAction(groupId: string): Promise<void> {
  await requireUser();
  try {
    await api(`/v1/groups/${enc(groupId)}/invite`, { method: "DELETE" });
  } catch (err) {
    return ignoreApiError(err);
  }
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
}

/** Người mở link chung chọn tên mình và gửi yêu cầu */
export async function requestLinkAction(formData: FormData) {
  await requireUser();
  const token = String(formData.get("token") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  try {
    await api(`/v1/join/${enc(token)}/request`, { method: "POST", body: { memberId } });
  } catch (err) {
    redirect(`/join/${token}?error=${errorCode(err)}`);
  }
  revalidatePath("/groups", "layout");
  redirect(`/join/${token}`);
}

export async function cancelLinkRequestAction(formData: FormData) {
  await requireUser();
  const token = String(formData.get("token") ?? "");
  try {
    await api(`/v1/join/${enc(token)}/request`, { method: "DELETE" });
  } catch (err) {
    ignoreApiError(err);
  }
  revalidatePath("/groups", "layout");
  redirect(`/join/${token}`);
}

/** Chủ nhóm duyệt yêu cầu */
export async function approveRequestAction(formData: FormData) {
  await requireUser();
  const requestId = String(formData.get("requestId") ?? "");
  try {
    await api(`/v1/requests/${enc(requestId)}/approve`, { method: "POST" });
  } catch (err) {
    return ignoreApiError(err);
  }
  revalidatePath("/groups", "layout");
}

export async function rejectRequestAction(formData: FormData) {
  await requireUser();
  const requestId = String(formData.get("requestId") ?? "");
  try {
    await api(`/v1/requests/${enc(requestId)}/reject`, { method: "POST" });
  } catch (err) {
    return ignoreApiError(err);
  }
  revalidatePath("/groups", "layout");
}


export type DecideResult = { ok: true } | { ok: false; error: string };

/** Duyệt / từ chối và báo lại kết quả (dùng trong chuông thông báo, nơi cần biết thao tác có thành công không) */
export async function decideRequestAction(requestId: string, approve: boolean): Promise<DecideResult> {
  await requireUser();
  try {
    await api(`/v1/requests/${enc(requestId)}/${approve ? "approve" : "reject"}`, { method: "POST" });
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) return { ok: false, error: err.message };
    throw err;
  }
  revalidatePath("/groups", "layout");
  return { ok: true };
}
