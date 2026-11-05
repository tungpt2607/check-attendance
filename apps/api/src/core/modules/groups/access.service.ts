// Quyền với một nhóm: chủ nhóm hoặc người quản lý (quyền áp dụng cho nhóm đó và mọi nhóm con bên trong).
// Mọi API của nhóm/thành viên/buổi kiểm tra quyền qua đây (routes/owned.ts → requireGroupAccess).
import { GROUP_PERMISSIONS, normalizePermissions, type GroupAccess, type GroupPermission } from "@check-attendance/shared/permissions";
import type { Types } from "mongoose";
import { connectDB, isValidId } from "../../lib/db.js";
import { Group, type GroupRecord } from "./group.model.js";

type Chain = Pick<GroupRecord, "_id" | "ownerId" | "managers" | "ancestors">;

/** Quyền của userId trên chuỗi nhóm (từ gốc tới nhóm đang xét); null = không có quyền */
export function accessFromChain(chain: Chain[], userId: string): GroupAccess | null {
  if (chain.some((g) => String(g.ownerId) === userId)) return { role: "owner", permissions: [...GROUP_PERMISSIONS] };
  const perms = new Set<GroupPermission>();
  let isManager = false;
  for (const g of chain) {
    const m = g.managers?.find((x) => String(x.userId) === userId);
    if (m) {
      isManager = true;
      for (const p of m.permissions) perms.add(p);
    }
  }
  return isManager ? { role: "manager", permissions: normalizePermissions([...perms]) } : null;
}

/** Nhóm (đầy đủ) kèm quyền của người dùng; null nếu nhóm không tồn tại hoặc không có quyền */
export async function getGroupWithAccess(groupId: string, userId: string): Promise<{ group: GroupRecord; access: GroupAccess } | null> {
  if (!isValidId(groupId) || !isValidId(userId)) return null;
  await connectDB();
  const group = await Group.findById(groupId).lean<GroupRecord>();
  if (!group) return null;
  // Chủ nhóm trực tiếp: không cần đọc nhóm cha
  if (String(group.ownerId) === userId) return { group, access: { role: "owner", permissions: [...GROUP_PERMISSIONS] } };
  const ancestors = group.ancestors?.length
    ? await Group.find({ _id: { $in: group.ancestors } }).select("_id ownerId managers ancestors").lean<Chain[]>()
    : [];
  const access = accessFromChain([...ancestors, group], userId);
  return access ? { group, access } : null;
}

/** Nhóm gốc của nhánh mà người dùng có quyền (nhóm làm chủ hoặc được thêm làm quản lý trực tiếp) */
export async function directlyAccessibleGroupIds(userId: string): Promise<Types.ObjectId[]> {
  if (!isValidId(userId)) return [];
  await connectDB();
  return Group.find({ $or: [{ ownerId: userId }, { "managers.userId": userId }] }).distinct("_id");
}
