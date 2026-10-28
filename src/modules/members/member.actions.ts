"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/session";
import { getOwnedGroup } from "@/modules/groups/group.service";
import { addMembersFromText, deleteMember, getMember, updateMember } from "./member.service";

export async function addMembersAction(formData: FormData) {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const text = String(formData.get("members") ?? "");
  if (!(await getOwnedGroup(groupId, user.userId))) return;

  await addMembersFromText(groupId, text);
  revalidatePath(`/groups/${groupId}`);
  revalidatePath("/groups");
}

/** Kiểm tra thành viên thuộc một nhóm của người dùng hiện tại. */
async function getOwnedMember(memberId: string, userId: string) {
  const member = await getMember(memberId);
  if (!member) return null;
  return (await getOwnedGroup(member.groupId, userId)) ? member : null;
}

export async function updateMemberAction(formData: FormData) {
  const user = await requireUser();
  const memberId = String(formData.get("memberId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "");
  const member = await getOwnedMember(memberId, user.userId);
  if (!member || !name) return;

  await updateMember(memberId, { name, code });
  revalidatePath(`/groups/${member.groupId}`);
}

export async function deleteMemberAction(formData: FormData) {
  const user = await requireUser();
  const memberId = String(formData.get("memberId") ?? "");
  const member = await getOwnedMember(memberId, user.userId);
  if (!member) return;

  await deleteMember(memberId);
  revalidatePath(`/groups/${member.groupId}`);
  revalidatePath("/groups");
}
