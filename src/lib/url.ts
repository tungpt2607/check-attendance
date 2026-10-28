import { headers } from "next/headers";

/** Địa chỉ gốc của web theo yêu cầu hiện tại (vd. https://check-attendance-pi.vercel.app) */
export async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Chỉ chấp nhận đường dẫn nội bộ cho tham số ?next= (chống chuyển hướng sang trang lạ) */
export function safeNext(next: unknown, fallback = "/groups"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
