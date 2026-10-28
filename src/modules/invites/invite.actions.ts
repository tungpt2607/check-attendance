"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getOwnedGroup } from "@/modules/groups/group.service";
import { getMember } from "@/modules/members/member.service";
import {
  approveRequest,
  cancelPendingRequest,
  checkInvite,
  createGroupInvite,
  createLinkRequest,
  createMemberInvite,
  disableGroupInvite,
  getLinkRequest,
  linkMember,
  markInviteUsed,
  rejectRequest,
  unlinkMember,
} from "./invite.service";

import { buildShareLink, type ShareLink } from "./share";

export type ShareLinkResult = { ok: true; link: ShareLink } | { ok: false; error: string };

/** Thành viên thuộc nhóm do người dùng hiện tại quản lý */
async function getOwnedMember(memberId: string, userId: string) {
  const member = await getMember(memberId);
  if (!member) return null;
  return (await getOwnedGroup(member.groupId, userId)) ? member : null;
}


// ---------- A. Link mời riêng ----------

export async function createMemberInviteAction(memberId: string): Promise<ShareLinkResult> {
  const user = await requireUser();
  const member = await getOwnedMember(memberId, user.userId);
  if (!member) return { ok: false, error: "Không tìm thấy thành viên." };
  if (member.linkedUserId) return { ok: false, error: "Thành viên này đã liên kết tài khoản." };

  const { token, expiresAt } = await createMemberInvite(member.groupId, member.id, user.userId);
  return { ok: true, link: await buildShareLink(`/invite/${token}`, expiresAt) };
}

/** Người được mời xác nhận "Đúng, đây là tôi" */
export async function acceptInviteAction(formData: FormData) {
  const user = await requireUser();
  const token = String(formData.get("token") ?? "");
  const check = await checkInvite(token, "member");
  if (!check.ok || !check.invite.memberId) redirect(`/invite/${token}`);

  const result = await linkMember(String(check.invite.memberId), user.userId);
  if (result === "ok") {
    await markInviteUsed(check.invite._id, user.userId);
    revalidatePath(`/groups/${check.invite.groupId}`);
    redirect(`/me/${check.invite.memberId}?linked=1`);
  }
  redirect(`/invite/${token}?error=${result}`);
}

export async function unlinkMemberAction(formData: FormData) {
  const user = await requireUser();
  const memberId = String(formData.get("memberId") ?? "");
  const member = await getOwnedMember(memberId, user.userId);
  if (!member) return;
  await unlinkMember(memberId);
  revalidatePath(`/groups/${member.groupId}`);
}

// ---------- B. Link chung + duyệt ----------

/** Bật link chung hoặc tạo link mới thay link cũ */
export async function createGroupInviteAction(groupId: string): Promise<ShareLinkResult> {
  const user = await requireUser();
  if (!(await getOwnedGroup(groupId, user.userId))) return { ok: false, error: "Không tìm thấy nhóm." };
  const token = await createGroupInvite(groupId, user.userId);
  revalidatePath(`/groups/${groupId}`);
  return { ok: true, link: await buildShareLink(`/join/${token}`, null) };
}

export async function disableGroupInviteAction(groupId: string): Promise<void> {
  const user = await requireUser();
  if (!(await getOwnedGroup(groupId, user.userId))) return;
  await disableGroupInvite(groupId);
  revalidatePath(`/groups/${groupId}`);
}

/** Người mở link chung chọn tên mình và gửi yêu cầu */
export async function requestLinkAction(formData: FormData) {
  const user = await requireUser();
  const token = String(formData.get("token") ?? "");
  const memberId = String(formData.get("memberId") ?? "");
  const check = await checkInvite(token, "group");
  if (!check.ok) redirect(`/join/${token}`);

  const result = await createLinkRequest(String(check.invite.groupId), memberId, user.userId);
  revalidatePath(`/groups/${check.invite.groupId}`);
  redirect(`/join/${token}${result === "ok" ? "" : `?error=${result}`}`);
}

export async function cancelLinkRequestAction(formData: FormData) {
  const user = await requireUser();
  const token = String(formData.get("token") ?? "");
  const check = await checkInvite(token, "group");
  if (check.ok) {
    await cancelPendingRequest(String(check.invite.groupId), user.userId);
    revalidatePath(`/groups/${check.invite.groupId}`);
  }
  redirect(`/join/${token}`);
}

/** Chủ nhóm duyệt yêu cầu */
async function getOwnedRequest(requestId: string, userId: string) {
  const req = await getLinkRequest(requestId);
  if (!req || req.status !== "pending") return null;
  return (await getOwnedGroup(String(req.groupId), userId)) ? req : null;
}

export async function approveRequestAction(formData: FormData) {
  const user = await requireUser();
  const req = await getOwnedRequest(String(formData.get("requestId") ?? ""), user.userId);
  if (!req) return;
  await approveRequest(req);
  revalidatePath(`/groups/${req.groupId}`);
}

export async function rejectRequestAction(formData: FormData) {
  const user = await requireUser();
  const req = await getOwnedRequest(String(formData.get("requestId") ?? ""), user.userId);
  if (!req) return;
  await rejectRequest(String(req._id));
  revalidatePath(`/groups/${req.groupId}`);
}
