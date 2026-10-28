"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { toDataURL } from "qrcode";
import { createCheckInToken, currentWindowEndsAt, encodeShortCode } from "@/lib/checkin-token";
import { parseDateInput } from "@/lib/format";
import { requireUser } from "@/lib/session";
import { getOwnedGroup } from "@/modules/groups/group.service";
import { listMembers } from "@/modules/members/member.service";
import {
  closeSelfCheckIn,
  countCheckedIn,
  createAttendanceSession,
  deleteAttendanceSession,
  getAttendanceSession,
  getCheckInSecret,
  openSelfCheckIn,
  saveSessionRecords,
  updateAttendanceSession,
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
  // Chỉ lưu những dòng chủ nhóm thực sự thay đổi so với lúc mở trang, để không ghi đè
  // người vừa tự điểm danh bằng QR trong lúc trang đang mở.
  const members = await listMembers(session.groupId);
  const entries = members
    .map((m) => {
      const raw = formData.get(`status_${m.id}`);
      return {
        memberId: m.id,
        status: isAttendanceStatus(raw) ? raw : DEFAULT_STATUS,
        note: String(formData.get(`note_${m.id}`) ?? "").trim(),
        origStatus: String(formData.get(`orig_status_${m.id}`) ?? ""),
        origNote: String(formData.get(`orig_note_${m.id}`) ?? "").trim(),
      };
    })
    .filter((e) => e.status !== e.origStatus || e.note !== e.origNote)
    .map(({ memberId, status, note }) => ({ memberId, status, note }));

  await saveSessionRecords(sessionId, user.userId, entries);
  revalidatePath(`/groups/${session.groupId}`);
  redirect(`/groups/${session.groupId}/sessions/${sessionId}?saved=1`);
}

export async function updateSessionAction(formData: FormData) {
  const user = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const date = parseDateInput(String(formData.get("date") ?? ""));
  const session = await getOwnedSession(sessionId, user.userId);
  if (!session || !title || !date) return;

  await updateAttendanceSession(sessionId, { title, date });
  revalidatePath(`/groups/${session.groupId}`);
  revalidatePath(`/groups/${session.groupId}/sessions/${sessionId}`);
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

export async function openSelfCheckInAction(formData: FormData) {
  const user = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  const session = await getOwnedSession(sessionId, user.userId);
  if (!session) return;

  const members = await listMembers(session.groupId);
  await openSelfCheckIn(sessionId, members.map((m) => m.id), user.userId);
  revalidatePath(`/groups/${session.groupId}`);
  redirect(`/groups/${session.groupId}/sessions/${sessionId}/qr`);
}

export async function closeSelfCheckInAction(formData: FormData) {
  const user = await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  const session = await getOwnedSession(sessionId, user.userId);
  if (!session) return;

  await closeSelfCheckIn(sessionId);
  revalidatePath(`/groups/${session.groupId}`);
  redirect(`/groups/${session.groupId}/sessions/${sessionId}`);
}

export type QrState =
  | {
      open: true;
      qrDataUrl: string;
      url: string;
      checkedIn: number;
      total: number;
      /** Thời điểm mã hiện tại đổi (ms, theo giờ máy chủ) */
      windowEndsAt: number;
      /** Giờ máy chủ lúc trả kết quả (ms), để bù lệch đồng hồ điện thoại */
      serverNow: number;
    }
  | { open: false };

/** Màn hình trình chiếu gọi định kỳ để lấy mã QR mới nhất và số người đã điểm danh. */
export async function getQrStateAction(sessionId: string): Promise<QrState> {
  const user = await requireUser();
  const session = await getOwnedSession(sessionId, user.userId);
  if (!session) return { open: false };
  const secret = await getCheckInSecret(sessionId);
  if (!secret) return { open: false };

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const url = `${proto}://${host}/c/${encodeShortCode(sessionId, createCheckInToken(sessionId, secret))}`;

  const [qrDataUrl, checkedIn, members] = await Promise.all([
    toDataURL(url, { margin: 2, width: 640, errorCorrectionLevel: "L" }),
    countCheckedIn(sessionId),
    listMembers(session.groupId),
  ]);
  return {
    open: true,
    qrDataUrl,
    url,
    checkedIn,
    total: members.length,
    windowEndsAt: currentWindowEndsAt(),
    serverNow: Date.now(),
  };
}
