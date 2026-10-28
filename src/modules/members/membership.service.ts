// Góc nhìn của thành viên đã liên kết tài khoản: nhóm mình tham gia và lịch sử điểm danh của mình.
import { Types } from "mongoose";
import { VI_COLLATION, connectDB, isValidId } from "@/lib/db";
import {
  AttendanceRecord,
  AttendanceSession,
  type AttendanceRecordRecord,
  type AttendanceSessionRecord,
} from "@/modules/attendance/attendance.model";
import type { AttendanceStatus } from "@/modules/attendance/attendance.statuses";
import { Group, type GroupRecord } from "@/modules/groups/group.model";
import { getAccountsByIds } from "@/modules/users/user.service";
import { Member, type MemberRecord } from "./member.model";

export type MembershipDTO = { memberId: string; memberName: string; groupId: string; groupName: string };

/** Các nhóm mà tài khoản đã liên kết làm thành viên */
export async function listMembershipsOfUser(userId: string): Promise<MembershipDTO[]> {
  if (!isValidId(userId)) return [];
  await connectDB();
  const members = await Member.find({ userId }).lean<MemberRecord[]>();
  if (members.length === 0) return [];
  const groups = await Group.find({ _id: { $in: members.map((m) => m.groupId) } }).select("name").lean<GroupRecord[]>();
  const names = new Map(groups.map((g) => [String(g._id), g.name]));
  return members
    .map((m) => ({
      memberId: String(m._id),
      memberName: m.name,
      groupId: String(m.groupId),
      groupName: names.get(String(m.groupId)) ?? "",
    }))
    .sort((a, b) => a.groupName.localeCompare(b.groupName, "vi"));
}

export type HistoryItem = {
  sessionId: string;
  title: string;
  date: Date;
  status: AttendanceStatus | null;
  note: string;
};

export type MyHistory = {
  memberName: string;
  groupName: string;
  items: HistoryItem[];
  counts: Partial<Record<AttendanceStatus, number>>;
  /** Số buổi đã có kết quả */
  recorded: number;
  /** Tỷ lệ chuyên cần (có mặt + muộn) / số buổi có kết quả, 0..1; null nếu chưa có buổi nào */
  rate: number | null;
};

/** Lịch sử điểm danh của chính người dùng ở một nhóm; null nếu không phải tài khoản đã liên kết */
export async function getMyHistory(memberId: string, userId: string): Promise<MyHistory | null> {
  if (!isValidId(memberId)) return null;
  await connectDB();
  const member = await Member.findById(memberId).lean<MemberRecord>();
  if (!member || !member.userId || String(member.userId) !== userId) return null;

  const [group, sessions, records] = await Promise.all([
    Group.findById(member.groupId).select("name").lean<GroupRecord>(),
    AttendanceSession.find({ groupId: member.groupId }).sort({ date: -1, createdAt: -1 }).lean<AttendanceSessionRecord[]>(),
    AttendanceRecord.find({ memberId: new Types.ObjectId(memberId) }).lean<AttendanceRecordRecord[]>(),
  ]);
  const bySession = new Map(records.map((r) => [String(r.sessionId), r]));

  const items: HistoryItem[] = sessions.map((s) => {
    const r = bySession.get(String(s._id));
    return { sessionId: String(s._id), title: s.title, date: s.date, status: r?.status ?? null, note: r?.note ?? "" };
  });

  const counts: Partial<Record<AttendanceStatus, number>> = {};
  for (const it of items) if (it.status) counts[it.status] = (counts[it.status] ?? 0) + 1;
  const recorded = items.filter((it) => it.status).length;
  const attended = (counts.present ?? 0) + (counts.late ?? 0);

  return {
    memberName: member.name,
    groupName: group?.name ?? "",
    items,
    counts,
    recorded,
    rate: recorded > 0 ? attended / recorded : null,
  };
}

export type RosterItem = {
  id: string;
  name: string;
  code: string;
  /** Tài khoản đã liên kết (chỉ tên và phiên bản ảnh, KHÔNG có email) */
  linked: { userId: string; name: string; avatarVersion: number | null } | null;
};

/**
 * Danh sách thành viên nhóm cho thành viên đã liên kết xem (chỉ đọc).
 * Không trả kết quả điểm danh, ghi chú hay email của người khác.
 */
export async function getRosterForMember(memberId: string, userId: string): Promise<RosterItem[] | null> {
  if (!isValidId(memberId)) return null;
  await connectDB();
  const me = await Member.findById(memberId).lean<MemberRecord>();
  if (!me || !me.userId || String(me.userId) !== userId) return null;

  const members = await Member.find({ groupId: me.groupId }).collation(VI_COLLATION).sort({ name: 1 }).lean<MemberRecord[]>();
  const accounts = await getAccountsByIds(members.map((m) => (m.userId ? String(m.userId) : "")).filter(Boolean));
  return members.map((m) => {
    const acc = m.userId ? accounts.get(String(m.userId)) : undefined;
    return {
      id: String(m._id),
      name: m.name,
      code: m.code ?? "",
      linked: acc ? { userId: acc.id, name: acc.name, avatarVersion: acc.avatarVersion } : null,
    };
  });
}
