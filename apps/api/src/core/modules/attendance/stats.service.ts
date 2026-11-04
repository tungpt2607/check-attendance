// Thống kê chuyên cần cho chủ nhóm: từng thành viên, từng nhóm và cả nhánh nhóm con.
// Cách tính thống nhất với trang nhóm tham gia:
//   tỷ lệ = (có mặt + muộn) / số buổi đã có kết quả của người đó.
import mongoose, { type Types } from "mongoose";
import { connectDB, isValidId } from "../../lib/db.js";
import { Group, type GroupRecord } from "../groups/group.model.js";
import { Member } from "../members/member.model.js";
import {
  AttendanceRecord,
  AttendanceSession,
  type AttendanceRecordRecord,
  type AttendanceSessionRecord,
  type RecordSource,
} from "./attendance.model.js";
import { hasCheckInTime, type AttendanceStatus } from "./attendance.statuses.js";
import { emptyRate, finish, rateOf, ratesByKey, type Rate } from "./rate.js";

export type { Rate };

type CountRow<K extends string> = { _id: Record<K, Types.ObjectId> & { st: AttendanceStatus }; n: number };

/** Tỷ lệ chuyên cần của từng thành viên trong một nhóm (chỉ các buổi của chính nhóm đó) */
export async function getMemberRates(groupId: string): Promise<Map<string, Rate>> {
  if (!isValidId(groupId)) return new Map();
  await connectDB();
  const sessionIds = await AttendanceSession.distinct("_id", { groupId: new mongoose.Types.ObjectId(groupId) });
  if (sessionIds.length === 0) return new Map();
  // MongoDB đếm sẵn theo (thành viên, trạng thái): không tải từng bản ghi về
  const rows = await AttendanceRecord.aggregate<CountRow<"m">>([
    { $match: { sessionId: { $in: sessionIds } } },
    { $group: { _id: { m: "$memberId", st: "$status" }, n: { $sum: 1 } } },
  ]);
  return ratesByKey(
    rows.map((r) => ({ member: String(r._id.m), status: r._id.st, n: r.n })),
    (r) => [r.member],
  );
}

export type BranchStat = Rate & { memberCount: number; sessionCount: number };

/**
 * Tỷ lệ chung của nhiều nhánh nhóm: mỗi nhánh gồm nhóm gốc và mọi nhóm con bên trong.
 * Trả về theo id nhóm gốc của từng nhánh.
 */
export async function getBranchStats(rootIds: string[]): Promise<Map<string, BranchStat>> {
  const result = new Map<string, BranchStat>();
  const roots = rootIds.filter(isValidId);
  if (roots.length === 0) return result;
  await connectDB();
  const rootObj = roots.map((id) => new mongoose.Types.ObjectId(id));

  // Mọi nhóm thuộc các nhánh: chính nó hoặc có nó trong danh sách tổ tiên
  const groups = await Group.find({ $or: [{ _id: { $in: rootObj } }, { ancestors: { $in: rootObj } }] })
    .select("_id ancestors")
    .lean<Pick<GroupRecord, "_id" | "ancestors">[]>();
  const rootSet = new Set(roots);
  /** nhóm → các gốc nhánh chứa nó (một nhóm có thể nằm trong nhiều nhánh nếu gốc lồng nhau) */
  const rootsOf = new Map<string, string[]>();
  for (const g of groups) {
    const id = String(g._id);
    rootsOf.set(id, [id, ...(g.ancestors ?? []).map(String)].filter((x) => rootSet.has(x)));
  }
  for (const r of roots) result.set(r, { ...emptyRate(), memberCount: 0, sessionCount: 0 });

  const groupIds = groups.map((g) => g._id);
  // Số thành viên mỗi nhóm do MongoDB đếm; buổi chỉ lấy _id + groupId để biết bản ghi thuộc nhóm nào
  const [memberCounts, sessions] = await Promise.all([
    Member.aggregate<{ _id: Types.ObjectId; n: number }>([
      { $match: { groupId: { $in: groupIds } } },
      { $group: { _id: "$groupId", n: { $sum: 1 } } },
    ]),
    AttendanceSession.find({ groupId: { $in: groupIds } }).select("_id groupId").lean<Pick<AttendanceSessionRecord, "_id" | "groupId">[]>(),
  ]);
  for (const m of memberCounts) for (const r of rootsOf.get(String(m._id)) ?? []) result.get(r)!.memberCount += m.n;
  const sessionGroup = new Map(sessions.map((s) => [String(s._id), String(s.groupId)]));
  for (const s of sessions) for (const r of rootsOf.get(String(s.groupId)) ?? []) result.get(r)!.sessionCount++;

  if (sessions.length > 0) {
    // MongoDB đếm sẵn theo (buổi, trạng thái)
    const rows = await AttendanceRecord.aggregate<CountRow<"s">>([
      { $match: { sessionId: { $in: sessions.map((s) => s._id) } } },
      { $group: { _id: { s: "$sessionId", st: "$status" }, n: { $sum: 1 } } },
    ]);
    ratesByKey(
      rows.map((r) => ({ session: String(r._id.s), status: r._id.st, n: r.n })),
      (r) => {
        const g = sessionGroup.get(r.session);
        return (g && rootsOf.get(g)) || [];
      },
      result,
    );
  } else {
    for (const r of result.values()) finish(r);
  }
  return result;
}

export type MemberHistoryItem = {
  sessionId: string;
  title: string;
  date: Date;
  status: AttendanceStatus | null;
  note: string;
  source: RecordSource | null;
  checkedInAt: Date | null;
};

/** Lịch sử điểm danh từng buổi của một thành viên (trong nhóm của thành viên đó) */
export async function getMemberHistory(memberId: string, groupId: string): Promise<{ items: MemberHistoryItem[]; rate: Rate }> {
  await connectDB();
  const [sessions, records] = await Promise.all([
    AttendanceSession.find({ groupId: new mongoose.Types.ObjectId(groupId) })
      .sort({ date: -1, createdAt: -1 })
      .select("_id title date")
      .lean<Pick<AttendanceSessionRecord, "_id" | "title" | "date">[]>(),
    AttendanceRecord.find({ memberId: new mongoose.Types.ObjectId(memberId) }).lean<AttendanceRecordRecord[]>(),
  ]);
  const bySession = new Map(records.map((r) => [String(r.sessionId), r]));
  const items = sessions.map((s) => {
    const r = bySession.get(String(s._id));
    return {
      sessionId: String(s._id),
      title: s.title,
      date: s.date,
      status: r?.status ?? null,
      note: r?.note ?? "",
      source: r?.source ?? null,
      checkedInAt: hasCheckInTime(r?.source) ? (r?.checkedInAt ?? null) : null,
    };
  });
  return { items, rate: rateOf(items.map((it) => it.status)) };
}
