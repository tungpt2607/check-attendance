// mongoose là thư viện CommonJS: trong ES Module của Node phải nạp mặc định rồi mới lấy từng phần
import mongoose, { type Model, type Types } from "mongoose";
import {
  NOTIFICATION_RESOLUTIONS,
  NOTIFICATION_SUBJECTS,
  NOTIFICATION_TYPES,
  type NotificationData,
  type NotificationResolution,
  type NotificationSubjectKind,
  type NotificationType,
} from "@check-attendance/shared/notifications";

const { Schema, model, models } = mongoose;

/** Thông báo cũ hơn 90 ngày tự xóa (chỉ mục TTL của MongoDB) */
export const NOTIFICATION_TTL_SECONDS = 90 * 24 * 60 * 60;

export interface NotificationRecord {
  _id: Types.ObjectId;
  /** Người nhận */
  userId: Types.ObjectId;
  type: NotificationType;
  groupId: Types.ObjectId | null;
  /** Người gây ra sự việc */
  actorId: Types.ObjectId | null;
  subjectKind: NotificationSubjectKind | null;
  subjectId: Types.ObjectId | null;
  data: NotificationData;
  readAt: Date | null;
  /** Đối tượng đã được xử lý (không còn việc phải làm) */
  resolvedAt: Date | null;
  resolution: NotificationResolution | null;
  createdAt: Date;
}

const notificationSchema = new Schema<NotificationRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: [...NOTIFICATION_TYPES], required: true },
    groupId: { type: Schema.Types.ObjectId, ref: "Group", default: null },
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    subjectKind: { type: String, enum: [...NOTIFICATION_SUBJECTS], default: null },
    subjectId: { type: Schema.Types.ObjectId, default: null },
    data: { type: Schema.Types.Mixed, default: {} },
    readAt: { type: Date, default: null },
    resolvedAt: { type: Date, default: null },
    resolution: { type: String, enum: [...NOTIFICATION_RESOLUTIONS, null], default: null },
    createdAt: { type: Date, default: () => new Date(), expires: NOTIFICATION_TTL_SECONDS },
  },
  { minimize: false },
);

// Danh sách của một người (mới nhất trước) + đếm chưa đọc
notificationSchema.index({ userId: 1, _id: -1 });
notificationSchema.index({ userId: 1, readAt: 1 });
// Tìm theo đối tượng để cập nhật khi đối tượng được xử lý
notificationSchema.index({ subjectKind: 1, subjectId: 1 });

export const Notification: Model<NotificationRecord> =
  (models.Notification as Model<NotificationRecord>) || model<NotificationRecord>("Notification", notificationSchema);
