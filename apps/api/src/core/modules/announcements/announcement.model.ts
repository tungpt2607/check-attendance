// mongoose là thư viện CommonJS: trong ES Module của Node phải nạp mặc định rồi mới lấy từng phần
import mongoose, { type Model, type Types } from "mongoose";

const { Schema, model, models } = mongoose;

/** Thông báo hệ thống quản trị viên đã gửi (lịch sử; nội dung tới từng người nằm ở bảng notifications) */
export interface AnnouncementRecord {
  _id: Types.ObjectId;
  actorId: Types.ObjectId | null;
  title: string;
  message: string;
  href: string;
  email: boolean;
  recipientCount: number;
  emailCount: number;
  createdAt: Date;
}

const announcementSchema = new Schema<AnnouncementRecord>({
  actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  title: { type: String, required: true },
  message: { type: String, default: "" },
  href: { type: String, default: "" },
  email: { type: Boolean, default: false },
  recipientCount: { type: Number, default: 0 },
  emailCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: () => new Date() },
});
announcementSchema.index({ createdAt: -1 });

export const Announcement: Model<AnnouncementRecord> =
  (models.Announcement as Model<AnnouncementRecord>) || model<AnnouncementRecord>("Announcement", announcementSchema);
