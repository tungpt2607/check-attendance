// /v1/members: một thành viên (chủ nhóm) · liên kết tài khoản: link mời riêng (A), link chung + duyệt (B)
// /v1/memberships: các nhóm tôi tham gia (góc nhìn thành viên đã liên kết)
import { createRoute } from "@hono/zod-openapi";
import {
  AcceptedSchema,
  InviteInfoSchema,
  JoinInfoSchema,
  JoinRequestInput,
  MemberDetailSchema,
  MembershipListSchema,
  MemberSchema,
  MyMembershipSchema,
  NewLinkSchema,
  RequestStatusSchema,
  UpdateMemberInput,
} from "@check-attendance/shared/api";
import { requireUser } from "../auth.js";
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
import { AUTH, createApp, fail, IdParam, iso, jsonBody, MemberIdParam, NO_CONTENT, notFound, ok, TokenParam } from "../http.js";
import { ownedMemberOr404 } from "./owned.js";

const MEMBER_TAG = ["Thành viên"];
const LINK_TAG = ["Liên kết tài khoản"];
const GROUP_TAG = ["Nhóm"];

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

/** Lời mời còn hiệu lực; không thì 410 với mã invite_<lý do> */
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

export const members = createApp()
  .openapi(
    createRoute({
      method: "get",
      path: "/members/{id}",
      tags: MEMBER_TAG,
      summary: "Một thành viên: chuyên cần và lịch sử từng buổi",
      security: AUTH,
      request: { params: IdParam },
      responses: { 200: ok(MemberDetailSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const m = await ownedMemberOr404(c.req.valid("param").id, user.userId);
      const [{ items, rate }, accounts, groupName] = await Promise.all([
        getMemberHistory(m.id, m.groupId),
        getAccountsByIds(m.linkedUserId ? [m.linkedUserId] : []),
        getGroupName(m.groupId),
      ]);
      return c.json(
        {
          id: m.id,
          groupId: m.groupId,
          groupName: groupName ?? "",
          name: m.name,
          code: m.code,
          linkedAccount: m.linkedUserId ? (accounts.get(m.linkedUserId) ?? null) : null,
          stats: rate,
          history: items.map((it) => ({ ...it, date: iso(it.date), checkedInAt: iso(it.checkedInAt) })),
        },
        200,
      );
    },
  )

  .openapi(
    createRoute({
      method: "patch",
      path: "/members/{id}",
      tags: MEMBER_TAG,
      summary: "Sửa họ tên, mã số (mã rỗng = xóa mã)",
      security: AUTH,
      request: { params: IdParam, ...jsonBody(UpdateMemberInput) },
      responses: { 200: ok(MemberSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const m = await ownedMemberOr404(c.req.valid("param").id, user.userId);
      const body = c.req.valid("json");
      const code = body.code ?? m.code;
      await updateMember(m.id, { name: body.name, code });
      return c.json({ ...m, name: body.name, code }, 200);
    },
  )

  .openapi(
    createRoute({
      method: "delete",
      path: "/members/{id}",
      tags: MEMBER_TAG,
      summary: "Xóa thành viên cùng lịch sử điểm danh",
      security: AUTH,
      request: { params: IdParam },
      responses: { 204: NO_CONTENT },
    }),
    async (c) => {
      const user = requireUser(c);
      const m = await ownedMemberOr404(c.req.valid("param").id, user.userId);
      await deleteMember(m.id);
      return c.body(null, 204);
    },
  )

  // ---------- A. Link mời riêng ----------

  .openapi(
    createRoute({
      method: "post",
      path: "/members/{id}/invite",
      tags: MEMBER_TAG,
      summary: "Tạo link mời riêng (dùng 1 lần, hết hạn 7 ngày; link cũ mất hiệu lực)",
      security: AUTH,
      request: { params: IdParam },
      responses: { 201: ok(NewLinkSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const m = await ownedMemberOr404(c.req.valid("param").id, user.userId);
      if (m.linkedUserId) fail(409, "already_linked", "Thành viên này đã liên kết tài khoản.");
      const { token, expiresAt } = await createMemberInvite(m.groupId, m.id, user.userId);
      return c.json({ link: await buildShareLink(`/invite/${token}`, expiresAt) }, 201);
    },
  )

  .openapi(
    createRoute({
      method: "delete",
      path: "/members/{id}/link",
      tags: MEMBER_TAG,
      summary: "Hủy liên kết tài khoản (lịch sử điểm danh giữ nguyên)",
      security: AUTH,
      request: { params: IdParam },
      responses: { 204: NO_CONTENT },
    }),
    async (c) => {
      const user = requireUser(c);
      const m = await ownedMemberOr404(c.req.valid("param").id, user.userId);
      await unlinkMember(m.id);
      return c.body(null, 204);
    },
  )

  .openapi(
    createRoute({
      method: "get",
      path: "/invites/{token}",
      tags: LINK_TAG,
      summary: "Người được mời xem link mời riêng (410 nếu link hết hiệu lực)",
      security: AUTH,
      request: { params: TokenParam },
      responses: { 200: ok(InviteInfoSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const invite = await inviteOr410(c.req.valid("param").token, "member");
      const m = invite.memberId ? await getMember(String(invite.memberId)) : null;
      if (!m) return fail(410, "invite_not_found", INVITE_ERRORS.not_found);
      const [mine, groupName] = await Promise.all([findLinkedMember(m.groupId, user.userId), getGroupName(m.groupId)]);
      return c.json(
        {
          memberId: m.id,
          memberName: m.name,
          memberCode: m.code,
          groupName: groupName ?? "",
          expiresAt: iso(invite.expiresAt),
          memberAlreadyLinked: !!m.linkedUserId,
          myMemberId: mine ? String(mine._id) : null,
          myMemberName: mine ? mine.name : null,
        },
        200,
      );
    },
  )

  .openapi(
    createRoute({
      method: "post",
      path: "/invites/{token}/accept",
      tags: LINK_TAG,
      summary: "Xác nhận đúng là tôi (liên kết ngay)",
      security: AUTH,
      request: { params: TokenParam },
      responses: { 200: ok(AcceptedSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const invite = await inviteOr410(c.req.valid("param").token, "member");
      if (!invite.memberId) return fail(410, "invite_not_found", INVITE_ERRORS.not_found);
      const result = await linkMember(String(invite.memberId), user.userId);
      if (result !== "ok") fail(409, result, LINK_ERRORS[result]);
      await markInviteUsed(invite._id, user.userId);
      return c.json({ memberId: String(invite.memberId) }, 200);
    },
  )

  // ---------- B. Link chung + duyệt ----------

  .openapi(
    createRoute({
      method: "get",
      path: "/join/{token}",
      tags: LINK_TAG,
      summary: "Mở link chung: tên chưa liên kết, yêu cầu đang chờ của tôi",
      security: AUTH,
      request: { params: TokenParam },
      responses: { 200: ok(JoinInfoSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const invite = await inviteOr410(c.req.valid("param").token, "group");
      const groupId = String(invite.groupId);
      const [groupName, mine, pending, list] = await Promise.all([
        getGroupName(groupId),
        findLinkedMember(groupId, user.userId),
        getPendingRequestOfUser(groupId, user.userId),
        listMembers(groupId),
      ]);
      const pendingName = pending ? (list.find((m) => m.id === String(pending.memberId))?.name ?? null) : null;
      return c.json(
        {
          groupName: groupName ?? "",
          myMemberId: mine ? String(mine._id) : null,
          myMemberName: mine ? mine.name : null,
          pendingRequest: pending ? { memberId: String(pending.memberId), memberName: pendingName } : null,
          members: list.filter((m) => !m.linkedUserId).map((m) => ({ id: m.id, name: m.name, code: m.code })),
        },
        200,
      );
    },
  )

  .openapi(
    createRoute({
      method: "post",
      path: "/join/{token}/request",
      tags: LINK_TAG,
      summary: "Xin nhận một tên (chờ chủ nhóm duyệt)",
      security: AUTH,
      request: { params: TokenParam, ...jsonBody(JoinRequestInput) },
      responses: { 201: ok(RequestStatusSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const invite = await inviteOr410(c.req.valid("param").token, "group");
      const result = await createLinkRequest(String(invite.groupId), c.req.valid("json").memberId, user.userId);
      if (result !== "ok") fail(409, result, LINK_ERRORS[result]);
      return c.json({ status: "pending" as const }, 201);
    },
  )

  .openapi(
    createRoute({
      method: "delete",
      path: "/join/{token}/request",
      tags: LINK_TAG,
      summary: "Hủy yêu cầu đang chờ",
      security: AUTH,
      request: { params: TokenParam },
      responses: { 204: NO_CONTENT },
    }),
    async (c) => {
      const user = requireUser(c);
      const invite = await inviteOr410(c.req.valid("param").token, "group");
      await cancelPendingRequest(String(invite.groupId), user.userId);
      return c.body(null, 204);
    },
  )

  .openapi(
    createRoute({
      method: "post",
      path: "/requests/{id}/approve",
      tags: GROUP_TAG,
      summary: "Duyệt yêu cầu liên kết (tự từ chối yêu cầu khác tranh cùng tên hoặc của cùng người)",
      security: AUTH,
      request: { params: IdParam },
      responses: { 200: ok(RequestStatusSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const req = await ownedPendingRequest(c.req.valid("param").id, user.userId);
      const result = await approveRequest(req);
      if (result !== "ok") fail(409, result, LINK_ERRORS[result]);
      return c.json({ status: "approved" as const }, 200);
    },
  )

  .openapi(
    createRoute({
      method: "post",
      path: "/requests/{id}/reject",
      tags: GROUP_TAG,
      summary: "Từ chối yêu cầu liên kết",
      security: AUTH,
      request: { params: IdParam },
      responses: { 200: ok(RequestStatusSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const req = await ownedPendingRequest(c.req.valid("param").id, user.userId);
      await rejectRequest(String(req._id));
      return c.json({ status: "rejected" as const }, 200);
    },
  )

  // ---------- Nhóm tôi tham gia ----------

  .openapi(
    createRoute({
      method: "get",
      path: "/memberships",
      tags: LINK_TAG,
      summary: "Các nhóm tôi tham gia",
      security: AUTH,
      responses: { 200: ok(MembershipListSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      return c.json({ memberships: await listMembershipsOfUser(user.userId) }, 200);
    },
  )

  .openapi(
    createRoute({
      method: "get",
      path: "/memberships/{memberId}",
      tags: LINK_TAG,
      summary: "Chuyên cần, lịch sử của tôi và danh sách thành viên nhóm (không có email người khác)",
      security: AUTH,
      request: { params: MemberIdParam },
      responses: { 200: ok(MyMembershipSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const { memberId } = c.req.valid("param");
      const [history, roster] = await Promise.all([getMyHistory(memberId, user.userId), getRosterForMember(memberId, user.userId)]);
      if (!history || !roster) return notFound("nhóm tham gia");
      return c.json({ ...history, items: history.items.map((it) => ({ ...it, date: iso(it.date) })), roster }, 200);
    },
  );
