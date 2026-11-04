// Phiên bản đang chạy: web (lấy lúc build từ apps/web/package.json) và API (hỏi /health của API).
import { cache } from "react";
import { API_URL } from "@check-attendance/ui/api-url";

export const WEB_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "";

/** Phiên bản API đang chạy; API không trả lời thì null (không làm hỏng trang). Lưu đệm 5 phút. */
export const getApiVersion = cache(async (): Promise<string | null> => {
  try {
    const res = await fetch(`${API_URL}/health`, { next: { revalidate: 300 }, signal: AbortSignal.timeout(3000) });
    const data = (await res.json()) as { version?: unknown };
    return typeof data.version === "string" ? data.version : null;
  } catch {
    return null;
  }
});

/** "Phiên bản 1.0.0 · API 1.0.0" */
export function versionLabel(apiVersion: string | null): string {
  return [`Phiên bản ${WEB_VERSION}`, apiVersion && `API ${apiVersion}`].filter(Boolean).join(" · ");
}
