/** Chỉ chấp nhận đường dẫn nội bộ cho tham số ?next= (chống chuyển hướng sang trang lạ) */
export function safeNext(next: unknown, fallback = "/groups"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
