"use server";

// Thao tác với nhóm: gọi backend API (API kiểm tra quyền chủ nhóm).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { fetchGroup } from "./group.api";

/** Lỗi nghiệp vụ (nhóm không tồn tại, tên trống...) thì bỏ qua như trước; lỗi khác ném tiếp */
function ignoreApiError(err: unknown) {
  if (!(err instanceof ApiError) || err.status >= 500) throw err;
}

export async function createGroupAction(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "") || null;
  if (!name) return;

  try {
    await api("/v1/groups", { method: "POST", body: { name, parentId } });
  } catch (err) {
    return ignoreApiError(err);
  }
  revalidatePath("/groups");
  if (parentId) revalidatePath(`/groups/${parentId}`);
}

export async function renameGroupAction(formData: FormData) {
  await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name || !groupId) return;

  try {
    await api(`/v1/groups/${encodeURIComponent(groupId)}`, { method: "PATCH", body: { name } });
  } catch (err) {
    return ignoreApiError(err);
  }
  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
}

export async function deleteGroupAction(formData: FormData) {
  await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const group = groupId ? await fetchGroup(groupId) : null;
  if (!group) return;

  try {
    await api(`/v1/groups/${encodeURIComponent(group.id)}`, { method: "DELETE" });
  } catch (err) {
    return ignoreApiError(err);
  }
  revalidatePath("/groups");
  redirect(group.parentId ? `/groups/${group.parentId}` : "/groups");
}
