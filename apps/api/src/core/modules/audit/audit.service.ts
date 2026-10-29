// Nhật ký quản trị: một hàm ghi duy nhất logAudit(); lỗi khi ghi chỉ ghi log, không làm hỏng thao tác chính.
import mongoose from "mongoose";
import type { AuditAction, AuditTarget } from "@check-attendance/shared/admin";
import { connectDB, isValidId } from "../../lib/db.js";
import { AuditLog, type AuditLogRecord } from "./audit.model.js";

export type AuditInput = {
  actorId: string | null;
  action: AuditAction;
  target?: { kind: AuditTarget; id?: string | null; label?: string } | null;
  detail?: string;
};

export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      actorId: input.actorId && isValidId(input.actorId) ? new mongoose.Types.ObjectId(input.actorId) : null,
      action: input.action,
      targetKind: input.target?.kind ?? null,
      targetId: input.target?.id ?? null,
      targetLabel: input.target?.label ?? "",
      detail: input.detail ?? "",
    });
  } catch (err) {
    console.error("logAudit failed", input.action, err);
  }
}

export async function listAudit(opts: { action?: AuditAction; page: number; pageSize: number }) {
  await connectDB();
  const filter = opts.action ? { action: opts.action } : {};
  const [items, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((opts.page - 1) * opts.pageSize)
      .limit(opts.pageSize)
      .lean<AuditLogRecord[]>(),
    AuditLog.countDocuments(filter),
  ]);
  return { items, total };
}
