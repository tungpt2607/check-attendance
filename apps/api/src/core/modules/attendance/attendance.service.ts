import mongoose, { type Types } from "mongoose";
import { newCheckInSecret } from "../../lib/checkin-token.js";
import { connectDB, isValidId } from "../../lib/db.js";
import {
  AttendanceRecord,
  AttendanceSession,
  type AttendanceRecordRecord,
  type AttendanceSessionRecord,
  type RecordSource,
} from "./attendance.model.js";
import { DEFAULT_STATUS, type AttendanceMethod, type AttendanceStatus } from "./attendance.statuses.js";

export type AttendanceSessionDTO = {
  id: string;
  groupId: string;
  title: string;
  date: Date;
  method: AttendanceMethod;
  selfCheckInOpen: boolean;
};

export type StatusCounts = Partial<Record<AttendanceStatus, number>>;

function toDTO(s: AttendanceSessionRecord): AttendanceSessionDTO {
  return {
    id: String(s._id),
    groupId: String(s.groupId),
    title: s.title,
    date: s.date,
    method: s.method,
    selfCheckInOpen: !!s.selfCheckIn?.open,
  };
}

export async function createAttendanceSession(input: {
  groupId: string;
  title: string;
  date: Date;
  createdBy: string;
}): Promise<AttendanceSessionDTO> {
  await connectDB();
  const created = await AttendanceSession.create({
    groupId: new mongoose.Types.ObjectId(input.groupId),
    title: input.title.trim(),
    date: input.date,
    method: "manual",
    createdBy: new mongoose.Types.ObjectId(input.createdBy),
  });
  return toDTO(created);
}

export async function getAttendanceSession(sessionId: string): Promise<AttendanceSessionDTO | null> {
  if (!isValidId(sessionId)) return null;
  await connectDB();
  const s = await AttendanceSession.findById(sessionId).lean<AttendanceSessionRecord>();
  return s ? toDTO(s) : null;
}

/** Khóa sinh mã QR của buổi (chỉ dùng phía máy chủ, không bao giờ gửi ra trình duyệt). */
export async function getCheckInSecret(sessionId: string): Promise<string | null> {
  if (!isValidId(sessionId)) return null;
  await connectDB();
  const s = await AttendanceSession.findById(sessionId).select("selfCheckIn").lean<AttendanceSessionRecord>();
  return s?.selfCheckIn?.open && s.selfCheckIn.secret ? s.selfCheckIn.secret : null;
}

/** Các buổi của một nhóm, mới nhất trước, kèm số lượng theo trạng thái. */
export async function listSessionsWithCounts(groupId: string) {
  await connectDB();
  const sessions = await AttendanceSession.find({ groupId })
    .sort({ date: -1, createdAt: -1 })
    .lean<AttendanceSessionRecord[]>();

  const rows = await AttendanceRecord.aggregate<{ _id: { s: Types.ObjectId; st: AttendanceStatus }; n: number }>([
    { $match: { sessionId: { $in: sessions.map((s) => s._id) } } },
    { $group: { _id: { s: "$sessionId", st: "$status" }, n: { $sum: 1 } } },
  ]);
  const counts = new Map<string, StatusCounts>();
  for (const r of rows) {
    const key = String(r._id.s);
    const c = counts.get(key) ?? {};
    c[r._id.st] = r.n;
    counts.set(key, c);
  }
  return sessions.map((s) => ({ ...toDTO(s), counts: counts.get(String(s._id)) ?? {} }));
}

export type RecordDTO = {
  status: AttendanceStatus;
  note: string;
  source: RecordSource;
  checkedInAt: Date | null;
};

/** Kết quả điểm danh của một buổi, dạng memberId -> kết quả */
export async function getSessionRecords(sessionId: string): Promise<Map<string, RecordDTO>> {
  await connectDB();
  const list = await AttendanceRecord.find({ sessionId }).lean<AttendanceRecordRecord[]>();
  return new Map(
    list.map((r) => [
      String(r.memberId),
      { status: r.status, note: r.note ?? "", source: r.source ?? "manual", checkedInAt: r.checkedInAt ?? null },
    ]),
  );
}

