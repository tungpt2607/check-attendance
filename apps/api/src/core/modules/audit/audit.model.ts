// mongoose là thư viện CommonJS: trong ES Module của Node phải nạp mặc định rồi mới lấy từng phần
import mongoose, { type Model, type Types } from "mongoose";
import { AUDIT_ACTIONS, AUDIT_TARGETS, type AuditAction, type AuditTarget } from "@check-attendance/shared/admin";

const { Schema, model, models } = mongoose;

/** Nhật ký thao tác của quản trị viên (ai, lúc nào, làm gì với ai) */
export interface AuditLogRecord {
  _id: Types.ObjectId;
  actorId: Types.ObjectId | null;
  action: AuditAction;
  targetKind: AuditTarget | null;
  targetId: string | null;
  /** Tên đối tượng lúc thao tác (đối tượng có thể bị xoá về sau) */
  targetLabel: string;
  detail: string;
  createdAt: Date;
}

const auditSchema = new Schema<AuditLogRecord>({
  actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  action: { type: String, enum: [...AUDIT_ACTIONS], required: true },
  targetKind: { type: String, enum: [...AUDIT_TARGETS, null], default: null },
  targetId: { type: String, default: null },
  targetLabel: { type: String, default: "" },
  detail: { type: String, default: "" },
  createdAt: { type: Date, default: () => new Date() },
});
auditSchema.index({ createdAt: -1 });
auditSchema.index({ action: 1, createdAt: -1 });

export const AuditLog: Model<AuditLogRecord> =
  (models.AuditLog as Model<AuditLogRecord>) || model<AuditLogRecord>("AuditLog", auditSchema);
