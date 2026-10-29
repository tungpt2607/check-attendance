"use server";

// Thành viên: gọi backend API (API kiểm tra quyền chủ nhóm).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError, enc, ignoreApiError } from "@/lib/api";
import { requireUser } from "@/lib/session";

export async function addMembersAction(formData: FormData) {
  await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const text = String(formData.get("members") ?? "");
  if (!groupId || !text.trim()) return;

  try {
    await api(`/v1/groups/${enc(groupId)}/members`, { method: "POST", body: { text } });
  } catch (err) {
    return ignoreApiError(err);
  }
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
}

export async function updateMemberAction(formData: FormData) {
  await requireUser();
  const memberId = String(formData.get("memberId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "");
  if (!memberId || !name) return;

  let groupId: string;
  try {
    groupId = (await api<{ groupId: string }>(`/v1/members/${enc(memberId)}`, { method: "PATCH", body: { name, code } })).groupId;
  } catch (err) {
    return ignoreApiError(err);
  }
  revalidatePath(`/groups/${groupId}`, "layout");
}

export async function deleteMemberAction(formData: FormData) {
  await requireUser();
  const memberId = String(formData.get("memberId") ?? "");
  if (!memberId) return;

  let groupId: string;
  try {
    groupId = (await api<{ groupId: string }>(`/v1/members/${enc(memberId)}`)).groupId;
    await api(`/v1/members/${enc(memberId)}`, { method: "DELETE" });
  } catch (err) {
    return ignoreApiError(err);
  }
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
  // Xóa từ trang thống kê của chính thành viên: quay về danh sách thành viên của nhóm
  if (formData.get("back") === "group") redirect(`/groups/${groupId}?tab=members`);
}