/** Chủ nhóm lưu kết quả (chỉ những dòng được gửi lên). */
export async function saveSessionRecords(
  sessionId: string,
  markedBy: string,
  entries: { memberId: string; status: AttendanceStatus; note: string }[],
) {
  if (entries.length === 0) return;
  await connectDB();
  const sid = new mongoose.Types.ObjectId(sessionId);
  const uid = new mongoose.Types.ObjectId(markedBy);
  await AttendanceRecord.bulkWrite(
    entries.map((e) => ({
      updateOne: {
        filter: { sessionId: sid, memberId: new mongoose.Types.ObjectId(e.memberId) },
        // Ghi chú để trống nghĩa là xóa ghi chú ($unset), không phải "giữ nguyên"
        update: e.note
          ? { $set: { status: e.status, note: e.note, markedBy: uid, source: "manual" as const } }
          : { $set: { status: e.status, markedBy: uid, source: "manual" as const }, $unset: { note: 1 as const } },
        upsert: true,
      },
    })),
  );
}

/** Mở tự điểm danh: tạo khóa QR mới, ghi sẵn trạng thái mặc định cho người chưa có kết quả. */
export async function openSelfCheckIn(sessionId: string, memberIds: string[], openedBy: string) {
  await connectDB();
  const sid = new mongoose.Types.ObjectId(sessionId);
  await AttendanceSession.updateOne(
    { _id: sid },
    { $set: { selfCheckIn: { open: true, secret: newCheckInSecret(), openedAt: new Date() } } },
  );
  if (memberIds.length === 0) return;
  const uid = new mongoose.Types.ObjectId(openedBy);
  await AttendanceRecord.bulkWrite(
    memberIds.map((id) => ({
      updateOne: {
        filter: { sessionId: sid, memberId: new mongoose.Types.ObjectId(id) },
        update: { $setOnInsert: { status: DEFAULT_STATUS, source: "manual" as const, markedBy: uid } },
        upsert: true,
      },
    })),
  );
}

export async function closeSelfCheckIn(sessionId: string) {
  await connectDB();
  await AttendanceSession.updateOne({ _id: sessionId }, { $set: { "selfCheckIn.open": false } });
}

/** Số người đã có mặt hoặc muộn trong buổi */
export async function countCheckedIn(sessionId: string): Promise<number> {
  await connectDB();
  return AttendanceRecord.countDocuments({ sessionId, status: { $in: ["present", "late"] } });
}

/**
 * Thành viên tự điểm danh. Trả về "ok", hoặc "already" nếu tên này đã được điểm danh
 * (tránh người khác bấm nhầm/bấm hộ đè lên).
 */
export async function recordSelfCheckIn(sessionId: string, memberId: string): Promise<"ok" | "already"> {
  await connectDB();
  try {
    await AttendanceRecord.updateOne(
      {
        sessionId: new mongoose.Types.ObjectId(sessionId),
        memberId: new mongoose.Types.ObjectId(memberId),
        status: { $nin: ["present", "late"] },
      },
      { $set: { status: "present", source: "self", checkedInAt: new Date(), markedBy: null } },
      { upsert: true },
    );
    return "ok";
  } catch (err) {
    // Đã có bản ghi Có mặt/Muộn: upsert đụng chỉ mục duy nhất
    if (typeof err === "object" && err !== null && (err as { code?: number }).code === 11000) return "already";
    throw err;
  }
}

export async function updateAttendanceSession(sessionId: string, data: { title: string; date: Date }) {
  await connectDB();
  await AttendanceSession.updateOne({ _id: sessionId }, { $set: { title: data.title.trim(), date: data.date } });
}

export async function deleteAttendanceSession(sessionId: string) {
  await connectDB();
  await AttendanceRecord.deleteMany({ sessionId });
  await AttendanceSession.deleteOne({ _id: sessionId });
}
