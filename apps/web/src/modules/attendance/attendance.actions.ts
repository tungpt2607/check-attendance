"use server";

// Buổi điểm danh: gọi backend API (API kiểm tra quyền chủ nhóm).
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api, ApiError, enc, ignoreApiError } from "@/lib/api";
import type { QrState, SessionDetail } from "@check-attendance/shared/api";
import { requireUser } from "@/lib/session";
import { DEFAULT_STATUS, isAttendanceStatus } from "./attendance.statuses";

export async function createSessionAction(formData: FormData) {
  await requireUser();
  const groupId = String(formData.get("groupId") ?? "");
  const date = String(formData.get("date") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!groupId || !date) return;

  let created: { id: string };
  try {
    created = await api<{ id: string }>(`/v1/groups/${enc(groupId)}/sessions`, { method: "POST", body: { title, date } });
  } catch (err) {
    return ignoreApiError(err);
  }
  redirect(`/groups/${groupId}/sessions/${created.id}`);
}

export async function saveAttendanceAction(formData: FormData) {
  await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) return;

  // Chỉ nhận thành viên đang thuộc nhóm, bỏ qua mọi id lạ gửi lên.
  // Chỉ lưu những dòng chủ nhóm thực sự thay đổi so với lúc mở trang, để không ghi đè
  // người vừa tự điểm danh bằng QR trong lúc trang đang mở.
  let session: SessionDetail;
  try {
    session = await api<SessionDetail>(`/v1/sessions/${enc(sessionId)}`);
  } catch (err) {
    return ignoreApiError(err);
  }
  const records = session.rows
    .map((m) => {
      const raw = formData.get(`status_${m.memberId}`);
      return {
        memberId: m.memberId,
        status: isAttendanceStatus(raw) ? raw : DEFAULT_STATUS,
        note: String(formData.get(`note_${m.memberId}`) ?? "").trim(),
        origStatus: String(formData.get(`orig_status_${m.memberId}`) ?? ""),
        origNote: String(formData.get(`orig_note_${m.memberId}`) ?? "").trim(),
      };
    })
    .filter((e) => e.status !== e.origStatus || e.note !== e.origNote)
    .map(({ memberId, status, note }) => ({ memberId, status, note }));

  if (records.length > 0) {
    try {
      await api(`/v1/sessions/${enc(sessionId)}/records`, { method: "PUT", body: { records } });
    } catch (err) {
      return ignoreApiError(err);
    }
  }
  revalidatePath(`/groups/${session.groupId}`);
  revalidatePath(`/groups/${session.groupId}/sessions/${sessionId}`);
}

export async function updateSessionAction(formData: FormData) {
  await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const date = String(formData.get("date") ?? "");
  if (!sessionId || !title || !date) return;

  let updated: { groupId: string };
  try {
    updated = await api<{ groupId: string }>(`/v1/sessions/${enc(sessionId)}`, { method: "PATCH", body: { title, date } });
  } catch (err) {
    return ignoreApiError(err);
  }
  revalidatePath(`/groups/${updated.groupId}`);
  revalidatePath(`/groups/${updated.groupId}/sessions/${sessionId}`);
}

export async function deleteSessionAction(formData: FormData) {
  await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) return;

  let groupId: string;
  try {
    groupId = (await api<SessionDetail>(`/v1/sessions/${enc(sessionId)}`)).groupId;
    await api(`/v1/sessions/${enc(sessionId)}`, { method: "DELETE" });
  } catch (err) {
    return ignoreApiError(err);
  }
  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}`);
}

export async function openSelfCheckInAction(formData: FormData) {
  await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) return;

  let groupId: string;
  try {
    groupId = (await api<{ groupId: string }>(`/v1/sessions/${enc(sessionId)}/self-checkin/open`, { method: "POST" })).groupId;
  } catch (err) {
    return ignoreApiError(err);
  }
  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}/sessions/${sessionId}/qr`);
}

export async function closeSelfCheckInAction(formData: FormData) {
  await requireUser();
  const sessionId = String(formData.get("sessionId") ?? "");
  if (!sessionId) return;

  let groupId: string;
  try {
    groupId = (await api<{ groupId: string }>(`/v1/sessions/${enc(sessionId)}/self-checkin/close`, { method: "POST" })).groupId;
  } catch (err) {
    return ignoreApiError(err);
  }
  revalidatePath(`/groups/${groupId}`);
  redirect(`/groups/${groupId}/sessions/${sessionId}`);
}

export type { QrState };

/** Màn hình trình chiếu gọi định kỳ để lấy mã QR mới nhất và số người đã điểm danh. */
export async function getQrStateAction(sessionId: string): Promise<QrState> {
  await requireUser();
  try {
    return await api<QrState>(`/v1/sessions/${enc(sessionId)}/qr`);
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) return { open: false };
    throw err;
  }
}
