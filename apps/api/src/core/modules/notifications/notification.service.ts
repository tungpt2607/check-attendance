// Thông báo: một hàm gửi duy nhất notify(); mọi nơi cần báo đều gọi hàm này.
// Sau này thêm kênh gửi (email, thông báo đẩy) chỉ cần sửa trong notify().
import mongoose from "mongoose";
import type {
  NotificationData,
  NotificationResolution,
  NotificationSubjectKind,
  NotificationType,
} from "@check-attendance/shared/notifications";
import { connectDB, isValidId } from "../../lib/db.js";
import { Notification, type NotificationRecord } from "./notification.model.js";

const oid = (id: string) => new mongoose.Types.ObjectId(id);

export type NotifyInput = {
  type: NotificationType;
  /** Người nhận (tự bỏ trùng và bỏ chính người gây ra sự việc) */
  recipients: string[];
  groupId?: string | null;
  actorId?: string | null;
  subject?: { kind: NotificationSubjectKind; id: string } | null;
  data?: NotificationData;
};

/**
 * Gửi thông báo. Lỗi khi gửi chỉ ghi log, không làm hỏng thao tác chính
 * (vd. người dùng vẫn gửi được yêu cầu dù thông báo lỗi).
 */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    const recipients = [...new Set(input.recipients)].filter((id) => isValidId(id) && id !== input.actorId);
    if (recipients.length === 0) return;
    await connectDB();
    await Notification.insertMany(
      recipients.map((userId) => ({
        userId: oid(userId),
        type: input.type,
        groupId: input.groupId ? oid(input.groupId) : null,
        actorId: input.actorId ? oid(input.actorId) : null,
        subjectKind: input.subject?.kind ?? null,
        subjectId: input.subject ? oid(input.subject.id) : null,
        data: input.data ?? {},
      })),
    );
  } catch (err) {
    console.error("notify failed", input.type, err);
  }
}

/**
 * Đối tượng đã được xử lý (duyệt, từ chối, hủy...): mọi thông báo về nó ghi lại kết quả
 * và coi như đã đọc (không còn việc phải làm).
 */
export async function resolveSubject(kind: NotificationSubjectKind, id: string | string[], resolution: NotificationResolution): Promise<void> {
  const ids = (Array.isArray(id) ? id : [id]).filter(isValidId).map(oid);
  if (ids.length === 0) return;
  try {
    await connectDB();
    const now = new Date();
    const subject = { subjectKind: kind, subjectId: { $in: ids } };
    await Notification.updateMany({ ...subject, resolvedAt: null }, { $set: { resolvedAt: now, resolution } });
    await Notification.updateMany({ ...subject, readAt: null }, { $set: { readAt: now } });
  } catch (err) {
    console.error("resolveSubject failed", kind, err);
  }
}

/** Thông báo của một người, mới nhất trước; cursor = id của thông báo cuối trang trước */
export async function listNotifications(userId: string, cursor: string | undefined, limit: number) {
  await connectDB();
  const filter: Record<string, unknown> = { userId: oid(userId) };
  if (cursor && isValidId(cursor)) filter._id = { $lt: oid(cursor) };
  const rows = await Notification.find(filter).sort({ _id: -1 }).limit(limit + 1).lean<NotificationRecord[]>();
  const items = rows.slice(0, limit);
  return { items, nextCursor: rows.length > limit ? String(items[items.length - 1]._id) : null };
}

export async function countUnread(userId: string): Promise<number> {
  await connectDB();
  return Notification.countDocuments({ userId: oid(userId), readAt: null });
}

/** Đánh dấu đã đọc (chỉ thông báo của chính người đó) */
export async function markRead(userId: string, ids: string[] | "all"): Promise<void> {
  await connectDB();
  const filter: Record<string, unknown> = { userId: oid(userId), readAt: null };
  if (ids !== "all") filter._id = { $in: ids.filter(isValidId).map(oid) };
  await Notification.updateMany(filter, { $set: { readAt: new Date() } });
}
