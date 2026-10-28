"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseDateInput } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { getOwnedGroup } from "@/modules/groups/group.service";
import { listMembers } from "@/modules/members/member.service";
import {
  createAttendanceSession,
  deleteAttendanceSession,
  getAttendanceSession,
  saveSessionRecords,
} from "./attendance.service";
import { DEFAULT_STATUS, isAttendanceStatus } from "./attendance.statuses";

export async function createSessionAction(formData: FormData) {
  const user = await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const date = parseDateInput(String(formData.get("date") ?? ""));
  const title = String(formData.get("title") ?? "").trim() || "Buổi điểm danh";
  if (!date || !(await getOwnedGroup(groupId, user.userId))) return;

  const session = await createAttendanceSession({ groupId, title, date, createdBy: user.userId });
  redirect(`/groups/${groupId}/sessions/${session.id}`);
}

/** Lấy buổi điểm danh, chỉ khi nó thuộc nhóm của người dùng hiện tại. */
async function getOwnedSession(sessionId: string, userId: string) {
  const session = await getAttendanceSession(sessionId);
  if (!session) return null;
  return (await getOwnedGroup(session.groupId, userId)) ? session : null;
}

export async function saveAttendanceAction(formData: FormData) {
  const user = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  const session = await getOwnedSession(sessionId, user.userId);
  if (!session) return;

  // Chỉ nhận thành viên đang thuộc nhóm, bỏ qua mọi id lạ gửi lên.
  const members = await listMembers(session.groupId);
  const entries = members.map((m) => {
    const raw = formData.get(`status_${m.id}`);
    return {
      memberId: m.id,
      status: isAttendanceStatus(raw) ? raw : DEFAULT_STATUS,
      note: String(formData.get(`note_${m.id}`) ?? "").trim(),
    };
  });

  await saveSessionRecords(sessionId, user.userId, entries);
  revalidatePath(`/groups/${session.groupId}`);
  redirect(`/groups/${session.groupId}/sessions/${sessionId}?saved=1`);
}

export async function deleteSessionAction(formData: FormData) {
  const user = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  const session = await getOwnedSession(sessionId, user.userId);
  if (!session) return;

  await deleteAttendanceSession(sessionId);
  revalidatePath(`/groups/${session.groupId}`);
  redirect(`/groups/${session.groupId}`);
}
