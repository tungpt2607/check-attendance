import { randomBytes } from "node:crypto";
import { Types } from "mongoose";
import { connectDB, isValidId } from "@/lib/db";
import { Member, type MemberRecord } from "@/modules/members/member.model";
import { Invite, LinkRequest, type InviteRecord, type LinkRequestRecord } from "./invite.model";

/** Link riêng hết hạn sau 7 ngày */
const MEMBER_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function newToken(): string {
  return randomBytes(12).toString("base64url");
}

// ---------- Liên kết thành viên ----------

export type LinkResult = "ok" | "member_taken" | "user_in_group";

/**
 * Gắn tài khoản vào thành viên. Chỉ gắn khi thành viên chưa liên kết
 * và tài khoản chưa gắn với ai khác trong cùng nhóm.
 */
export async function linkMember(memberId: string, userId: string): Promise<LinkResult> {
  await connectDB();
  const member = await Member.findById(memberId).lean<MemberRecord>();
  if (!member || member.userId) return "member_taken";
  const existing = await Member.exists({ groupId: member.groupId, userId });
  if (existing) return "user_in_group";
  try {
    const res = await Member.updateOne({ _id: memberId, userId: null }, { $set: { userId: new Types.ObjectId(userId) } });
    return res.modifiedCount === 1 ? "ok" : "member_taken";
  } catch (err) {
    // Trùng chỉ mục (nhóm, tài khoản): tài khoản vừa được gắn ở nơi khác
    if ((err as { code?: number })?.code === 11000) return "user_in_group";
    throw err;
  }
}

export async function unlinkMember(memberId: string) {
  await connectDB();
  await Member.updateOne({ _id: memberId }, { $set: { userId: null } });
  // Link riêng còn hiệu lực của người này không còn ý nghĩa
  await Invite.updateMany({ memberId, kind: "member", usedAt: null }, { $set: { revoked: true } });
}

/** Thành viên mà tài khoản đang gắn trong một nhóm (nếu có) */
export async function findLinkedMember(groupId: string, userId: string) {
  if (!isValidId(groupId) || !isValidId(userId)) return null;
  await connectDB();
  return Member.findOne({ groupId, userId }).lean<MemberRecord>();
}

// ---------- A. Link mời riêng ----------

/** Tạo link riêng mới cho thành viên (thu hồi link riêng cũ) */
export async function createMemberInvite(groupId: string, memberId: string, createdBy: string): Promise<{ token: string; expiresAt: Date }> {
  await connectDB();
  await Invite.updateMany({ memberId, kind: "member", usedAt: null, revoked: false }, { $set: { revoked: true } });
  const token = newToken();
  const expiresAt = new Date(Date.now() + MEMBER_INVITE_TTL_MS);
  await Invite.create({
    token,
    kind: "member",
    groupId: new Types.ObjectId(groupId),
    memberId: new Types.ObjectId(memberId),
    createdBy: new Types.ObjectId(createdBy),
    expiresAt,
  });
  return { token, expiresAt };
}

export type InviteCheck =
  | { ok: true; invite: InviteRecord }
  | { ok: false; reason: "not_found" | "revoked" | "used" | "expired" };

/** Tìm lời mời còn hiệu lực theo mã */
export async function checkInvite(token: string, kind: InviteRecord["kind"]): Promise<InviteCheck> {
  if (!token || token.length > 64) return { ok: false, reason: "not_found" };
  await connectDB();
  const invite = await Invite.findOne({ token, kind }).lean<InviteRecord>();
  if (!invite) return { ok: false, reason: "not_found" };
  if (invite.revoked) return { ok: false, reason: "revoked" };
  if (invite.usedAt) return { ok: false, reason: "used" };
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  return { ok: true, invite };
}

export async function markInviteUsed(inviteId: Types.ObjectId, userId: string) {
  await connectDB();
  await Invite.updateOne({ _id: inviteId }, { $set: { usedAt: new Date(), usedBy: new Types.ObjectId(userId) } });
}

// ---------- B. Link chung + duyệt ----------

