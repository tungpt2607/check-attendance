// mongoose là thư viện CommonJS: trong ES Module của Node phải nạp mặc định rồi mới lấy từng phần
import mongoose, { type Model, type Types } from "mongoose";

const { Schema, model, models } = mongoose;

/**
 * Lời mời liên kết tài khoản với thành viên.
 * - member: link riêng cho 1 thành viên, dùng 1 lần, có hạn, nhận là liên kết ngay
 * - group: link chung cho cả nhóm, người nhận chọn tên rồi chờ chủ nhóm duyệt
 */
export const INVITE_KINDS = ["member", "group"] as const;
export type InviteKind = (typeof INVITE_KINDS)[number];

export interface InviteRecord {
  _id: Types.ObjectId;
  token: string;
  kind: InviteKind;
  groupId: Types.ObjectId;
  /** Chỉ có với lời mời riêng */
  memberId: Types.ObjectId | null;
  createdBy: Types.ObjectId;
  /** null = không hết hạn (link chung) */
  expiresAt: Date | null;
  usedAt: Date | null;
  usedBy: Types.ObjectId | null;
  /** Bị thu hồi (tạo link mới hoặc tắt link) */
  revoked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const inviteSchema = new Schema<InviteRecord>(
  {
    token: { type: String, required: true, unique: true },
    kind: { type: String, enum: [...INVITE_KINDS], required: true },
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", default: null, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, default: null },
    usedAt: { type: Date, default: null },
    usedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    revoked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Invite: Model<InviteRecord> =
  (models.Invite as Model<InviteRecord>) || model<InviteRecord>("Invite", inviteSchema);

/** Yêu cầu nhận tên qua link chung, chờ chủ nhóm duyệt */
export const LINK_REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;
export type LinkRequestStatus = (typeof LINK_REQUEST_STATUSES)[number];

export interface LinkRequestRecord {
  _id: Types.ObjectId;
  groupId: Types.ObjectId;
  memberId: Types.ObjectId;
  userId: Types.ObjectId;
  status: LinkRequestStatus;
  decidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const linkRequestSchema = new Schema<LinkRequestRecord>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: [...LINK_REQUEST_STATUSES], default: "pending" },
    decidedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
linkRequestSchema.index({ groupId: 1, status: 1 });
linkRequestSchema.index({ userId: 1, groupId: 1, status: 1 });

export const LinkRequest: Model<LinkRequestRecord> =
  (models.LinkRequest as Model<LinkRequestRecord>) || model<LinkRequestRecord>("LinkRequest", linkRequestSchema);
