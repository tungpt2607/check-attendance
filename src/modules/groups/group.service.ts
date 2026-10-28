import { Types } from "mongoose";
import { connectDB, isValidId } from "@/lib/db";
import { Member } from "@/modules/members/member.model";
import { AttendanceRecord, AttendanceSession } from "@/modules/attendance/attendance.model";
import { Group, type GroupRecord } from "./group.model";

export type GroupDTO = {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  ancestorIds: string[];
};

export type GroupTreeNode = GroupDTO & { memberCount: number; children: GroupTreeNode[] };

function toDTO(g: GroupRecord): GroupDTO {
  return {
    id: String(g._id),
    name: g.name,
    description: g.description ?? "",
    parentId: g.parentId ? String(g.parentId) : null,
    ancestorIds: (g.ancestors ?? []).map(String),
  };
}

/** Lấy một nhóm, chỉ khi người dùng là chủ nhóm. */
export async function getOwnedGroup(groupId: string, userId: string): Promise<GroupDTO | null> {
  if (!isValidId(groupId)) return null;
  await connectDB();
  const g = await Group.findOne({ _id: groupId, ownerId: userId }).lean<GroupRecord>();
  return g ? toDTO(g) : null;
}

/** Toàn bộ nhóm của người dùng, dựng thành cây. */
export async function getOwnedGroupTree(userId: string): Promise<GroupTreeNode[]> {
  await connectDB();
  const groups = await Group.find({ ownerId: userId }).sort({ name: 1 }).lean<GroupRecord[]>();
  const counts = await Member.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $match: { groupId: { $in: groups.map((g) => g._id) } } },
    { $group: { _id: "$groupId", n: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.n]));

  const nodes = new Map<string, GroupTreeNode>();
  for (const g of groups) {
    const dto = toDTO(g);
    nodes.set(dto.id, { ...dto, memberCount: countMap.get(dto.id) ?? 0, children: [] });
  }
  const roots: GroupTreeNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

export async function getChildGroups(groupId: string, userId: string): Promise<GroupDTO[]> {
  await connectDB();
  const list = await Group.find({ parentId: groupId, ownerId: userId }).sort({ name: 1 }).lean<GroupRecord[]>();
  return list.map(toDTO);
}

/** Đường dẫn từ nhóm gốc đến nhóm cha (để hiển thị breadcrumb). */
export async function getAncestors(group: GroupDTO, userId: string): Promise<GroupDTO[]> {
  if (group.ancestorIds.length === 0) return [];
  await connectDB();
  const list = await Group.find({ _id: { $in: group.ancestorIds }, ownerId: userId }).lean<GroupRecord[]>();
  const byId = new Map(list.map((g) => [String(g._id), toDTO(g)]));
  return group.ancestorIds.map((id) => byId.get(id)).filter((g): g is GroupDTO => !!g);
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

  if (input.parentId) {
    const parent = await Group.findOne({ _id: input.parentId, ownerId: input.ownerId }).lean<GroupRecord>();
    if (!parent) throw new Error("Không tìm thấy nhóm cha.");
    parentId = parent._id;
    ancestors = [...(parent.ancestors ?? []), parent._id];
  }

  const created = await Group.create({
    name: input.name.trim(),
    description: input.description?.trim() || undefined,
    parentId,
    ancestors,
    ownerId: new Types.ObjectId(input.ownerId),
  });
  return toDTO(created);
}

export async function renameGroup(groupId: string, userId: string, name: string) {
  await connectDB();
  await Group.updateOne({ _id: groupId, ownerId: userId }, { $set: { name: name.trim() } });
}

/** Xóa nhóm (chỉ khi không còn nhóm con), kèm thành viên và dữ liệu điểm danh. */
export async function deleteGroup(groupId: string, userId: string): Promise<boolean> {
  const group = await getOwnedGroup(groupId, userId);
  if (!group) return false;
  const childCount = await Group.countDocuments({ parentId: groupId });
  if (childCount > 0) return false;

  const sessionIds = await AttendanceSession.find({ groupId }).distinct("_id");
  await AttendanceRecord.deleteMany({ sessionId: { $in: sessionIds } });
  await AttendanceSession.deleteMany({ groupId });
  await Member.deleteMany({ groupId });
  await Group.deleteOne({ _id: groupId });
  return true;
}