/** Link chung đang bật của nhóm (nếu có) */
export async function getActiveGroupInvite(groupId: string): Promise<InviteRecord | null> {
  await connectDB();
  return Invite.findOne({ groupId, kind: "group", revoked: false }).sort({ createdAt: -1 }).lean<InviteRecord>();
}

/** Trong các nhóm cho trước, nhóm nào đang bật link tham gia */
export async function getGroupsWithActiveInvite(groupIds: string[]): Promise<Set<string>> {
  const ids = groupIds.filter(isValidId).map((id) => new Types.ObjectId(id));
  if (ids.length === 0) return new Set();
  await connectDB();
  const found = await Invite.distinct("groupId", { groupId: { $in: ids }, kind: "group", revoked: false });
  return new Set(found.map(String));
}

/** Bật link chung (hoặc tạo link mới thay link cũ) */
export async function createGroupInvite(groupId: string, createdBy: string): Promise<string> {
  await connectDB();
  await Invite.updateMany({ groupId, kind: "group", revoked: false }, { $set: { revoked: true } });
  const token = newToken();
  await Invite.create({
    token,
    kind: "group",
    groupId: new Types.ObjectId(groupId),
    memberId: null,
    createdBy: new Types.ObjectId(createdBy),
    expiresAt: null,
  });
  return token;
}

export async function disableGroupInvite(groupId: string) {
  await connectDB();
  await Invite.updateMany({ groupId, kind: "group", revoked: false }, { $set: { revoked: true } });
}

export type RequestResult = "ok" | "member_taken" | "user_in_group" | "already_pending";

/** Người dùng xin nhận một tên trong nhóm */
export async function createLinkRequest(groupId: string, memberId: string, userId: string): Promise<RequestResult> {
  await connectDB();
  const member = await Member.findOne({ _id: memberId, groupId }).lean<MemberRecord>();
  if (!member || member.userId) return "member_taken";
  if (await Member.exists({ groupId, userId })) return "user_in_group";
  if (await LinkRequest.exists({ groupId, userId, status: "pending" })) return "already_pending";
  await LinkRequest.create({
    groupId: new Types.ObjectId(groupId),
    memberId: new Types.ObjectId(memberId),
    userId: new Types.ObjectId(userId),
    status: "pending",
  });
  return "ok";
}

export async function getPendingRequestOfUser(groupId: string, userId: string) {
  await connectDB();
  return LinkRequest.findOne({ groupId, userId, status: "pending" }).lean<LinkRequestRecord>();
}

export async function cancelPendingRequest(groupId: string, userId: string) {
  await connectDB();
  await LinkRequest.deleteMany({ groupId, userId, status: "pending" });
}

export async function listPendingRequests(groupId: string) {
  await connectDB();
  return LinkRequest.find({ groupId, status: "pending" }).sort({ createdAt: 1 }).lean<LinkRequestRecord[]>();
}

export async function getLinkRequest(requestId: string) {
  if (!isValidId(requestId)) return null;
  await connectDB();
  return LinkRequest.findById(requestId).lean<LinkRequestRecord>();
}

/** Duyệt: gắn tài khoản, đồng thời từ chối các yêu cầu khác tranh cùng tên hoặc của cùng người */
export async function approveRequest(req: LinkRequestRecord): Promise<LinkResult> {
  const result = await linkMember(String(req.memberId), String(req.userId));
  await connectDB();
  const now = new Date();
  if (result === "ok") {
    await LinkRequest.updateOne({ _id: req._id }, { $set: { status: "approved", decidedAt: now } });
    await LinkRequest.updateMany(
      {
        groupId: req.groupId,
        status: "pending",
        _id: { $ne: req._id },
        $or: [{ memberId: req.memberId }, { userId: req.userId }],
      },
      { $set: { status: "rejected", decidedAt: now } },
    );
  } else {
    await LinkRequest.updateOne({ _id: req._id }, { $set: { status: "rejected", decidedAt: now } });
  }
  return result;
}

export async function rejectRequest(requestId: string) {
  await connectDB();
  await LinkRequest.updateOne({ _id: requestId, status: "pending" }, { $set: { status: "rejected", decidedAt: new Date() } });
}
