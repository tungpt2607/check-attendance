import { Schema, model, models, type Model, type Types } from "mongoose";

export interface UserAvatar {
  /** Ảnh đã cắt vuông, thu nhỏ (khoảng 256px, vài chục KB) */
  data: Buffer;
  contentType: string;
  updatedAt: Date;
}

export interface UserRecord {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  avatar?: UserAvatar | null;
  /**
   * Phiên bản đăng nhập. Tăng lên khi đổi mật khẩu để mọi phiên cũ (thiết bị khác) hết hiệu lực.
   * Tài khoản cũ chưa có trường này được coi là 0.
   */
  tokenVersion?: number;
  createdAt: Date;
  updatedAt: Date;
}

const avatarSchema = new Schema<UserAvatar>(
  {
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true },
    updatedAt: { type: Date, required: true },
  },
  { _id: false },
);

const userSchema = new Schema<UserRecord>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    avatar: { type: avatarSchema, default: null },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const User: Model<UserRecord> =
  (models.User as Model<UserRecord>) || model<UserRecord>("User", userSchema);
