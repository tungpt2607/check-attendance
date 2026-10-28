"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { createGroup, deleteGroup, getOwnedGroup, renameGroup } from "./group.service";

export async function createGroupAction(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "") || null;
  if (!name) return;

  await createGroup({ name, parentId, ownerId: user.userId });
  revalidatePath("/groups");
  if (parentId) revalidatePath(`/groups/${parentId}`);
}

export async function renameGroupAction(formData: FormData) {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name || !(await getOwnedGroup(groupId, user.userId))) return;

  await renameGroup(groupId, user.userId, name);
  revalidatePath("/groups");
  revalidatePath(`/groups/${groupId}`);
}

export async function deleteGroupAction(formData: FormData) {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const group = await getOwnedGroup(groupId, user.userId);
  if (!group) return;

  const ok = await deleteGroup(groupId, user.userId);
  if (!ok) return;
  revalidatePath("/groups");
  redirect(group.parentId ? `/groups/${group.parentId}` : "/groups");
}
