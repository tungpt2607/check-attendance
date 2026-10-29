// Dữ liệu cho trang quản trị (CMS): tổng quan, tài khoản, nhóm. Không kiểm tra quyền — route phải requireAdmin.
import mongoose, { type Types } from "mongoose";
import { connectDB, isValidId } from "../../lib/db.js";
import { resolveRole, roleSource } from "../../lib/roles.js";
import { AttendanceRecord, AttendanceSession } from "../attendance/attendance.model.js";
import { Group, type GroupRecord } from "../groups/group.model.js";
import { Member, type MemberRecord } from "../members/member.model.js";
import { User, type UserRecord } from "../users/user.model.js";

const TIME_ZONE = "Asia/Ho_Chi_Minh";
const DAY_MS = 24 * 60 * 60 * 1000;
const oid = (id: string) => new mongoose.Types.ObjectId(id);
const WITHOUT_AVATAR_DATA = "-avatar.data -passwordHash";

/** Chuỗi tìm kiếm → biểu thức không phân biệt hoa thường (đã thoát ký tự đặc biệt) */
function searchRegex(q: string | undefined): RegExp | null {
  const t = q?.trim();
  if (!t) return null;
  return new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
}

function avatarVersion(u: Pick<UserRecord, "avatar">): number | null {
  return u.avatar?.updatedAt ? new Date(u.avatar.updatedAt).getTime() : null;
}

function publicAccount(u: UserRecord) {
  return { id: String(u._id), name: u.name, email: u.email, avatarVersion: avatarVersion(u) };
}

/** Đếm theo một trường id (vd. số thành viên của từng nhóm) */
async function countBy(model: mongoose.Model<any>, field: string, ids: Types.ObjectId[], extra: Record<string, unknown> = {}) {
  if (ids.length === 0) return new Map<string, number>();
  const rows = await model.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $match: { [field]: { $in: ids }, ...extra } },
    { $group: { _id: `$${field}`, n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.n]));
}

// ---------- Tổng quan ----------

/** Ngày YYYY-MM-DD theo giờ Việt Nam */
function vnDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(d);
}

async function dailyCounts(model: mongoose.Model<any>, field: string, since: Date, extra: Record<string, unknown> = {}) {
  const rows = await model.aggregate<{ _id: string; n: number }>([
    { $match: { [field]: { $gte: since }, ...extra } },
    { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: `$${field}`, timezone: TIME_ZONE } }, n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id, r.n]));
}

export async function getAdminStats() {
  await connectDB();
  const since = new Date(Date.now() - 30 * DAY_MS);
  const [users, disabledUsers, groups, members, linkedMembers, sessions, selfCheckins, newUsers, newSessions, newCheckins, recent] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ disabledAt: { $ne: null } }),
      Group.countDocuments(),
      Member.countDocuments(),
      Member.countDocuments({ userId: { $ne: null } }),
      AttendanceSession.countDocuments(),
      AttendanceRecord.countDocuments({ source: "self" }),
      dailyCounts(User, "createdAt", since),
      dailyCounts(AttendanceSession, "createdAt", since),
      dailyCounts(AttendanceRecord, "checkedInAt", since, { source: "self" }),
      User.find().select(WITHOUT_AVATAR_DATA).sort({ createdAt: -1 }).limit(5).lean<UserRecord[]>(),
    ]);

  const daily = Array.from({ length: 30 }, (_, i) => {
    const date = vnDate(new Date(Date.now() - (29 - i) * DAY_MS));
    return {
      date,
      newUsers: newUsers.get(date) ?? 0,
      sessions: newSessions.get(date) ?? 0,
      selfCheckins: newCheckins.get(date) ?? 0,
    };
  });

  return {
    totals: { users, disabledUsers, groups, members, linkedMembers, sessions, selfCheckins },
    daily,
    recentUsers: recent.map((u) => ({ ...publicAccount(u), createdAt: u.createdAt.toISOString() })),
  };
}

// ---------- Tài khoản ----------

function userRow(u: UserRecord, owned: Map<string, number>, memberships: Map<string, number>) {
  const id = String(u._id);
  return {
    ...publicAccount(u),
    role: resolveRole(u),
    roleSource: roleSource(u.email),
    disabled: !!u.disabledAt,
    createdAt: u.createdAt.toISOString(),
    ownedGroupCount: owned.get(id) ?? 0,
    membershipCount: memberships.get(id) ?? 0,
  };
}

export async function listUsersAdmin(opts: { q?: string; page: number; pageSize: number }) {
  await connectDB();
  const re = searchRegex(opts.q);
  const filter = re ? { $or: [{ name: re }, { email: re }] } : {};
  const [list, total] = await Promise.all([
    User.find(filter)
      .select(WITHOUT_AVATAR_DATA)
      .sort({ createdAt: -1 })
      .skip((opts.page - 1) * opts.pageSize)
      .limit(opts.pageSize)
      .lean<UserRecord[]>(),
    User.countDocuments(filter),
  ]);
  const ids = list.map((u) => u._id);
  const [owned, memberships] = await Promise.all([countBy(Group, "ownerId", ids), countBy(Member, "userId", ids)]);
  return { items: list.map((u) => userRow(u, owned, memberships)), total };
}

