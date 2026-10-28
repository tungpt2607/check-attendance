// /v1/members: một thành viên (chủ nhóm) · liên kết tài khoản: link mời riêng (A), link chung + duyệt (B)
// /v1/memberships: các nhóm tôi tham gia (góc nhìn thành viên đã liên kết)
import { Hono } from "hono";
import { requireUser, type AppEnv } from "../auth.js";
import { buildShareLink } from "../core/lib/share.js";
import { getMemberHistory } from "../core/modules/attendance/stats.service.js";
import { getGroupName, getOwnedGroup } from "../core/modules/groups/group.service.js";
import {
  approveRequest,
  cancelPendingRequest,
  checkInvite,
  createLinkRequest,
  createMemberInvite,
  findLinkedMember,
  getLinkRequest,
  getPendingRequestOfUser,
  linkMember,
  markInviteUsed,
  rejectRequest,
  unlinkMember,
} from "../core/modules/invites/invite.service.js";
import { deleteMember, getMember, listMembers, updateMember } from "../core/modules/members/member.service.js";
import { getMyHistory, getRosterForMember, listMembershipsOfUser } from "../core/modules/members/membership.service.js";
import { getAccountsByIds } from "../core/modules/users/user.service.js";
import { fail, idParam, notFound, readJson, requiredStr, str } from "../http.js";
import { ownedMemberOr404 } from "./owned.js";

const INVITE_ERRORS: Record<string, string> = {
  not_found: "Link không tồn tại.",
  revoked: "Link đã bị thu hồi.",
  used: "Link đã được dùng.",
  expired: "Link đã hết hạn.",
};

const LINK_ERRORS: Record<string, string> = {
  member_taken: "Tên này đã được liên kết với tài khoản khác.",
  user_in_group: "Tài khoản của bạn đã liên kết với một tên khác trong nhóm này.",
  already_pending: "Bạn đã có một yêu cầu đang chờ duyệt trong nhóm này.",
};

async function inviteOr410(token: string, kind: "member" | "group") {
  const check = await checkInvite(token, kind);
  if (!check.ok) return fail(410, `invite_${check.reason}`, INVITE_ERRORS[check.reason]);
  return check.invite;
}

/** Yêu cầu liên kết thuộc nhóm của người dùng hiện tại, còn đang chờ */
async function ownedPendingRequest(requestId: string, userId: string) {
  const req = await getLinkRequest(requestId);
  if (!req || req.status !== "pending" || !(await getOwnedGroup(String(req.groupId), userId))) {
    return notFound("yêu cầu đang chờ duyệt");
  }
  return req;
}

