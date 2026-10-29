"use server";

// Thông báo của người đang đăng nhập: gọi backend API.
import { api, ApiError } from "@/lib/api";
import type { NotificationList } from "@check-attendance/shared/api";
import { requireUser } from "@/lib/session";

/** Số thông báo chưa đọc; API tạm lỗi thì trả null (giữ số cũ) */
export async function getUnreadCountAction(): Promise<number | null> {
  await requireUser();
  try {
    return (await api<{ count: number }>("/v1/notifications/unread-count")).count;
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}

/** Một trang thông báo (mới nhất trước); API tạm lỗi thì trả null */
export async function listNotificationsAction(cursor?: string | null, limit = 20): Promise<NotificationList | null> {
  await requireUser();
  const q = new URLSearchParams({ limit: String(limit) });
  if (cursor) q.set("cursor", cursor);
  try {
    return await api<NotificationList>(`/v1/notifications?${q}`);
  } catch (err) {
    if (err instanceof ApiError) return null;
    throw err;
  }
}

/** Đánh dấu đã đọc: danh sách id hoặc "all" */
export async function markNotificationsReadAction(ids: string[] | "all"): Promise<void> {
  await requireUser();
  try {
    await api("/v1/notifications/read", { method: "POST", body: ids === "all" ? { all: true } : { ids } });
  } catch (err) {
    if (!(err instanceof ApiError)) throw err;
  }
}