export async function getUserAdmin(userId: string) {
  if (!isValidId(userId)) return null;
  await connectDB();
  const u = await User.findById(userId).select(WITHOUT_AVATAR_DATA).lean<UserRecord>();
  if (!u) return null;
  const [ownedGroups, memberRows] = await Promise.all([
    Group.find({ ownerId: u._id }).sort({ createdAt: 1 }).lean<GroupRecord[]>(),
    Member.find({ userId: u._id }).lean<MemberRecord[]>(),
  ]);
  const [memberCounts, groupNames] = await Promise.all([
    countBy(Member, "groupId", ownedGroups.map((g) => g._id)),
    Group.find({ _id: { $in: memberRows.map((m) => m.groupId) } }).select("name").lean<Pick<GroupRecord, "_id" | "name">[]>(),
  ]);
  const names = new Map(groupNames.map((g) => [String(g._id), g.name]));
  const row = userRow(u, new Map([[String(u._id), ownedGroups.length]]), new Map([[String(u._id), memberRows.length]]));
  return {
    ...row,
    disabledAt: u.disabledAt ? u.disabledAt.toISOString() : null,
    ownedGroups: ownedGroups.map((g) => ({
      id: String(g._id),
      name: g.name,
      parentId: g.parentId ? String(g.parentId) : null,
      memberCount: memberCounts.get(String(g._id)) ?? 0,
    })),
    memberships: memberRows.map((m) => ({
      memberId: String(m._id),
      memberName: m.name,
      groupId: String(m.groupId),
      groupName: names.get(String(m.groupId)) ?? "(đã xoá)",
    })),
  };
}

// ---------- Nhóm ----------

/** Thông tin chung cho dòng nhóm: đường dẫn nhóm cha, chủ nhóm, số thành viên/buổi/nhóm con */
async function groupRows(list: GroupRecord[]) {
  const ids = list.map((g) => g._id);
  const ancestorIds = [...new Set(list.flatMap((g) => g.ancestors.map(String)))].map(oid);
  const ownerIds = [...new Set(list.map((g) => String(g.ownerId)))].map(oid);
  const [ancestors, owners, members, sessions, children] = await Promise.all([
    Group.find({ _id: { $in: ancestorIds } }).select("name").lean<Pick<GroupRecord, "_id" | "name">[]>(),
    User.find({ _id: { $in: ownerIds } }).select(WITHOUT_AVATAR_DATA).lean<UserRecord[]>(),
    countBy(Member, "groupId", ids),
    countBy(AttendanceSession, "groupId", ids),
    countBy(Group, "parentId", ids),
  ]);
  const names = new Map(ancestors.map((g) => [String(g._id), g.name]));
  const ownerMap = new Map(owners.map((u) => [String(u._id), publicAccount(u)]));
  return list.map((g) => {
    const id = String(g._id);
    return {
      id,
      name: g.name,
      parentId: g.parentId ? String(g.parentId) : null,
      path: g.ancestors.map((a) => names.get(String(a)) ?? "…").join(" / "),
      owner: ownerMap.get(String(g.ownerId)) ?? null,
      memberCount: members.get(id) ?? 0,
      sessionCount: sessions.get(id) ?? 0,
      childCount: children.get(id) ?? 0,
      createdAt: g.createdAt.toISOString(),
    };
  });
}

export async function listGroupsAdmin(opts: { q?: string; page: number; pageSize: number }) {
  await connectDB();
  const re = searchRegex(opts.q);
  let filter: Record<string, unknown> = {};
  if (re) {
    // Tìm theo tên nhóm hoặc tên/email chủ nhóm
    const owners = await User.find({ $or: [{ name: re }, { email: re }] }).distinct("_id");
    filter = { $or: [{ name: re }, { ownerId: { $in: owners } }] };
  }
  const [list, total] = await Promise.all([
    Group.find(filter)
      .sort({ createdAt: -1 })
      .skip((opts.page - 1) * opts.pageSize)
      .limit(opts.pageSize)
      .lean<GroupRecord[]>(),
    Group.countDocuments(filter),
  ]);
  return { items: await groupRows(list), total };
}

export async function getGroupAdminBase(groupId: string) {
  if (!isValidId(groupId)) return null;
  await connectDB();
  const g = await Group.findById(groupId).lean<GroupRecord>();
  if (!g) return null;
  const [[row], ancestors, children, descendantCount] = await Promise.all([
    groupRows([g]),
    Group.find({ _id: { $in: g.ancestors } }).select("name").lean<Pick<GroupRecord, "_id" | "name">[]>(),
    Group.find({ parentId: g._id }).sort({ name: 1 }).lean<GroupRecord[]>(),
    Group.countDocuments({ ancestors: g._id }),
  ]);
  const childMembers = await countBy(Member, "groupId", children.map((c) => c._id));
  const ancestorNames = new Map(ancestors.map((a) => [String(a._id), a.name]));
  return {
    ...row,
    ancestors: g.ancestors.map((a) => ({ id: String(a), name: ancestorNames.get(String(a)) ?? "…" })),
    children: children.map((c) => ({ id: String(c._id), name: c.name, memberCount: childMembers.get(String(c._id)) ?? 0 })),
    descendantCount,
  };
}

// ---------- Thông báo hệ thống ----------

/** Mọi tài khoản đang hoạt động (người nhận thông báo hệ thống) */
export async function getActiveUserIds(): Promise<string[]> {
  await connectDB();
  const ids = await User.find({ disabledAt: null }).distinct("_id");
  return ids.map(String);
}

/** Số tài khoản đang hoạt động còn bật nhận email thông báo */
export async function countEmailRecipients(): Promise<number> {
  await connectDB();
  return User.countDocuments({ disabledAt: null, "notificationPrefs.email": { $ne: false } });
}
