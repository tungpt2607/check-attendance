"use server";

// Hành động công khai: thành viên tự điểm danh bằng QR.
// - Tên CHƯA liên kết tài khoản: không cần đăng nhập
// - Tên ĐÃ liên kết tài khoản: bắt buộc đăng nhập đúng tài khoản đó
// API kiểm tra buổi đang mở, mã QR còn hạn, đúng tài khoản; web giữ thêm giới hạn "mỗi điện thoại 1 người/buổi" bằng cookie.
import { cookies } from "next/headers";
import { api, ApiError } from "@/lib/api";
import type { CheckInInfo } from "@/lib/api-types";
import { deviceCookieName } from "@/lib/checkin-token";

export type CheckInResult = { ok: true; name: string } | { ok: false; error: string };

const OBJECT_ID = /^[a-f0-9]{24}$/i;

export async function selfCheckInAction(sessionId: string, token: string, memberId: string): Promise<CheckInResult> {
  if (!OBJECT_ID.test(sessionId) || !OBJECT_ID.test(memberId)) return { ok: false, error: "Dữ liệu không hợp lệ." };
  const path = `/v1/checkin/${encodeURIComponent(sessionId)}`;

  const store = await cookies();
  const cookieName = deviceCookieName(sessionId);
  const already = store.get(cookieName)?.value;
  if (already) {
    let name = "một người khác";
    try {
      const info = await api<CheckInInfo>(`${path}?t=${encodeURIComponent(token)}`);
      name = info.members.find((m) => m.id === already)?.name ?? name;
    } catch {
      // Không lấy được tên thì vẫn báo chung
    }
    return { ok: false, error: `Điện thoại này đã điểm danh cho ${name} trong buổi này.` };
  }

  let name: string;
  try {
    // Gửi kèm phiên đăng nhập (nếu có) để API kiểm tra tên đã liên kết
    name = (await api<{ name: string }>(path, { method: "POST", body: { token, memberId } })).name;
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) return { ok: false, error: err.message };
    throw err;
  }

  store.set(cookieName, memberId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return { ok: true, name };
}
