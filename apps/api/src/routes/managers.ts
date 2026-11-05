// /v1/groups/:id/managers: người quản lý nhóm (chủ nhóm thêm theo email hoặc link mời, chọn quyền cho từng người)
// /v1/groups/:id/transfer: chuyển quyền chủ nhóm · /v1/manager-invites/:token: nhận lời mời làm quản lý
import { createRoute } from "@hono/zod-openapi";
import {
  AddManagerInput,
  GroupManagersSchema,
  ManagerAcceptedSchema,
  ManagerInviteInfoSchema,
  ManagerInviteInput,
  NewLinkSchema,
  TransferOwnerInput,
  UpdateManagerInput,
} from "@check-attendance/shared/api";
import { requireUser } from "../auth.js";
import { buildShareLink } from "../core/lib/share.js";
import { getGroupWithAccess } from "../core/modules/groups/access.service.js";
import { getGroupName } from "../core/modules/groups/group.service.js";
import {
  checkManagerInvite,
  createManagerInvite,
  listGroupManagers,
  removeManager,
  transferOwnership,
  updateManagerPermissions,
  upsertManager,
  useManagerInvite,
} from "../core/modules/groups/manager.service.js";
import { notify } from "../core/modules/notifications/notification.service.js";
import { findUserByEmail, getAccountsByIds } from "../core/modules/users/user.service.js";
import { AUTH, createApp, fail, GroupUserParam, IdParam, iso, jsonBody, NO_CONTENT, notFound, ok, OPTIONAL_AUTH, TokenParam } from "../http.js";
import { groupOr404 } from "./owned.js";

const TAG = ["Người quản lý nhóm"];

const INVITE_ERRORS: Record<string, string> = {
  not_found: "Link mời không tồn tại.",
  revoked: "Link mời đã bị thu hồi.",
  used: "Link mời đã được dùng.",
  expired: "Link mời đã hết hạn. Hãy xin chủ nhóm link mới.",
};

/** Tài khoản theo email; chưa có thì báo dùng link mời */
async function accountByEmail(email: string) {
  const u = await findUserByEmail(email);
  if (!u) return fail(404, "account_not_found", "Chưa có tài khoản dùng email này. Hãy gửi link mời để người đó tự đăng ký rồi nhận lời.");
  if (u.disabledAt) return fail(409, "account_disabled", "Tài khoản này đang bị khoá.");
  return { id: String(u._id), name: u.name };
}

