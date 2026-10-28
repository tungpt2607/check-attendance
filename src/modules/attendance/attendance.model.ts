import { Schema, model, models, type Model, type Types } from "mongoose";
import { ATTENDANCE_METHODS, ATTENDANCE_STATUSES, type AttendanceMethod, type AttendanceStatus } from "./attendance.statuses";

/** Một buổi điểm danh của một nhóm */
export interface AttendanceSessionRecord {
  _id: Types.ObjectId;
  groupId: Types.ObjectId;
  title: string;
  date: Date;
  method: AttendanceMethod;
  /** Tự điểm danh bằng QR: đang mở hay đóng, và khóa bí mật để sinh mã QR */
  selfCheckIn?: {
    open: boolean;
    secret: string;
    openedAt: Date | null;
  };
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
    selfCheckIn: {
      open: { type: Boolean, default: false },
      secret: { type: String, default: "" },
      openedAt: { type: Date, default: null },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export const AttendanceSession: Model<AttendanceSessionRecord> =
  (models.AttendanceSession as Model<AttendanceSessionRecord>) ||
  model<AttendanceSessionRecord>("AttendanceSession", sessionSchema);

/** Ai ghi kết quả: chủ nhóm chấm tay, hay thành viên tự điểm danh */
export const RECORD_SOURCES = ["manual", "self"] as const;
export type RecordSource = (typeof RECORD_SOURCES)[number];

/** Kết quả điểm danh của một thành viên trong một buổi */
export interface AttendanceRecordRecord {
  _id: Types.ObjectId;
  sessionId: Types.ObjectId;
  memberId: Types.ObjectId;
  status: AttendanceStatus;
  note?: string;
  source?: RecordSource;
  /** Thời điểm tự điểm danh (chỉ có khi source = "self") */
  checkedInAt?: Date | null;
  /** Chủ nhóm ghi (null khi thành viên tự điểm danh) */
  markedBy?: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const recordSchema = new Schema<AttendanceRecordRecord>(
  {
    sessionId: { type: Schema.Types.ObjectId, ref: "AttendanceSession", required: true },
    memberId: { type: Schema.Types.ObjectId, ref: "Member", required: true, index: true },
    status: { type: String, enum: ATTENDANCE_STATUSES.map((s) => s.value), required: true },
    note: { type: String, trim: true },
    source: { type: String, enum: [...RECORD_SOURCES], default: "manual" },
    checkedInAt: { type: Date, default: null },
    markedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);
recordSchema.index({ sessionId: 1, memberId: 1 }, { unique: true });

export const AttendanceRecord: Model<AttendanceRecordRecord> =
  (models.AttendanceRecord as Model<AttendanceRecordRecord>) ||
  model<AttendanceRecordRecord>("AttendanceRecord", recordSchema);
