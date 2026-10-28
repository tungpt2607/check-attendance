import { Schema, model, models, type Model, type Types } from "mongoose";
import { ATTENDANCE_METHODS, ATTENDANCE_STATUSES, type AttendanceMethod, type AttendanceStatus } from "./attendance.statuses";

/** Một buổi điểm danh của một nhóm */
export interface AttendanceSessionRecord {
  _id: Types.ObjectId;
  groupId: Types.ObjectId;
  title: string;
  date: Date;
  method: AttendanceMethod;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<AttendanceSessionRecord>(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    title: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    method: { type: String, enum: [...ATTENDANCE_METHODS], default: "manual" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export const AttendanceSession: Model<AttendanceSessionRecord> =
  (models.AttendanceSession as Model<AttendanceSessionRecord>) ||
  model<AttendanceSessionRecord>("AttendanceSession", sessionSchema);

/** Kết quả điểm danh của một thành viên trong một buổi */
export interface AttendanceRecordRecord {
  _id: Types.ObjectId;
  sessionId: Types.ObjectId;
  memberId: Types.ObjectId;
  status: AttendanceStatus;
  note?: string;
  markedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const recordSchema = new Schema<AttendanceRecordRecord>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "AttendanceSession", required: true },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true, index: true },
    status: { type: String, enum: ATTENDANCE_STATUSES.map((s) => s.value), required: true },
    note: { type: String, trim: true },
    markedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);
recordSchema.index({ sessionId: 1, memberId: 1 }, { unique: true });

export const AttendanceRecord: Model<AttendanceRecordRecord> =
  (models.AttendanceRecord as Model<AttendanceRecordRecord>) ||
  model<AttendanceRecordRecord>("AttendanceRecord", recordSchema);
