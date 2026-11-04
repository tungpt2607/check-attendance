"use server";

// Điểm danh bằng khuôn mặt (chủ nhóm): gửi vector khuôn mặt do trình duyệt tính lên API.
// Không gửi ảnh: chỉ 128 con số. API kiểm tra quyền chủ nhóm và so khớp.
import { revalidatePath } from "next/cache";
import { api, ApiError, enc } from "@/lib/api";
import { requireUser } from "@/lib/session";
import type { FaceAssignResult, FaceScanResult } from "@check-attendance/shared/api";
import { FACE_DESCRIPTOR_LENGTH } from "@check-attendance/shared/api";
import type { AttendanceStatus } from "@check-attendance/shared/statuses";

type Failed = { ok: false; error: string };

function validDescriptor(d: unknown): d is number[] {
  return Array.isArray(d) && d.length === FACE_DESCRIPTOR_LENGTH && d.every((x) => typeof x === "number" && Number.isFinite(x));
}

/** Lỗi API (kể cả mất kết nối) thì báo cho người quét, để màn hình camera không bị hỏng giữa chừng */
function failed(err: unknown): Failed {
  if (err instanceof ApiError) return { ok: false, error: err.message };
  throw err;
}

function refresh(groupId: string, sessionId: string) {
  revalidatePath(`/groups/${groupId}`);
  revalidatePath(`/groups/${groupId}/sessions/${sessionId}`);
}

export async function scanFaceAction(
  groupId: string,
  sessionId: string,
  descriptor: number[],
): Promise<({ ok: true } & FaceScanResult) | Failed> {
  await requireUser();
  if (!validDescriptor(descriptor)) return { ok: false, error: "Dữ liệu khuôn mặt không hợp lệ." };
  try {
    const res = await api<FaceScanResult>(`/v1/sessions/${enc(sessionId)}/face/scan`, { method: "POST", body: { descriptor } });
    if (res.result === "checked_in") refresh(groupId, sessionId);
    return { ok: true, ...res };
  } catch (err) {
    return failed(err);
  }
}

export async function assignFaceAction(
  groupId: string,
  sessionId: string,
  memberId: string,
  descriptor: number[],
): Promise<({ ok: true } & FaceAssignResult) | Failed> {
  await requireUser();
  if (!validDescriptor(descriptor)) return { ok: false, error: "Dữ liệu khuôn mặt không hợp lệ." };
  try {
    const res = await api<FaceAssignResult>(`/v1/sessions/${enc(sessionId)}/face/assign`, {
      method: "POST",
      body: { memberId, descriptor },
    });
    refresh(groupId, sessionId);
    return { ok: true, ...res };
  } catch (err) {
    return failed(err);
  }
}

export async function undoFaceAction(
  groupId: string,
  sessionId: string,
  memberId: string,
  previousStatus: AttendanceStatus | null,
): Promise<{ ok: true } | Failed> {
  await requireUser();
  try {
    await api(`/v1/sessions/${enc(sessionId)}/face/undo`, { method: "POST", body: { memberId, previousStatus } });
    refresh(groupId, sessionId);
    return { ok: true };
  } catch (err) {
    return failed(err);
  }
}
