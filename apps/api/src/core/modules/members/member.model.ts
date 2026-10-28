// mongoose là thư viện CommonJS: trong ES Module của Node phải nạp mặc định rồi mới lấy từng phần
import mongoose, { type Model, type Types } from "mongoose";

const { Schema, model, models } = mongoose;

export interface MemberRecord {
  _id: Types.ObjectId;
  groupId: Types.ObjectId;
  name: string;
  /** Mã số (mã học sinh, mã nhân viên...), tùy chọn */
  code?: string;
  /** Liên kết tài khoản. Bản đầu để trống; sau này dùng khi thành viên tự đăng nhập. */
  userId: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const memberSchema = new Schema<MemberRecord>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
  },
  { timestamps: true },
);

memberSchema.index(
  { groupId: 1, userId: 1 },
  { unique: true, partialFilterExpression: { userId: { $type: "objectId" } } },
);

export const Member: Model<MemberRecord> =
  (models.Member as Model<MemberRecord>) || model<MemberRecord>("Member", memberSchema);
