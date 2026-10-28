// Thống kê chuyên cần cho chủ nhóm: từng thành viên, từng nhóm và cả nhánh nhóm con.
// Cách tính thống nhất với trang nhóm tham gia:
//   tỷ lệ = (có mặt + muộn) / số buổi đã có kết quả của người đó.
import { Types } from "mongoose";
import { connectDB, isValidId } from "../../lib/db.js";
import { Group, type GroupRecord } from "../groups/group.model.js";
import { Member, type MemberRecord } from "../members/member.model.js";
import {
  AttendanceRecord,
  AttendanceSession,
  type AttendanceRecordRecord,
  type AttendanceSessionRecord,
  type RecordSource,
} from "./attendance.model.js";
import type { AttendanceStatus } from "./attendance.statuses.js";

export type Rate = {
  counts: Partial<Record<AttendanceStatus, number>>;
  /** Số lượt đã có kết quả */
  recorded: number;
  /** 0..1; null nếu chưa có kết quả nào */
  rate: number | null;
};

function emptyRate(): Rate {
  return { counts: {}, recorded: 0, rate: null };
}

function addStatus(r: Rate, status: AttendanceStatus) {
  r.counts[status] = (r.counts[status] ?? 0) + 1;
  r.recorded++;
}

function finish(r: Rate): Rate {
  const attended = (r.counts.present ?? 0) + (r.counts.late ?? 0);
  r.rate = r.recorded > 0 ? attended / r.recorded : null;
  return r;
}

/** Tỷ lệ chuyên cần của từng thành viên trong một nhóm (chỉ các buổi của chính nhóm đó) */
export async function getMemberRates(groupId: string): Promise<Map<string, Rate>> {
  const result = new Map<string, Rate>();
  if (!isValidId(groupId)) return result;
  await connectDB();
  const sessionIds = await AttendanceSession.distinct("_id", { groupId: new Types.ObjectId(groupId) });
  if (sessionIds.length === 0) return result;
  const records = await AttendanceRecord.find({ sessionId: { $in: sessionIds } })
    .select("memberId status")
    .lean<Pick<AttendanceRecordRecord, "memberId" | "status">[]>();
  for (const rec of records) {
    const key = String(rec.memberId);
    const r = result.get(key) ?? emptyRate();
    addStatus(r, rec.status);
    result.set(key, r);
  }
  for (const r of result.values()) finish(r);
  return result;
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
  const rootObj = roots.map((id) => new Types.ObjectId(id));

  // Mọi nhóm thuộc các nhánh: chính nó hoặc có nó trong danh sách tổ tiên
  const groups = await Group.find({ $or: [{ _id: { $in: rootObj } }, { ancestors: { $in: rootObj } }] })
    .select("_id ancestors")
    .lean<Pick<GroupRecord, "_id" | "ancestors">[]>();
  const rootSet = new Set(roots);
  /** nhóm → các gốc nhánh chứa nó (một nhóm có thể nằm trong nhiều nhánh nếu gốc lồng nhau) */
  const rootsOf = new Map<string, string[]>();
  for (const g of groups) {
    const id = String(g._id);
    const list = [id, ...(g.ancestors ?? []).map(String)].filter((x) => rootSet.has(x));
    rootsOf.set(id, list);
  }
  for (const r of roots) result.set(r, { ...emptyRate(), memberCount: 0, sessionCount: 0 });

  const groupIds = groups.map((g) => g._id);
  const [members, sessions] = await Promise.all([
    Member.find({ groupId: { $in: groupIds } }).select("groupId").lean<Pick<MemberRecord, "groupId">[]>(),
    AttendanceSession.find({ groupId: { $in: groupIds } }).select("_id groupId").lean<Pick<AttendanceSessionRecord, "_id" | "groupId">[]>(),
  ]);
  for (const m of members) for (const r of rootsOf.get(String(m.groupId)) ?? []) result.get(r)!.memberCount++;
  const sessionGroup = new Map(sessions.map((s) => [String(s._id), String(s.groupId)]));
  for (const s of sessions) for (const r of rootsOf.get(String(s.groupId)) ?? []) result.get(r)!.sessionCount++;

  if (sessions.length > 0) {
    const records = await AttendanceRecord.find({ sessionId: { $in: sessions.map((s) => s._id) } })
      .select("sessionId status")
      .lean<Pick<AttendanceRecordRecord, "sessionId" | "status">[]>();
    for (const rec of records) {
      const g = sessionGroup.get(String(rec.sessionId));
      for (const r of (g && rootsOf.get(g)) || []) addStatus(result.get(r)!, rec.status);
    }
  }
  for (const r of result.values()) finish(r);
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
    AttendanceSession.find({ groupId: new Types.ObjectId(groupId) })
      .sort({ date: -1, createdAt: -1 })
      .select("_id title date")
      .lean<Pick<AttendanceSessionRecord, "_id" | "title" | "date">[]>(),
    AttendanceRecord.find({ memberId: new Types.ObjectId(memberId) }).lean<AttendanceRecordRecord[]>(),
  ]);
  const bySession = new Map(records.map((r) => [String(r.sessionId), r]));
  const rate = emptyRate();
  const items = sessions.map((s) => {
    const r = bySession.get(String(s._id));
    if (r) addStatus(rate, r.status);
    return {
      sessionId: String(s._id),
      title: s.title,
      date: s.date,
      status: r?.status ?? null,
      note: r?.note ?? "",
      source: r?.source ?? null,
      checkedInAt: r?.source === "self" ? (r.checkedInAt ?? null) : null,
    };
  });
  return { items, rate: finish(rate) };
}
