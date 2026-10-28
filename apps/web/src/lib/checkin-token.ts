// Mã QR động cho tự điểm danh: mã đổi mỗi 30 giây, chỉ hợp lệ trong vài phút.
// Ảnh chụp QR gửi cho người ở nơi khác sẽ nhanh chóng hết hạn.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const QR_WINDOW_MS = 30_000;
/** Độ dài mã trong QR (12 ký tự base64url = 72 bit, đủ an toàn cho mã chỉ sống vài phút) */
const TOKEN_LENGTH = 12;
/** Số khung 30 giây còn chấp nhận (6 = khoảng 3 phút, đủ thời gian tìm tên) */
const ACCEPTED_WINDOWS = 6;

export function newCheckInSecret(): string {
  return randomBytes(24).toString("base64url");
}

function sign(sessionId: string, secret: string, window: number): string {
  const key = `${process.env.AUTH_SECRET ?? ""}:${secret}`;
  return createHmac("sha256", key).update(`${sessionId}:${window}`).digest("base64url").slice(0, TOKEN_LENGTH);
}

function currentWindow(now = Date.now()): number {
  return Math.floor(now / QR_WINDOW_MS);
}

/** Thời điểm (ms) mã QR hiện tại hết lượt hiển thị và đổi sang mã mới */
export function currentWindowEndsAt(now = Date.now()): number {
  return (currentWindow(now) + 1) * QR_WINDOW_MS;
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

/**
 * Mã ngắn đặt trong QR: "<mã buổi base64url>.<token>", ngắn hơn link đầy đủ
 * để QR ít ô hơn, dễ quét hơn. Trang /c/[code] giải mã rồi chuyển sang /checkin.
 */
export function encodeShortCode(sessionId: string, token: string): string {
  return `${Buffer.from(sessionId, "hex").toString("base64url")}.${token}`;
}

export function decodeShortCode(code: string): { sessionId: string; token: string } | null {
  const [sid, token] = code.split(".");
  if (!sid || !token) return null;
  const hex = Buffer.from(sid, "base64url").toString("hex");
  return /^[0-9a-f]{24}$/.test(hex) ? { sessionId: hex, token } : null;
}