export const members = new Hono<AppEnv>()
  /** Một thành viên: thông tin, tài khoản liên kết, chuyên cần và lịch sử từng buổi */
  .get("/members/:id", async (c) => {
    const user = requireUser(c);
    const m = await ownedMemberOr404(idParam(c, "id", "thành viên"), user.userId);
    const [{ items, rate }, accounts] = await Promise.all([
      getMemberHistory(m.id, m.groupId),
      getAccountsByIds(m.linkedUserId ? [m.linkedUserId] : []),
    ]);
    return c.json({
      id: m.id,
      groupId: m.groupId,
      name: m.name,
      code: m.code,
      linkedAccount: m.linkedUserId ? (accounts.get(m.linkedUserId) ?? null) : null,
      stats: rate,
      history: items,
    });
  })

  /** Sửa: { "name": "...", "code": "" } — mã để trống là xóa mã */
  .patch("/members/:id", async (c) => {
    const user = requireUser(c);
    const m = await ownedMemberOr404(idParam(c, "id", "thành viên"), user.userId);
    const body = await readJson(c);
    const name = requiredStr(body, "name", "họ tên", 120);
    const code = body.code === undefined ? m.code : str(body, "code").slice(0, 50);
    await updateMember(m.id, { name, code });
    return c.json({ ...m, name, code });
  })

  /** Xóa thành viên cùng toàn bộ lịch sử điểm danh của người đó */
  .delete("/members/:id", async (c) => {
    const user = requireUser(c);
    const m = await ownedMemberOr404(idParam(c, "id", "thành viên"), user.userId);
    await deleteMember(m.id);
    return c.body(null, 204);
  })

  // ---------- A. Link mời riêng ----------

  /** Tạo link mời riêng (dùng 1 lần, hết hạn 7 ngày; tạo mới thì link cũ mất hiệu lực) */
  .post("/members/:id/invite", async (c) => {
    const user = requireUser(c);
    const m = await ownedMemberOr404(idParam(c, "id", "thành viên"), user.userId);
    if (m.linkedUserId) fail(409, "already_linked", "Thành viên này đã liên kết tài khoản.");
    const { token, expiresAt } = await createMemberInvite(m.groupId, m.id, user.userId);
    return c.json({ link: await buildShareLink(`/invite/${token}`, expiresAt) }, 201);
  })

  /** Hủy liên kết tài khoản (lịch sử điểm danh giữ nguyên) */
  .delete("/members/:id/link", async (c) => {
    const user = requireUser(c);
    const m = await ownedMemberOr404(idParam(c, "id", "thành viên"), user.userId);
    await unlinkMember(m.id);
    return c.body(null, 204);
  })

  /** Người được mời xem lời mời */
  .get("/invites/:token", async (c) => {
    const user = requireUser(c);
    const invite = await inviteOr410(c.req.param("token"), "member");
    const m = invite.memberId ? await getMember(String(invite.memberId)) : null;
    if (!m) return fail(410, "invite_not_found", INVITE_ERRORS.not_found);
    const mine = await findLinkedMember(m.groupId, user.userId);
    return c.json({
      memberName: m.name,
      groupName: (await getGroupName(m.groupId)) ?? "",
      expiresAt: invite.expiresAt,
      memberAlreadyLinked: !!m.linkedUserId,
      /** Tài khoản này đã liên kết một tên khác trong nhóm */
      myMemberId: mine ? String(mine._id) : null,
    });
  })

  /** Người được mời xác nhận "Đúng, đây là tôi" */
  .post("/invites/:token/accept", async (c) => {
    const user = requireUser(c);
    const invite = await inviteOr410(c.req.param("token"), "member");
    if (!invite.memberId) return fail(410, "invite_not_found", INVITE_ERRORS.not_found);
    const result = await linkMember(String(invite.memberId), user.userId);
    if (result !== "ok") fail(409, result, LINK_ERRORS[result]);
    await markInviteUsed(invite._id, user.userId);
    return c.json({ memberId: String(invite.memberId) });
  })

  // ---------- B. Link chung + duyệt ----------

  /** Người mở link chung: danh sách tên chưa liên kết để chọn, và yêu cầu đang chờ của tôi */
  .get("/join/:token", async (c) => {
    const user = requireUser(c);
    const invite = await inviteOr410(c.req.param("token"), "group");
    const groupId = String(invite.groupId);
    const [groupName, mine, pending, list] = await Promise.all([
      getGroupName(groupId),
      findLinkedMember(groupId, user.userId),
      getPendingRequestOfUser(groupId, user.userId),
      listMembers(groupId),
    ]);
    const pendingName = pending ? (list.find((m) => m.id === String(pending.memberId))?.name ?? null) : null;
    return c.json({
      groupName: groupName ?? "",
      myMemberId: mine ? String(mine._id) : null,
      pendingRequest: pending ? { memberId: String(pending.memberId), memberName: pendingName } : null,
      members: list.filter((m) => !m.linkedUserId).map((m) => ({ id: m.id, name: m.name, code: m.code })),
    });
  })

  /** Xin nhận một tên: { "memberId": "..." } → chờ chủ nhóm duyệt */
  .post("/join/:token/request", async (c) => {
    const user = requireUser(c);
    const invite = await inviteOr410(c.req.param("token"), "group");
    const memberId = str(await readJson(c), "memberId");
    const result = await createLinkRequest(String(invite.groupId), memberId, user.userId);
    if (result !== "ok") fail(409, result, LINK_ERRORS[result]);
    return c.json({ status: "pending" }, 201);
  })

  .delete("/join/:token/request", async (c) => {
    const user = requireUser(c);
    const invite = await inviteOr410(c.req.param("token"), "group");
    await cancelPendingRequest(String(invite.groupId), user.userId);
    return c.body(null, 204);
  })

  /** Chủ nhóm duyệt: gắn tài khoản, tự từ chối yêu cầu khác tranh cùng tên hoặc của cùng người */
  .post("/requests/:id/approve", async (c) => {
    const user = requireUser(c);
    const req = await ownedPendingRequest(idParam(c, "id", "yêu cầu"), user.userId);
    const result = await approveRequest(req);
    if (result !== "ok") fail(409, result, LINK_ERRORS[result]);
    return c.json({ status: "approved" });
  })

  .post("/requests/:id/reject", async (c) => {
    const user = requireUser(c);
    const req = await ownedPendingRequest(idParam(c, "id", "yêu cầu"), user.userId);
    await rejectRequest(String(req._id));
    return c.json({ status: "rejected" });
  })

  // ---------- Nhóm tôi tham gia ----------

  .get("/memberships", async (c) => {
    const user = requireUser(c);
    return c.json({ memberships: await listMembershipsOfUser(user.userId) });
  })

  /** Chuyên cần, lịch sử của tôi và danh sách thành viên nhóm (chỉ đọc, không có email người khác) */
  .get("/memberships/:memberId", async (c) => {
    const user = requireUser(c);
    const memberId = idParam(c, "memberId", "nhóm tham gia");
    const [history, roster] = await Promise.all([getMyHistory(memberId, user.userId), getRosterForMember(memberId, user.userId)]);
    if (!history || !roster) return notFound("nhóm tham gia");
    return c.json({ ...history, roster });
  });
