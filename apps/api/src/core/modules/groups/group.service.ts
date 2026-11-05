import mongoose, { type Types } from "mongoose";
import { VI_COLLATION, connectDB, isValidId } from "../../lib/db.js";
import { Invite, LinkRequest } from "../invites/invite.model.js";
import { FaceProfile } from "../faces/face.model.js";
import { Member } from "../members/member.model.js";
import { AttendanceRecord, AttendanceSession } from "../attendance/attendance.model.js";
import { resolveSubject } from "../notifications/notification.service.js";
import type { GroupAccess } from "@check-attendance/shared/permissions";
import { accessFromChain, directlyAccessibleGroupIds } from "./access.service.js";
import { Group, type GroupRecord } from "./group.model.js";

export type GroupDTO = {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  ancestorIds: string[];
};

export type GroupTreeNode = GroupDTO & { memberCount: number; access: GroupAccess; children: GroupTreeNode[] };

function toDTO(g: GroupRecord): GroupDTO {
  return {
    id: String(g._id),
    name: g.name,
    description: g.description ?? "",
    parentId: g.parentId ? String(g.parentId) : null,
    ancestorIds: (g.ancestors ?? []).map(String),
  };
}

export { toDTO as groupToDTO };

/** Chỉ lấy tên nhóm, không kiểm tra quyền (dùng cho trang tự điểm danh công khai). */
export async function getGroupName(groupId: string): Promise<string | null> {
  if (!isValidId(groupId)) return null;
  await connectDB();
  const g = await Group.findById(groupId).select("name").lean<Pick<GroupRecord, "name">>();
  return g?.name ?? null;
}

/**
 * Những người nhận thông báo về yêu cầu liên kết của nhóm: chủ nhóm và người quản lý có quyền "Liên kết tài khoản"
 * ở nhóm này hoặc nhóm cha.
 */
export async function getGroupManagerIds(groupId: string): Promise<string[]> {
  if (!isValidId(groupId)) return [];
  await connectDB();
  const g = await Group.findById(groupId).select("ownerId ancestors managers").lean<GroupRecord>();
  if (!g) return [];
  const chain = g.ancestors?.length
    ? [...(await Group.find({ _id: { $in: g.ancestors } }).select("ownerId managers").lean<GroupRecord[]>()), g]
    : [g];
  const ids = new Set<string>(chain.map((x) => String(x.ownerId)));
  for (const x of chain) for (const m of x.managers ?? []) if (m.permissions.includes("links")) ids.add(String(m.userId));
  return [...ids];
}

/**
 * Mọi nhóm người dùng làm chủ hoặc quản lý (kể cả nhóm con bên trong), dựng thành cây.
 * Nhóm gốc của cây là nhóm cao nhất người dùng có quyền.
 */
export async function getManagedGroupTree(userId: string): Promise<GroupTreeNode[]> {
  await connectDB();
  const direct = await directlyAccessibleGroupIds(userId);
  if (direct.length === 0) return [];
  const groups = await Group.find({ $or: [{ _id: { $in: direct } }, { ancestors: { $in: direct } }] })
    .collation(VI_COLLATION)
    .sort({ name: 1 })
    .lean<GroupRecord[]>();
  const counts = await Member.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $match: { groupId: { $in: groups.map((g) => g._id) } } },
    { $group: { _id: "$groupId", n: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.n]));
  const byId = new Map(groups.map((g) => [String(g._id), g]));

  const nodes = new Map<string, GroupTreeNode>();
  for (const g of groups) {
    const chain = [...(g.ancestors ?? []).map((a) => byId.get(String(a))).filter((x): x is GroupRecord => !!x), g];
    const access = accessFromChain(chain, userId) ?? { role: "manager" as const, permissions: [] };
    const dto = toDTO(g);
    nodes.set(dto.id, { ...dto, memberCount: countMap.get(dto.id) ?? 0, access, children: [] });
  }
  const roots: GroupTreeNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

/** Nhóm con trực tiếp (người có quyền với nhóm cha thì có quyền với nhóm con) */
export async function getChildGroups(groupId: string): Promise<GroupDTO[]> {
  await connectDB();
  const list = await Group.find({ parentId: groupId }).collation(VI_COLLATION).sort({ name: 1 }).lean<GroupRecord[]>();
  return list.map(toDTO);
}

