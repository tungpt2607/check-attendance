// mongoose là thư viện CommonJS: trong ES Module của Node phải nạp mặc định rồi mới lấy từng phần
import mongoose, { type Model, type Types } from "mongoose";

const { Schema, model, models } = mongoose;

/**
 * Mã dùng 1 lần gửi qua email. Thêm mục đích mới (xác minh email, đổi email...) chỉ cần thêm vào đây.
 * - password_reset: đặt lại mật khẩu
 */
export const TOKEN_PURPOSES = ["password_reset"] as const;
export type TokenPurpose = (typeof TOKEN_PURPOSES)[number];

/** Bản ghi tự xóa sau 1 ngày (đủ để đếm giới hạn số lần yêu cầu mỗi giờ) */
const KEEP_SECONDS = 24 * 60 * 60;

export interface OneTimeTokenRecord {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  purpose: TokenPurpose;
  /** Chỉ lưu mã băm SHA-256, không lưu mã gốc */
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

const oneTimeTokenSchema = new Schema<OneTimeTokenRecord>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  purpose: { type: String, enum: [...TOKEN_PURPOSES], required: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
  createdAt: { type: Date, default: () => new Date(), expires: KEEP_SECONDS },
});
oneTimeTokenSchema.index({ userId: 1, purpose: 1, createdAt: -1 });

export const OneTimeToken: Model<OneTimeTokenRecord> =
  (models.OneTimeToken as Model<OneTimeTokenRecord>) || model<OneTimeTokenRecord>("OneTimeToken", oneTimeTokenSchema);
