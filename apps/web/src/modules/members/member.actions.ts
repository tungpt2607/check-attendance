"use server";

// Thành viên: gọi backend API (API kiểm tra quyền chủ nhóm).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiAction, apiActionOk, enc } from "@/lib/api";
import { requireUser } from "@/lib/session";

export async function addMembersAction(formData: FormData) {
  await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const text = String(formData.get("members") ?? "");
  if (!groupId || !text.trim()) return;

  if (!(await apiActionOk(`/v1/groups/${enc(groupId)}/members`, { method: "POST", body: { text } }))) return;
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
}

export async function updateMemberAction(formData: FormData) {
  await requireUser();
  const memberId = String(formData.get("memberId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "");
  if (!memberId || !name) return;

  const groupId = (await apiAction<{ groupId: string }>(`/v1/members/${enc(memberId)}`, { method: "PATCH", body: { name, code } }))?.groupId;
  if (!groupId) return;
  revalidatePath(`/groups/${groupId}`, "layout");
}

export async function deleteMemberAction(formData: FormData) {
  await requireUser();
  const memberId = String(formData.get("memberId") ?? "");
  if (!memberId) return;

  const groupId = (await apiAction<{ groupId: string }>(`/v1/members/${enc(memberId)}`))?.groupId;
  if (!groupId || !(await apiActionOk(`/v1/members/${enc(memberId)}`, { method: "DELETE" }))) return;
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
  // Xóa từ trang thống kê của chính thành viên: quay về danh sách thành viên của nhóm
  if (formData.get("back") === "group") redirect(`/groups/${groupId}?tab=members`);
}

/** Xóa khuôn mặt lưu riêng cho thành viên (dùng khi điểm danh bằng khuôn mặt) */
export async function deleteMemberFaceAction(formData: FormData) {
  await requireUser();
  const memberId = String(formData.get("memberId") ?? "");
  const groupId = String(formData.get("groupId") ?? "");
  if (!memberId) return;
  if (!(await apiActionOk(`/v1/members/${enc(memberId)}/face`, { method: "DELETE" }))) return;
  if (groupId) revalidatePath(`/groups/${groupId}/members/${memberId}`);
}