/** Đường dẫn từ nhóm gốc đến nhóm cha (breadcrumb): chỉ những nhóm cha người dùng có quyền xem */
export async function getAncestors(group: GroupDTO, userId: string): Promise<GroupDTO[]> {
  if (group.ancestorIds.length === 0) return [];
  await connectDB();
  const list = await Group.find({ _id: { $in: group.ancestorIds } }).lean<GroupRecord[]>();
  const byId = new Map(list.map((g) => [String(g._id), g]));
  const chain = group.ancestorIds.map((id) => byId.get(id)).filter((g): g is GroupRecord => !!g);
  // Từ nhóm cao nhất mà người dùng là chủ/quản lý trở xuống
  const top = chain.findIndex((g) => String(g.ownerId) === userId || (g.managers ?? []).some((m) => String(m.userId) === userId));
  return top < 0 ? [] : chain.slice(top).map(toDTO);
}

export async function createGroup(input: {
  name: string;
  description?: string;
  parentId?: string | null;
  ownerId: string;
}): Promise<GroupDTO> {
  await connectDB();
  let parentId: Types.ObjectId | null = null;
  let ancestors: Types.ObjectId[] = [];

  let ownerId = new mongoose.Types.ObjectId(input.ownerId);
  if (input.parentId) {
    // Nơi gọi đã kiểm tra quyền tạo nhóm con; nhóm con luôn thuộc chủ của nhóm cha (kể cả khi người quản lý tạo)
    const parent = await Group.findById(input.parentId).lean<GroupRecord>();
    if (!parent) throw new Error("Không tìm thấy nhóm cha.");
    parentId = parent._id;
    ancestors = [...(parent.ancestors ?? []), parent._id];
    ownerId = parent.ownerId;
  }

  const created = await Group.create({
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    parentId,
    ancestors,
    ownerId,
  });
  return toDTO(created);
}

/** Nơi gọi đã kiểm tra quyền */
export async function renameGroup(groupId: string, name: string) {
  await connectDB();
  await Group.updateOne({ _id: groupId }, { $set: { name: name.trim() } });
}

/** Xóa nhóm (chỉ khi không còn nhóm con), kèm thành viên và dữ liệu điểm danh. Nơi gọi đã kiểm tra quyền chủ nhóm. */
export async function deleteGroup(groupId: string): Promise<boolean> {
  await connectDB();
  const childCount = await Group.countDocuments({ parentId: groupId });
  if (childCount > 0) return false;
  await purgeGroups([groupId]);
  return true;
}

/** Xoá hẳn các nhóm và mọi dữ liệu của chúng (buổi, kết quả, lời mời, yêu cầu, thành viên, khuôn mặt của thành viên). Không kiểm tra quyền. */
async function purgeGroups(groupIds: string[]): Promise<{ groups: number; members: number; sessions: number }> {
  await connectDB();
  const ids = groupIds.filter(isValidId).map((id) => new mongoose.Types.ObjectId(id));
  if (ids.length === 0) return { groups: 0, members: 0, sessions: 0 };
  const inGroups = { groupId: { $in: ids } };
  const sessionIds = await AttendanceSession.find(inGroups).distinct("_id");
  await AttendanceRecord.deleteMany({ sessionId: { $in: sessionIds } });
  await AttendanceSession.deleteMany(inGroups);
  await Invite.deleteMany(inGroups);
  // Yêu cầu đang chờ bị xóa theo: thông báo về chúng chuyển thành "Không còn hiệu lực"
  const pendingIds = await LinkRequest.find({ ...inGroups, status: "pending" }).distinct("_id");
  await resolveSubject("link_request", pendingIds.map(String), "closed");
  await LinkRequest.deleteMany(inGroups);
  // Khuôn mặt lưu riêng ở thành viên chưa liên kết (khuôn mặt của tài khoản thì giữ, thuộc về người dùng)
  const memberIds = await Member.find(inGroups).distinct("_id");
  await FaceProfile.deleteMany({ memberId: { $in: memberIds } });
  const members = await Member.deleteMany(inGroups);
  const groups = await Group.deleteMany({ _id: { $in: ids } });
  return { groups: groups.deletedCount, members: members.deletedCount, sessions: sessionIds.length };
}

/** Quản trị: xoá một nhóm cùng mọi nhóm con các cấp bên trong. Không kiểm tra quyền (nơi gọi phải là admin). */
export async function deleteGroupTree(groupId: string) {
  if (!isValidId(groupId)) return null;
  await connectDB();
  const exists = await Group.exists({ _id: groupId });
  if (!exists) return null;
  const descendants = await Group.find({ ancestors: new mongoose.Types.ObjectId(groupId) }).distinct("_id");
  return purgeGroups([groupId, ...descendants.map(String)]);
}
