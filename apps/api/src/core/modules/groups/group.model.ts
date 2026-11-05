// mongoose là thư viện CommonJS: trong ES Module của Node phải nạp mặc định rồi mới lấy từng phần
import mongoose, { type Model, type Types } from "mongoose";

import { GROUP_PERMISSIONS, type GroupPermission } from "@check-attendance/shared/permissions";

const { Schema, model, models } = mongoose;

export interface GroupRecord {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  /** Nhóm cha; null = nhóm gốc */
  parentId: Types.ObjectId | null;
  /** Danh sách tổ tiên từ gốc đến cha, giúp truy vấn cả cây con nhanh */
  ancestors: Types.ObjectId[];
  ownerId: Types.ObjectId;
  /** Người quản lý do chủ nhóm thêm; quyền áp dụng cho nhóm này và mọi nhóm con (xem packages/shared/src/permissions.ts) */
  managers?: GroupManagerRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupManagerRecord {
  userId: Types.ObjectId;
  permissions: GroupPermission[];
  addedBy: Types.ObjectId;
  addedAt: Date;
}

const managerSchema = new Schema<GroupManagerRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    permissions: { type: [String], enum: [...GROUP_PERMISSIONS], default: [] },
    addedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    addedAt: { type: Date, required: true },
  },
  { _id: false },
);

const groupSchema = new Schema<GroupRecord>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    parentId: { type: Schema.Types.ObjectId, ref: "Group", default: null, index: true },
    ancestors: { type: [Schema.Types.ObjectId], default: [], index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    managers: { type: [managerSchema], default: [] },
  },
  { timestamps: true },
);

// Nhóm mà một người đang quản lý (danh sách nhóm của tôi, kiểm tra quyền)
groupSchema.index({ "managers.userId": 1 });

export const Group: Model<GroupRecord> =
  (models.Group as Model<GroupRecord>) || model<GroupRecord>("Group", groupSchema);
