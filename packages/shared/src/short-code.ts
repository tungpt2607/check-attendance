// Mã QR tự điểm danh: link ngắn "/c/<mã buổi base64url>.<token>" và cookie "điện thoại này đã điểm danh".
// (Phần ký/kiểm tra token có khóa bí mật nằm ở API: apps/api/src/core/lib/checkin-token.ts)

/** Cookie đánh dấu điện thoại này đã điểm danh trong buổi */
export function deviceCookieName(sessionId: string): string {
  return `ci_${sessionId}`;
}

/** Mã ngắn đặt trong QR: ngắn hơn link đầy đủ để QR ít ô hơn, dễ quét hơn */
export function encodeShortCode(sessionId: string, token: string): string {
  return `${Buffer.from(sessionId, "hex").toString("base64url")}.${token}`;
}

export function decodeShortCode(code: string): { sessionId: string; token: string } | null {
  const [sid, token] = code.split(".");
  if (!sid || !token) return null;
  const hex = Buffer.from(sid, "base64url").toString("hex");
  return /^[0-9a-f]{24}$/.test(hex) ? { sessionId: hex, token } : null;
}
