import { Types } from "mongoose";
import { connectDB, isValidId } from "@/lib/db";
import { AttendanceRecord, AttendanceSession, type AttendanceRecordRecord, type AttendanceSessionRecord } from "./attendance.model";
import type { AttendanceMethod, AttendanceStatus } from "./attendance.statuses";

export type AttendanceSessionDTO = {
  id: string;
  groupId: string;
  title: string;
  date: Date;
  method: AttendanceMethod;
};

export type StatusCounts = Partial<Record<AttendanceStatus, number>>;

function toDTO(s: AttendanceSessionRecord): AttendanceSessionDTO {
  return { id: String(s._id), groupId: String(s.groupId), title: s.title, date: s.date, method: s.method };
}

export async function createAttendanceSession(input: {
  groupId: string;
  title: string;
  date: Date;
  createdBy: string;
}): Promise<AttendanceSessionDTO> {
  await connectDB();
  const created = await AttendanceSession.create({
    groupId: new Types.ObjectId(input.groupId),
    title: input.title.trim(),
    date: input.date,
    method: "manual",
    createdBy: new Types.ObjectId(input.createdBy),
  });
  return toDTO(created);
}

export async function getAttendanceSession(sessionId: string): Promise<AttendanceSessionDTO | null> {
  if (!isValidId(sessionId)) return null;
  await connectDB();
  const s = await AttendanceSession.findById(sessionId).lean<AttendanceSessionRecord>();
  return s ? toDTO(s) : null;
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

export type RecordDTO = { status: AttendanceStatus; note: string };

/** Kết quả điểm danh của một buổi, dạng memberId -> { status, note } */
export async function getSessionRecords(sessionId: string): Promise<Map<string, RecordDTO>> {
  await connectDB();
  const list = await AttendanceRecord.find({ sessionId }).lean<AttendanceRecordRecord[]>();
  return new Map(list.map((r) => [String(r.memberId), { status: r.status, note: r.note ?? "" }]));
}

export async function saveSessionRecords(
  sessionId: string,
  markedBy: string,
  entries: { memberId: string; status: AttendanceStatus; note: string }[],
) {
  if (entries.length === 0) return;
  await connectDB();
  const sid = new Types.ObjectId(sessionId);
  const uid = new Types.ObjectId(markedBy);
  await AttendanceRecord.bulkWrite(
    entries.map((e) => ({
      updateOne: {
        filter: { sessionId: sid, memberId: new Types.ObjectId(e.memberId) },
        update: { $set: { status: e.status, note: e.note || undefined, markedBy: uid } },
        upsert: true,
      },
    })),
  );
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
