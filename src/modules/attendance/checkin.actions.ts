"use server";

// Hành động công khai: thành viên tự điểm danh bằng QR, KHÔNG cần đăng nhập.
// Mọi kiểm tra (buổi đang mở, mã QR còn hạn, mỗi điện thoại 1 người) nằm ở đây.
import { cookies } from "next/headers";
import { deviceCookieName, verifyCheckInToken } from "@/lib/checkin-token";
import { isValidId } from "@/lib/db";
import { getMember } from "@/modules/members/member.service";
import { getAttendanceSession, getCheckInSecret, recordSelfCheckIn } from "./attendance.service";

export type CheckInResult = { ok: true; name: string } | { ok: false; error: string };

export async function selfCheckInAction(sessionId: string, token: string, memberId: string): Promise<CheckInResult> {
  if (!isValidId(sessionId) || !isValidId(memberId)) return { ok: false, error: "Dữ liệu không hợp lệ." };

  const session = await getAttendanceSession(sessionId);
  const secret = session ? await getCheckInSecret(sessionId) : null;
  if (!session || !secret) return { ok: false, error: "Buổi điểm danh đã đóng." };
  if (!verifyCheckInToken(sessionId, secret, token)) {
    return { ok: false, error: "Mã QR đã hết hạn. Hãy quét lại mã trên màn hình." };
  }

  const store = await cookies();
  const cookieName = deviceCookieName(sessionId);
  const already = store.get(cookieName)?.value;
  if (already) {
    const m = isValidId(already) ? await getMember(already) : null;
    return { ok: false, error: `Điện thoại này đã điểm danh cho ${m?.name ?? "một người khác"} trong buổi này.` };
  }

  const member = await getMember(memberId);
  if (!member || member.groupId !== session.groupId) return { ok: false, error: "Không tìm thấy tên này trong nhóm." };

  const result = await recordSelfCheckIn(sessionId, memberId);
  if (result === "already") {
    return { ok: false, error: `${member.name} đã được điểm danh rồi. Nếu không phải bạn, hãy báo người quản lý.` };
  }

  store.set(cookieName, memberId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return { ok: true, name: member.name };
}
