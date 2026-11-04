// Dữ liệu khuôn mặt để điểm danh: chỉ lưu vector đặc trưng (128 số) do trình duyệt tính, KHÔNG lưu ảnh.
// Mỗi hồ sơ thuộc về MỘT tài khoản (userId, dùng chung cho mọi nhóm) hoặc MỘT thành viên chưa liên kết (memberId).
// mongoose là thư viện CommonJS: trong ES Module của Node phải nạp mặc định rồi mới lấy từng phần
import mongoose, { type Model, type Types } from "mongoose";

const { Schema, model, models } = mongoose;

export interface FaceProfileRecord {
  _id: Types.ObjectId;
  userId?: Types.ObjectId | null;
  memberId?: Types.ObjectId | null;
  /** Các mẫu khuôn mặt (mỗi mẫu 128 số); so khớp lấy mẫu gần nhất */
  descriptors: number[][];
  /** Model đã tính vector; chỉ so các vector cùng model */
  model: string;
  /** Chủ nhóm đã quét lần đầu */
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const faceProfileSchema = new Schema<FaceProfileRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", default: null },
    descriptors: { type: [[Number]], required: true },
    model: { type: String, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

faceProfileSchema.index({ userId: 1 }, { unique: true, partialFilterExpression: { userId: { $type: "objectId" } } });
faceProfileSchema.index({ memberId: 1 }, { unique: true, partialFilterExpression: { memberId: { $type: "objectId" } } });

export const FaceProfile: Model<FaceProfileRecord> =
  (models.FaceProfile as Model<FaceProfileRecord>) || model<FaceProfileRecord>("FaceProfile", faceProfileSchema);
