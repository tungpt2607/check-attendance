import { Schema, model, models, type Model, type Types } from "mongoose";

export interface GroupRecord {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  /** Nhóm cha; null = nhóm gốc */
  parentId: Types.ObjectId | null;
  /** Danh sách tổ tiên từ gốc đến cha, giúp truy vấn cả cây con nhanh */
  ancestors: Types.ObjectId[];
  ownerId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const groupSchema = new Schema<GroupRecord>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    parentId: { type: Schema.Types.ObjectId, ref: "Group", default: null, index: true },
    ancestors: { type: [Schema.Types.ObjectId], default: [], index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  },
  { timestamps: true },
);

export const Group: Model<GroupRecord> =
  (models.Group as Model<GroupRecord>) || model<GroupRecord>("Group", groupSchema);
