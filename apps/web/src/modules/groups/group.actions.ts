"use server";

// Thao tác với nhóm: gọi backend API (API kiểm tra quyền chủ nhóm).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { apiActionOk } from "@/lib/api";
import { requireUser } from "@/lib/session";
import { fetchGroup } from "./group.api";

export async function createGroupAction(formData: FormData) {
  await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "") || null;
  if (!name) return;

  if (!(await apiActionOk("/v1/groups", { method: "POST", body: { name, parentId } }))) return;
  revalidatePath("/groups");
  if (parentId) revalidatePath(`/groups/${parentId}`);
}

export async function renameGroupAction(formData: FormData) {
  await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name || !groupId) return;

  if (!(await apiActionOk(`/v1/groups/${encodeURIComponent(groupId)}`, { method: "PATCH", body: { name } }))) return;
  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
}

export async function deleteGroupAction(formData: FormData) {
  await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const group = groupId ? await fetchGroup(groupId) : null;
  if (!group) return;

  if (!(await apiActionOk(`/v1/groups/${encodeURIComponent(group.id)}`, { method: "DELETE" }))) return;
  revalidatePath("/groups");
  redirect(group.parentId ? `/groups/${group.parentId}` : "/groups");
}
