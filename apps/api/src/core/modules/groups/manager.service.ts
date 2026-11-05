// Người quản lý nhóm: thêm (theo email hoặc link mời), sửa quyền, gỡ, chuyển quyền chủ nhóm.
// Nơi gọi (routes/managers.ts) đã kiểm tra quyền chủ nhóm.
import { randomBytes } from "node:crypto";
import { GROUP_PERMISSIONS, normalizePermissions, type GroupPermission } from "@check-attendance/shared/permissions";
import mongoose from "mongoose";
import { connectDB, isValidId } from "../../lib/db.js";
import { Invite, type InviteRecord } from "../invites/invite.model.js";
import { Group, type GroupRecord } from "./group.model.js";

const oid = (id: string) => new mongoose.Types.ObjectId(id);

/** Link mời quản lý hết hạn sau 7 ngày, dùng 1 lần */
const MANAGER_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type ManagerEntry = {
  userId: string;
  permissions: GroupPermission[];
  addedAt: Date;
  /** null = thêm trực tiếp ở nhóm này; có giá trị = thêm ở nhóm cha */
  fromGroup: { id: string; name: string } | null;
};

/** Chủ nhóm và người quản lý (thêm ở nhóm này + kế thừa từ nhóm cha) */
export async function listGroupManagers(groupId: string): Promise<{ ownerId: string; managers: ManagerEntry[] } | null> {
  if (!isValidId(groupId)) return null;
  await connectDB();
  const g = await Group.findById(groupId).select("ownerId ancestors managers").lean<GroupRecord>();
  if (!g) return null;
  const ancestors = g.ancestors?.length
    ? await Group.find({ _id: { $in: g.ancestors } }).select("name managers").lean<GroupRecord[]>()
    : [];
  const byId = new Map(ancestors.map((a) => [String(a._id), a]));
  const managers: ManagerEntry[] = [];
  // Nhóm cha gần nhất trước, rồi tới nhóm này (thêm trực tiếp)
  for (const a of [...(g.ancestors ?? [])].reverse().map((id) => byId.get(String(id))).filter((x): x is GroupRecord => !!x)) {
    for (const m of a.managers ?? []) {
      managers.push({ userId: String(m.userId), permissions: m.permissions, addedAt: m.addedAt, fromGroup: { id: String(a._id), name: a.name } });
    }
  }
  for (const m of g.managers ?? []) {
    managers.push({ userId: String(m.userId), permissions: m.permissions, addedAt: m.addedAt, fromGroup: null });
  }
  return { ownerId: String(g.ownerId), managers };
}

/**
 * Thêm người quản lý, hoặc cập nhật quyền nếu đã là quản lý của nhóm này.
 * Trả về "owner" nếu người đó đang là chủ nhóm (không cần thêm).
 */
export async function upsertManager(groupId: string, userId: string, permissions: GroupPermission[], addedBy: string): Promise<"added" | "updated" | "owner"> {
  await connectDB();
  const perms = normalizePermissions(permissions);
  const g = await Group.findById(groupId).select("ownerId").lean<GroupRecord>();
  if (!g || String(g.ownerId) === userId) return "owner";
  const updated = await Group.updateOne({ _id: groupId, "managers.userId": oid(userId) }, { $set: { "managers.$.permissions": perms } });
  if (updated.matchedCount > 0) return "updated";
  await Group.updateOne(
    { _id: groupId, "managers.userId": { $ne: oid(userId) } },
    { $push: { managers: { userId: oid(userId), permissions: perms, addedBy: oid(addedBy), addedAt: new Date() } } },
  );
  return "added";
}

/** Sửa quyền của người quản lý (thêm trực tiếp ở nhóm này); false nếu không phải quản lý của nhóm này */
export async function updateManagerPermissions(groupId: string, userId: string, permissions: GroupPermission[]): Promise<boolean> {
  await connectDB();
  const res = await Group.updateOne(
    { _id: groupId, "managers.userId": oid(userId) },
    { $set: { "managers.$.permissions": normalizePermissions(permissions) } },
  );
  return res.matchedCount > 0;
}

export async function removeManager(groupId: string, userId: string): Promise<boolean> {
  await connectDB();
  const res = await Group.updateOne({ _id: groupId }, { $pull: { managers: { userId: oid(userId) } } });
  return res.modifiedCount > 0;
}

// ---------- Link mời quản lý ----------

export async function createManagerInvite(groupId: string, permissions: GroupPermission[], createdBy: string) {
  await connectDB();
  const token = randomBytes(12).toString("base64url");
  const expiresAt = new Date(Date.now() + MANAGER_INVITE_TTL_MS);
  await Invite.create({
    token,
    kind: "manager",
    groupId: oid(groupId),
    memberId: null,
    createdBy: oid(createdBy),
    expiresAt,
    permissions: normalizePermissions(permissions),
  });
  return { token, expiresAt };
}

export type ManagerInviteCheck = { ok: true; invite: InviteRecord } | { ok: false; reason: "not_found" | "revoked" | "used" | "expired" };

export async function checkManagerInvite(token: string): Promise<ManagerInviteCheck> {
  if (!token || token.length > 64) return { ok: false, reason: "not_found" };
  await connectDB();
  const invite = await Invite.findOne({ token, kind: "manager" }).lean<InviteRecord>();
  if (!invite) return { ok: false, reason: "not_found" };
  if (invite.revoked) return { ok: false, reason: "revoked" };
  if (invite.usedAt) return { ok: false, reason: "used" };
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  return { ok: true, invite };
}

/** Đánh dấu đã dùng (chỉ một người nhận được: lần nhận thứ hai thất bại) */
export async function useManagerInvite(inviteId: mongoose.Types.ObjectId, userId: string): Promise<boolean> {
  await connectDB();
  const res = await Invite.updateOne({ _id: inviteId, usedAt: null, revoked: false }, { $set: { usedAt: new Date(), usedBy: oid(userId) } });
  return res.modifiedCount === 1;
}

// ---------- Chuyển quyền chủ nhóm ----------

/**
 * Chuyển nhóm (và mọi nhóm con đang cùng chủ) cho chủ mới.
 * Chủ cũ ở lại làm người quản lý với mọi quyền (tự rời được); chủ mới không còn trong danh sách quản lý.
 */
export async function transferOwnership(groupId: string, fromUserId: string, toUserId: string) {
  await connectDB();
  const from = oid(fromUserId);
  const to = oid(toUserId);
  const gid = oid(groupId);
  const tree = { $or: [{ _id: gid }, { ancestors: gid }] };
  await Group.updateMany({ ...tree, ownerId: from }, { $set: { ownerId: to } });
  await Group.updateMany(tree, { $pull: { managers: { userId: to } } });
  await Group.updateOne(
    { _id: gid },
    { $push: { managers: { userId: from, permissions: [...GROUP_PERMISSIONS], addedBy: to, addedAt: new Date() } } },
  );
}
