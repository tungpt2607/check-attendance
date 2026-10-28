// Mã QR động cho tự điểm danh: mã đổi mỗi 30 giây, chỉ hợp lệ trong vài phút.
// Ảnh chụp QR gửi cho người ở nơi khác sẽ nhanh chóng hết hạn.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const QR_WINDOW_MS = 30_000;
/** Số khung 30 giây còn chấp nhận (6 = khoảng 3 phút, đủ thời gian tìm tên) */
const ACCEPTED_WINDOWS = 6;

export function newCheckInSecret(): string {
  return randomBytes(24).toString("base64url");
}

function sign(sessionId: string, secret: string, window: number): string {
  const key = `${process.env.AUTH_SECRET ?? ""}:${secret}`;
  return createHmac("sha256", key).update(`${sessionId}:${window}`).digest("base64url").slice(0, 22);
}

function currentWindow(now = Date.now()): number {
  return Math.floor(now / QR_WINDOW_MS);
}

export function createCheckInToken(sessionId: string, secret: string): string {
  return sign(sessionId, secret, currentWindow());
}

export function verifyCheckInToken(sessionId: string, secret: string, token: string | undefined | null): boolean {
  if (!token || !secret) return false;
  const now = currentWindow();
  const given = Buffer.from(token);
  for (let i = 0; i < ACCEPTED_WINDOWS; i++) {
    const expected = Buffer.from(sign(sessionId, secret, now - i));
    if (expected.length === given.length && timingSafeEqual(expected, given)) return true;
  }
  return false;
}

/** Cookie đánh dấu điện thoại này đã điểm danh trong buổi */
export function deviceCookieName(sessionId: string): string {
  return `ci_${sessionId}`;
}