export const managers = createApp()
  .openapi(
    createRoute({
      method: "get",
      path: "/groups/{id}/managers",
      tags: TAG,
      summary: "Chủ nhóm và người quản lý (kể cả người được thêm ở nhóm cha)",
      security: AUTH,
      request: { params: IdParam },
      responses: { 200: ok(GroupManagersSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const group = await groupOr404(c.req.valid("param").id, user.userId);
      const list = (await listGroupManagers(group.id))!;
      const accounts = await getAccountsByIds([list.ownerId, ...list.managers.map((m) => m.userId)]);
      return c.json(
        {
          owner: accounts.get(list.ownerId) ?? null,
          managers: list.managers.flatMap((m) => {
            const account = accounts.get(m.userId);
            return account ? [{ account, permissions: m.permissions, addedAt: iso(m.addedAt), fromGroup: m.fromGroup }] : [];
          }),
          access: group.access,
        },
        200,
      );
    },
  )

  .openapi(
    createRoute({
      method: "post",
      path: "/groups/{id}/managers",
      tags: TAG,
      summary: "Thêm người quản lý theo email tài khoản đã có (đã là quản lý thì cập nhật quyền)",
      security: AUTH,
      request: { params: IdParam, ...jsonBody(AddManagerInput) },
      responses: { 204: NO_CONTENT },
    }),
    async (c) => {
      const user = requireUser(c);
      const group = await groupOr404(c.req.valid("param").id, user.userId, "owner");
      const { email, permissions } = c.req.valid("json");
      const target = await accountByEmail(email);
      if (target.id === user.userId) fail(422, "validation", "Bạn đang là chủ nhóm.");
      const result = await upsertManager(group.id, target.id, permissions, user.userId);
      if (result === "owner") fail(409, "is_owner", "Người này đang là chủ nhóm.");
      if (result === "added") {
        await notify({ type: "group_manager.added", recipients: [target.id], actorId: user.userId, groupId: group.id, data: { groupName: group.name } });
      }
      return c.body(null, 204);
    },
  )

  .openapi(
    createRoute({
      method: "patch",
      path: "/groups/{id}/managers/{userId}",
      tags: TAG,
      summary: "Sửa quyền của người quản lý",
      security: AUTH,
      request: { params: GroupUserParam, ...jsonBody(UpdateManagerInput) },
      responses: { 204: NO_CONTENT },
    }),
    async (c) => {
      const user = requireUser(c);
      const { id, userId } = c.req.valid("param");
      const group = await groupOr404(id, user.userId, "owner");
      if (!(await updateManagerPermissions(group.id, userId, c.req.valid("json").permissions))) {
        notFound("người quản lý ở nhóm này (người được thêm ở nhóm cha thì sửa ở nhóm cha)");
      }
      return c.body(null, 204);
    },
  )

  .openapi(
    createRoute({
      method: "delete",
      path: "/groups/{id}/managers/{userId}",
      tags: TAG,
      summary: "Gỡ người quản lý (chủ nhóm gỡ người khác, hoặc người quản lý tự rời)",
      security: AUTH,
      request: { params: GroupUserParam },
      responses: { 204: NO_CONTENT },
    }),
    async (c) => {
      const user = requireUser(c);
      const { id, userId } = c.req.valid("param");
      const group = await groupOr404(id, user.userId, userId === user.userId ? undefined : "owner");
      if (!(await removeManager(group.id, userId))) notFound("người quản lý ở nhóm này");
      return c.body(null, 204);
    },
  )

  .openapi(
    createRoute({
      method: "post",
      path: "/groups/{id}/manager-invite",
      tags: TAG,
      summary: "Tạo link mời làm người quản lý (dùng 1 lần, hết hạn 7 ngày) với các quyền đã chọn",
      security: AUTH,
      request: { params: IdParam, ...jsonBody(ManagerInviteInput) },
      responses: { 201: ok(NewLinkSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const group = await groupOr404(c.req.valid("param").id, user.userId, "owner");
      const { token, expiresAt } = await createManagerInvite(group.id, c.req.valid("json").permissions, user.userId);
      return c.json({ link: await buildShareLink(`/manage/${token}`, expiresAt) }, 201);
    },
  )

  .openapi(
    createRoute({
      method: "get",
      path: "/manager-invites/{token}",
      tags: TAG,
      summary: "Thông tin lời mời làm quản lý (410 nếu đã dùng, hết hạn, thu hồi)",
      security: OPTIONAL_AUTH,
      request: { params: TokenParam },
      responses: { 200: ok(ManagerInviteInfoSchema) },
    }),
    async (c) => {
      const check = await checkManagerInvite(c.req.valid("param").token);
      if (!check.ok) return fail(410, `invite_${check.reason}`, INVITE_ERRORS[check.reason]);
      const inv = check.invite;
      const [groupName, accounts] = await Promise.all([getGroupName(String(inv.groupId)), getAccountsByIds([String(inv.createdBy)])]);
      return c.json(
        {
          groupId: String(inv.groupId),
          groupName: groupName ?? "",
          invitedBy: accounts.get(String(inv.createdBy))?.name ?? "",
          permissions: inv.permissions ?? [],
          expiresAt: iso(inv.expiresAt),
        },
        200,
      );
    },
  )

  .openapi(
    createRoute({
      method: "post",
      path: "/manager-invites/{token}/accept",
      tags: TAG,
      summary: "Nhận lời mời: trở thành người quản lý nhóm",
      security: AUTH,
      request: { params: TokenParam },
      responses: { 200: ok(ManagerAcceptedSchema) },
    }),
    async (c) => {
      const user = requireUser(c);
      const check = await checkManagerInvite(c.req.valid("param").token);
      if (!check.ok) return fail(410, `invite_${check.reason}`, INVITE_ERRORS[check.reason]);
      const inv = check.invite;
      const groupId = String(inv.groupId);
      const current = await getGroupWithAccess(groupId, user.userId);
      if (current?.access.role === "owner") fail(409, "is_owner", "Bạn đang là chủ nhóm này.");
      if (!(await useManagerInvite(inv._id, user.userId))) fail(410, "invite_used", INVITE_ERRORS.used);
      await upsertManager(groupId, user.userId, inv.permissions ?? [], String(inv.createdBy));
      const groupName = (await getGroupName(groupId)) ?? "";
      await notify({ type: "group_manager.joined", recipients: [String(inv.createdBy)], actorId: user.userId, groupId, data: { groupName } });
      return c.json({ groupId }, 200);
    },
  )

  .openapi(
    createRoute({
      method: "post",
      path: "/groups/{id}/transfer",
      tags: TAG,
      summary: "Chuyển quyền chủ nhóm cho tài khoản khác (cả các nhóm con cùng chủ); chủ cũ ở lại làm quản lý với mọi quyền",
      security: AUTH,
      request: { params: IdParam, ...jsonBody(TransferOwnerInput) },
      responses: { 204: NO_CONTENT },
    }),
    async (c) => {
      const user = requireUser(c);
      const group = await groupOr404(c.req.valid("param").id, user.userId, "owner");
      const list = (await listGroupManagers(group.id))!;
      if (list.ownerId !== user.userId) fail(403, "owner_only", "Chỉ chủ trực tiếp của nhóm này mới chuyển được (nhóm con thuộc chủ khác).");
      const target = await accountByEmail(c.req.valid("json").email);
      if (target.id === user.userId) fail(422, "validation", "Bạn đang là chủ nhóm.");
      await transferOwnership(group.id, user.userId, target.id);
      await notify({ type: "group.ownership_transferred", recipients: [target.id], actorId: user.userId, groupId: group.id, data: { groupName: group.name } });
      return c.body(null, 204);
    },
  );
